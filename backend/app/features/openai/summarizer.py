"""
Auto-Updating Folder Summaries Service.

Generates and updates a `summary` for folders based on their content and sub-content.
Runs as a background task after file uploads.
"""
import logging
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.features.file.model import File
from app.features.openai.client import get_llm
from app.features.openai.study import _fetch_file_text

logger = logging.getLogger(__name__)

SUMMARIZER_PROMPT = """You are Zenith AI, an expert at summarizing folder contents.
You are given the current summary of a folder (if any) and the content of a NEW file that was just added.
Your task is to rewrite the folder summary to incorporate the new information concisely.

The summary should:
1. Be an EXTREMELY concise high-level overview (max 2-3 lines).
2. Tell the user EXACTLY what kind of content is in this folder at a glance.
3. Use a clear, direct, and professional tone.
4. ALWAYS respond in the SAME LANGUAGE as the dominant language of the content.

── CURRENT FOLDER SUMMARY ──
{current_summary}
────────────────────────────

── NEW FILE CONTENT ({file_name}) ──
{new_content}
─────────────────────────────
"""


async def _generate_new_summary(current_summary: Optional[str], new_content: str, file_name: str) -> str:
    """Use GPT-4o to merge the new content into the existing folder summary."""
    sys_prompt = SUMMARIZER_PROMPT.format(
        current_summary=current_summary or "There is no summary yet. This is the first file.",
        file_name=file_name,
        new_content=new_content[:15000]  # Truncate to avoid context limit overflow
    )

    messages = [
        {"role": "system", "content": sys_prompt},
        {"role": "user", "content": "Update the folder summary by integrating the new file content."}
    ]

    try:
        llm = get_llm()
        response = await llm.ainvoke(messages)
        return response.content
    except Exception as e:
        logger.error("Failed to generate folder summary: %s", e)
        return current_summary or ""


async def start_folder_summary_update(file_id: int):
    """
    Background worker entrypoint.
    Updates the summaries of all parent folders starting from the uploaded file's parent.
    """
    logger.info("Starting background summary update for file_id=%d", file_id)
    async with AsyncSessionLocal() as db:
        try:
            # 1. Get the newly uploaded file
            file_obj = await db.get(File, file_id)
            if not file_obj:
                logger.warning("File %d not found for summarization.", file_id)
                return

            if file_obj.file_type == "dir":
                # We only trigger this on file uploads, not folder creations.
                return

            # 2. Extract its text content or transcription
            text_content = await _fetch_file_text(file_obj)
            if not text_content or len(text_content.strip()) < 10:
                logger.info("File %d has no extractable text. Skipping summary update.", file_id)
                return

            # Keep a reference to the content we are propagating
            current_propagation_content = text_content
            current_propagation_name = file_obj.name

            # 3. Recursively update parent folders up to the root "/"
            # The file's path is something like "/folder/subfolder". 
            # If path == "/", parent is root "/".
            current_path = file_obj.path

            while True:
                # Find the directory object for current_path
                # We need to extract the parent path and the folder name
                if current_path == "/":
                    # We've reached the root, there is no "File" object representing the root "/"
                    # So we break. (Unless we want a global summary, but we don't have a DB row for "/")
                    break

                # Example: "/Math/Calculus" -> parent_path="/Math", name="Calculus"
                # Example: "/Redes" -> parent_path="/", name="Redes"
                parts = [p for p in current_path.split("/") if p]
                folder_name = parts[-1]
                parent_path = "/" + "/".join(parts[:-1]) if len(parts) > 1 else "/"

                stmt = select(File).where(
                    File.file_type == "dir",
                    File.name == folder_name,
                    File.path == parent_path,
                    File.user_id == file_obj.user_id
                )
                result = await db.execute(stmt)
                folder_obj = result.scalars().first()

                if not folder_obj:
                    logger.warning("Could not find DB entry for folder %s. Stopping propagation.", current_path)
                    break

                logger.info("Updating summary for folder '%s'", folder_obj.name)

                # Generate the new summary for this folder by merging the propagating content
                new_summary = await _generate_new_summary(
                    current_summary=folder_obj.summary,
                    new_content=current_propagation_content,
                    file_name=current_propagation_name
                )

                if new_summary and new_summary != folder_obj.summary:
                    folder_obj.summary = new_summary
                    await db.commit()
                
                # For the next level up, the content we propagate is the NEW summary of THIS folder
                current_propagation_content = new_summary
                current_propagation_name = f"Folder: {folder_obj.name}"
                current_path = folder_obj.path

        except Exception as e:
            logger.error("Error in background summary update: %s", e)
