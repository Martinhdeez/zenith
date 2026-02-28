# SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
# SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
# SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
#
# SPDX-License-Identifier: GPL-3.0-or-later

"""
AI Chat Service — Zenith AI Assistant.

Conversational assistant powered by GPT-4o that uses semantic search
(embeddings + pgvector) to find the most relevant files as context,
plus a general overview of all user files.
"""
import logging
from typing import List, Optional
from collections import Counter

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.features.openai.client import get_llm
from app.features.openai.search import search_files
from app.features.openai.repository import ChatRepository
from app.features.openai.utils import fetch_file_text
from app.features.file.model import File

logger = logging.getLogger(__name__)

# Max relevant files to retrieve via semantic search
TOP_K_RELEVANT = 10


SYSTEM_PROMPT = """You are Zenith AI, the user's personal assistant for their cloud storage.
You use semantic search to find the most relevant files for each question.

Your #1 goal: help the user find the information they need as fast as possible.

When the user asks something:
- If it relates to a file they have, immediately point them to it (name, path, and a brief description).
- If multiple files could be relevant, list the best matches ranked by relevance.
- If you're not sure which file they mean, suggest the most likely ones and ask to narrow down.
- If the file doesn't exist in what you can see, say so clearly and suggest alternatives if possible.

You can also:
- Summarize what files they have in a folder or topic.
- Suggest better ways to organize their files.
- Answer general questions while being helpful.

Rules:
- ALWAYS respond in the SAME LANGUAGE the user writes in.
- Be concise and direct — no unnecessary filler.
- NEVER invent files that don't exist.
- Use markdown formatting when it helps readability (bold for filenames, lists for multiple results).
- IMPORTANT: When mentioning a **FOLDER**, ALWAYS format it as a clickable markdown link pointing to its path. Example: `[Nombre de la carpeta](/ruta/a/la/carpeta)`. 
- CRITICAL: NEVER create clickable markdown links for individual files. Only use clickable links for folders. If you mention a file, just use bold text like **filename.pdf** and perhaps mention which folder it is in. do NOT link to the file itself.
- For the top most relevant files, you will be provided with their actual raw text content. Read it carefully to answer questions about the specific text, data, or concepts inside those files.

── GENERAL FILE OVERVIEW ──
{file_overview}
───────────────────────────

── MOST RELEVANT FILES (semantic search results for the user's question) ──
{relevant_files}
───────────────────────────
"""


async def _build_file_overview(db: AsyncSession, user_id: int) -> str:
    """
    Build a compact overview of the user's entire file collection:
    total count, folder structure, and file type distribution.
    """
    stmt = (
        select(File)
        .where(File.user_id == user_id)
    )
    result = await db.execute(stmt)
    files = list(result.scalars().all())

    if not files:
        return "The user has no files yet."

    total = len(files)
    dirs = [f for f in files if f.file_type == "dir"]
    regular_files = [f for f in files if f.file_type != "dir"]

    # Folder listing
    folder_lines = []
    for d in dirs:
        full_path = f"{d.path.rstrip('/')}/{d.name}" if d.path != "/" else f"/{d.name}"
        folder_lines.append(f"  📁 {full_path}")

    # File type distribution
    type_counts = Counter(f.mime_type or "unknown" for f in regular_files)
    type_lines = [f"  • {mime}: {count}" for mime, count in type_counts.most_common(10)]

    # Total size
    total_size = sum(f.size or 0 for f in regular_files)
    size_mb = total_size / (1024 * 1024)

    overview = f"Total: {total} items ({len(regular_files)} files, {len(dirs)} folders), {size_mb:.1f} MB\n"

    if folder_lines:
        overview += "Folders:\n" + "\n".join(folder_lines) + "\n"

    if type_lines:
        overview += "File types:\n" + "\n".join(type_lines) + "\n"

    # Recent files (up to 50) to give the AI context about time
    recent_files = sorted(regular_files, key=lambda x: x.created_at, reverse=True)[:50]
    if recent_files:
        overview += "\nRecent files (last 50):\n"
        for f in recent_files:
            date_str = f.created_at.strftime("%Y-%m-%d %H:%M") if f.created_at else "unknown"
            overview += f"  • {f.name} (Uploaded: {date_str}) in {f.path}\n"

    return overview


async def _search_relevant_files(
    message: str,
    db: AsyncSession,
    user_id: int,
) -> tuple[str, int]:
    """
    Use semantic search (embeddings + pgvector) to find the files
    most relevant to the user's message.

    Returns:
        Tuple of (formatted text with relevant files, count of files found).
    """
    try:
        results = await search_files(
            query=message,
            db=db,
            user_id=user_id,
            top_k=TOP_K_RELEVANT,
            deep=False,
        )
    except Exception as e:
        logger.warning("Semantic search failed in chat: %s", e)
        return "Semantic search unavailable.", 0

    if not results:
        return "No relevant files found for this query.", 0

    lines = []
    for i, r in enumerate(results, 1):
        f = r.file
        icon = "📁" if f.file_type == "dir" else "📄"
        size_str = f" ({f.size} bytes)" if f.size else ""
        desc_str = f" — {f.description}" if f.description else ""
        date_str = f.created_at.strftime("%Y-%m-%d %H:%M") if getattr(f, "created_at", None) else "unknown date"
        similarity_pct = max(0, (1 - r.distance)) * 100
        
        file_info = (
            f"{i}. {icon} **{f.name}** at `{f.path}` "
            f"[{f.mime_type or f.file_type}, {date_str}]{size_str}{desc_str} "
            f"(relevance: {similarity_pct:.0f}%)"
        )
        lines.append(file_info)

        # Inject actual file content for the top 3 files to give precise context
        if i <= 3 and f.file_type != "dir":
            content = await fetch_file_text(f)
            if content:
                # Truncate content to avoid blowing up the token window
                max_chars = 6000
                if len(content) > max_chars:
                    content = content[:max_chars] + "\n...[CONTENT TRUNCATED]..."
                
                lines.append(f"   --- START OF FILE CONTENT ({f.name}) ---")
                lines.append(f"   {content}")
                lines.append(f"   --- END OF FILE CONTENT ---")

    return "\n".join(lines), len(results)


async def chat_with_assistant(
    message: str,
    db: AsyncSession,
    user_id: int,
    history: Optional[List[dict]] = None,
) -> tuple[str, int]:
    """
    Send a message to GPT-4o using embeddings-based semantic search
    to find relevant files as context.

    Args:
        message: The user's current message.
        db: Database session.
        user_id: ID of the authenticated user.
        history: Optional list of previous messages [{"role": ..., "content": ...}].

    Returns:
        Tuple of (AI reply text, number of files used as context).
    """
    # 1. Build general file overview
    file_overview = await _build_file_overview(db, user_id)

    # 2. Semantic search — find the most relevant files via embeddings
    relevant_files, file_count = await _search_relevant_files(message, db, user_id)

    # 3. Build message list
    system_content = SYSTEM_PROMPT.format(
        file_overview=file_overview,
        relevant_files=relevant_files,
    )
    messages = [{"role": "system", "content": system_content}]

    # Add conversation history if provided
    if history:
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})

    # Add current user message
    messages.append({"role": "user", "content": message})

    # 4. Call GPT-4o
    llm = get_llm()
    chat_repo = ChatRepository(db)

    try:
        # Save user message
        print(f"DEBUG: Saving user message for user {user_id}")
        await chat_repo.add_message(user_id=user_id, role="user", content=message)
        
        print(f"DEBUG: Calling OpenAI with {len(messages)} messages")
        response = await llm.ainvoke(messages)
        reply = response.content
        print(f"DEBUG: Received AI reply: {reply[:50]}...")
        
        # Save assistant message
        print(f"DEBUG: Saving assistant message")
        await chat_repo.add_message(user_id=user_id, role="assistant", content=reply, files_used=file_count)
        
        return reply, file_count
    except Exception as e:
        print(f"DEBUG ERROR: Chat failed: {str(e)}")
        import traceback
        traceback.print_exc()
        logger.error("AI chat call failed: %s", e)
        return (
            "Lo siento, hubo un error al comunicarme con el servicio de IA. "
            "Por favor, inténtalo de nuevo en unos momentos.",
            file_count,
        )
