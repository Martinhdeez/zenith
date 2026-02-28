# SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
# SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
# SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
#
# SPDX-License-Identifier: GPL-3.0-or-later

"""
AI Study Service — Generates quizzes, outlines, and custom study material
from file content using GPT-4o.
"""
import logging
from typing import Optional

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.openai.client import get_llm
from app.features.file.model import File
from app.features.file.repository import FileRepository
from app.features.openai.utils import fetch_file_text

logger = logging.getLogger(__name__)


STUDY_PROMPTS = {
    "quiz": """You are a study assistant. Based on the following document content, generate a quiz with 5-8 multiple-choice questions. 
Each question should:
- Test understanding of key concepts from the document
- Have 4 options (A, B, C, D) with one correct answer
- Include the correct answer marked clearly

Format each question like:
### Question N
**[Question text]**

- A) [Option]
- B) [Option]
- C) [Option]
- D) [Option]

✅ **Correct: [Letter]) [Answer]**

ALWAYS respond in the SAME LANGUAGE as the document content.
""",
    "outline": """You are a study assistant. Based on the following document content, generate a comprehensive structured outline/summary.

The outline should:
- Use hierarchical headings (##, ###, ####)
- Highlight the most important concepts in **bold**
- Include key definitions and relationships
- Be well-organized and easy to scan
- End with a "Key Takeaways" section with 3-5 bullet points

ALWAYS respond in the SAME LANGUAGE as the document content.
""",
    "flashcards": """You are a study assistant. Based on the following document content, generate 8-12 flashcards for studying.

Format each flashcard like:
### Card N
**Front:** [Question or concept]

**Back:** [Answer or definition]

---

ALWAYS respond in the SAME LANGUAGE as the document content.
""",
}


async def generate_study_material(
    file_id: int,
    mode: str,
    db: AsyncSession,
    user_id: int,
    custom_prompt: Optional[str] = None,
) -> str:
    """
    Generate study material from a file's content.

    Args:
        file_id: ID of the file to study.
        mode: One of 'quiz', 'outline', 'flashcards', 'custom'.
        db: Database session.
        user_id: Authenticated user's ID.
        custom_prompt: For 'custom' mode, the user's freeform prompt.

    Returns:
        Generated markdown content.
    """
    repo = FileRepository(db)
    file_obj = await repo.get_or_fail(file_id)

    if file_obj.user_id != user_id:
        raise PermissionError("Not authorized to access this file.")

    # Fetch the file's text content
    text_content = await fetch_file_text(file_obj)

    if not text_content or len(text_content.strip()) < 20:
        return (
            "⚠️ **No se pudo extraer contenido de texto** de este archivo.\n\n"
            "El panel de estudio funciona con archivos de texto (`.txt`, `.md`, `.pdf`), "
            "o archivos de audio/vídeo que tengan transcripción.\n\n"
            "Si acabas de subir el archivo, espera unos segundos a que termine la transcripción."
        )

    # Truncate very long content to ~12k chars to stay within context limits
    max_chars = 12000
    if len(text_content) > max_chars:
        text_content = text_content[:max_chars] + "\n\n[... content truncated for length ...]"

    # Build system prompt
    if mode == "custom" and custom_prompt:
        system_content = (
            f"You are a study assistant. The user has a specific request about this document.\n"
            f"ALWAYS respond in the SAME LANGUAGE the user writes in.\n\n"
            f"── DOCUMENT CONTENT ──\n{text_content}\n───────────────────────"
        )
        user_message = custom_prompt
    else:
        system_template = STUDY_PROMPTS.get(mode, STUDY_PROMPTS["outline"])
        system_content = (
            f"{system_template}\n\n"
            f"── DOCUMENT: {file_obj.name} ──\n{text_content}\n───────────────────────"
        )
        user_message = f"Generate a {mode} from the document above."

    messages = [
        {"role": "system", "content": system_content},
        {"role": "user", "content": user_message},
    ]

    llm = get_llm()

    try:
        response = await llm.ainvoke(messages)
        return response.content
    except Exception as e:
        logger.error("AI study generation failed: %s", e)
        return (
            "❌ **Error al generar el material de estudio.**\n\n"
            "Por favor, inténtalo de nuevo en unos momentos."
        )
