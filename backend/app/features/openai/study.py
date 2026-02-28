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


async def _fetch_file_text(file_obj: File) -> Optional[str]:
    """Download file content from its URL and attempt to extract text."""
    if not file_obj.url:
        return None

    # Only process text-based files
    mime = (file_obj.mime_type or "").lower()
    fmt = (file_obj.format or "").lower()
    is_text = mime.startswith("text/") or fmt in (
        "txt", "md", "json", "js", "py", "csv", "xml", "html", "css",
    )
    is_pdf = mime == "application/pdf" or fmt == "pdf"

    if not is_text and not is_pdf:
        return None

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(file_obj.url, follow_redirects=True, timeout=30.0)
            if response.status_code != 200:
                return None

            if is_pdf:
                # For PDFs, we extract what we can from raw bytes as text
                # GPT can still work with the raw text representation
                try:
                    return response.text
                except Exception:
                    return response.content.decode("utf-8", errors="ignore")

            return response.text
    except Exception as e:
        logger.warning("Failed to fetch file content for study: %s", e)
        return None


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
    text_content = await _fetch_file_text(file_obj)

    if not text_content or len(text_content.strip()) < 20:
        return (
            "⚠️ **No se pudo extraer contenido de texto** de este archivo.\n\n"
            "El panel de estudio funciona con archivos de texto (`.txt`, `.md`, `.pdf`, etc.). "
            "Los archivos de imagen o binarios no son compatibles."
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
