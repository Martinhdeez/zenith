"""
AI Chat Service — Zenith AI Assistant.

Conversational assistant powered by GPT-4o that has full context
of the user's files and can answer questions about them.
"""
import logging
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.features.openai.client import get_llm
from app.features.file.model import File

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """You are Zenith AI, the user's personal assistant for their cloud storage.
You already know ALL their files — where they are, what type they are, and what they contain.

Your #1 goal: help the user find the information they need as fast as possible.

When the user asks something:
- If it relates to a file they have, immediately point them to it (name, path, and a brief description).
- If multiple files could be relevant, list the best matches ranked by relevance.
- If you're not sure which file they mean, suggest the most likely ones and ask to narrow down.
- If the file doesn't exist in their inventory, say so clearly and suggest alternatives if possible.

You can also:
- Summarize what files they have in a folder or topic.
- Suggest better ways to organize their files.
- Answer general questions while being helpful.

Rules:
- ALWAYS respond in the SAME LANGUAGE the user writes in.
- Be concise and direct — no unnecessary filler.
- NEVER invent files that don't exist in the inventory.
- Use markdown formatting when it helps readability (bold for filenames, lists for multiple results).

── USER'S FILE INVENTORY ──
{file_context}
───────────────────────────
"""


async def _build_file_context(db: AsyncSession, user_id: int) -> str:
    """
    Query all files belonging to the user and build a text summary
    that will be injected into the system prompt.
    """
    stmt = (
        select(File)
        .where(File.user_id == user_id)
        .order_by(File.path.asc(), File.file_type.asc(), File.name.asc())
    )
    result = await db.execute(stmt)
    files = result.scalars().all()

    if not files:
        return "The user has no files yet."

    lines = []
    for f in files:
        icon = "📁" if f.file_type == "dir" else "📄"
        size_str = f"{f.size} bytes" if f.size else ""
        desc_str = f" — {f.description}" if f.description else ""
        lines.append(
            f"{icon} {f.path.rstrip('/')}/{f.name} "
            f"[{f.mime_type or f.file_type}] {size_str}{desc_str}"
        )

    return "\n".join(lines)


async def chat_with_assistant(
    message: str,
    db: AsyncSession,
    user_id: int,
    history: Optional[List[dict]] = None,
) -> tuple[str, int]:
    """
    Send a message to GPT-4o with the user's full file context.

    Args:
        message: The user's current message.
        db: Database session.
        user_id: ID of the authenticated user.
        history: Optional list of previous messages [{"role": ..., "content": ...}].

    Returns:
        Tuple of (AI reply text, number of files used as context).
    """
    file_context = await _build_file_context(db, user_id)
    file_count = file_context.count("\n") + 1 if file_context != "The user has no files yet." else 0

    system_message = {"role": "system", "content": SYSTEM_PROMPT.format(file_context=file_context)}
    messages = [system_message]

    if history:
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": message})

    llm = get_llm()

    try:
        response = await llm.ainvoke(messages)
        return response.content, file_count
    except Exception as e:
        logger.error("AI chat call failed: %s", e)
        return (
            "Lo siento, hubo un error al comunicarme con el servicio de IA. "
            "Por favor, inténtalo de nuevo en unos momentos.",
            file_count,
        )
