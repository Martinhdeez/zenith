# SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
# SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
# SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
#
# SPDX-License-Identifier: GPL-3.0-or-later

import logging
from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.features.file.model import File
from app.features.openai.client import get_llm
from app.features.openai.utils import fetch_file_text

logger = logging.getLogger(__name__)

STUDY_SUMMARY_PROMPT = """Eres Zenith AI, un tutor experto y generador de guías de estudio.
Tu objetivo es analizar todo el contenido recopilado de una carpeta (y sus subcarpetas) y generar una **Guía de Estudio Exhaustiva y Estructurada**.

El usuario ha solicitado un resumen de toda esta carpeta para estudiar, por lo que debes:
1. Crear una introducción clara sobre el tema general.
2. Organizar la información de manera lógica (por temas, conceptos clave, cronología, etc.).
3. Ser lo más exhaustivo y completo posible con los detalles críticos, fórmulas, definiciones o explicaciones importantes.
4. Usar formato Markdown enriquecido (encabezados H1/H2/H3, listas, negritas, tablas si aplica) para que sea muy fácil de repasar.
5. NO inventar información; básate estrictamente en el contenido provisto. Si hay temas desconectados, agrúpalos bajo secciones "Misceláneas" o por nombre de archivo.
6. Debes responder siempre en el idioma principal del contenido proporcionado (probablemente Español o Inglés).

A continuación se muestra todo el texto extraído de los archivos de la carpeta '{folder_name}':

── CONTENIDO RECOPILADO ──
{all_content}
──────────────────────────

Reúne toda esta información y genera la Guía de Estudio Completa en formato Markdown.
"""


async def get_all_files_in_folder_recursive(folder: File, user_id: int, db: AsyncSession) -> List[File]:
    """Retrieve all files and folders that are descendants of the given folder."""
    # A folder's own path is e.g. "/Math" and name is "Calculus"
    # its contents will have paths like "/Math/Calculus" or "/Math/Calculus/Derivatives"
    base_search_path = f"{folder.path.rstrip('/')}/{folder.name}"

    stmt = (
        select(File)
        .where(File.user_id == user_id)
        .where(
            or_(
                File.path == base_search_path,
                File.path.like(f"{base_search_path}/%")
            )
        )
        .order_by(File.path.asc(), File.name.asc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def generate_deep_study_summary(folder_id: int, user_id: int, db: AsyncSession) -> Optional[str]:
    """
    Harvests text from all readable files within a folder and its subfolders,
    then generates a comprehensive study guide using GPT-4o.
    Returns the raw markdown string. Raises ValueError if folder not found or empty.
    """
    # 1. Get the target folder
    folder = await db.get(File, folder_id)
    if not folder or folder.file_type != "dir" or folder.user_id != user_id:
        raise ValueError("Carpeta no encontrada o sin permisos.")

    # 2. Get all contents recursively
    contents = await get_all_files_in_folder_recursive(folder, user_id, db)
    
    # Filter out directories to only process actual files
    files_only = [f for f in contents if f.file_type != "dir"]

    if not files_only:
        raise ValueError("La carpeta y sus subcarpetas están vacías. No hay texto para resumir.")

    logger.info("Gathering text for study summary from %d files in folder %s", len(files_only), folder.name)

    # 3. Extract text from each file — skip any that can't be read
    compiled_text = ""
    files_processed = 0
    for file in files_only:
        try:
            text = await fetch_file_text(file)
            if text and text.strip():
                # Add clear delimiters so the AI knows where a document starts and ends
                compiled_text += f"\n\n--- ARCHIVO: {file.name} (Ruta: {file.path}) ---\n"
                compiled_text += text.strip()
                files_processed += 1
            else:
                logger.info("File %s returned no text, skipping.", file.name)
        except Exception as e:
            logger.warning("Error reading file %s for study summary, skipping: %s", file.name, e)
            continue

    logger.info("Successfully extracted text from %d/%d files in folder %s", files_processed, len(files_only), folder.name)

    if not compiled_text.strip():
        raise ValueError("No se pudo extraer texto legible de los archivos de esta carpeta.")

    # Prevent extremely massive prompts that might bust the 128k context or output limit.
    # ~300,000 chars is roughly 75,000 tokens. GPT-4o usually handles 128k context, 
    # but we want to leave room for the output (max 4096 / 16384 tokens).
    if len(compiled_text) > 300000:
        logger.warning(f"Compiled text for folder {folder.name} is too large ({len(compiled_text)} chars). Truncating.")
        compiled_text = compiled_text[:300000] + "\n\n...[CONTENIDO TRUNCADO POR LÍMITE DE TAMAÑO]..."

    # 4. Prompt the LLM
    sys_prompt = STUDY_SUMMARY_PROMPT.format(
        folder_name=folder.name,
        all_content=compiled_text
    )

    messages = [
        {"role": "system", "content": sys_prompt},
        {"role": "user", "content": "Genera la Guía de Estudio exhaustiva ahora."}
    ]

    llm = get_llm()
    try:
        response = await llm.ainvoke(messages)
        return response.content
    except Exception as e:
        logger.error("Failed to generate deep study summary for folder %s: %s", folder.name, e)
        raise ValueError(f"Error en la IA al generar el resumen: {str(e)}")
