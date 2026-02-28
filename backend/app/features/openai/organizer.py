# SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
# SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
# SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
#
# SPDX-License-Identifier: GPL-3.0-or-later

"""
Smart File Organizer — AI-powered file path suggestion.

Uses GPT-4o to analyze the file name/type and the user's existing
folder structure, then suggests the most appropriate path.
"""
import json
import logging
from dataclasses import dataclass

from app.features.openai.client import get_llm

logger = logging.getLogger(__name__)


@dataclass
class PathSuggestion:
    """Result of the AI path suggestion."""
    path: str
    new_folder: bool
    reason: str


SYSTEM_PROMPT = """You are a file organizer assistant for a cloud storage application called Zenith.
Your job is to decide the best folder path for a newly uploaded file.

Rules:
1. If the user already has a folder that clearly matches the file's topic or type, use that folder.
2. If no existing folder is a good fit, suggest a NEW descriptive folder name (short, 1-3 words, in the same language as the filename).
3. Folder paths always start with "/". For example: "/Invoices", "/Photos", "/Projects".
4. Never suggest nested paths deeper than one level (e.g. "/Photos" is ok, "/Photos/Vacations" is not).
5. Be concise in your reasoning.

You MUST respond with valid JSON only, in this exact format:
{"path": "/FolderName", "new_folder": true, "reason": "Brief explanation"}
"""


async def suggest_file_path(
    filename: str,
    mime_type: str | None,
    existing_folders: list[str],
) -> PathSuggestion:
    """
    Ask GPT-4o to suggest the best folder path for a file.

    Args:
        filename: Name of the uploaded file (e.g. "factura_marzo.pdf").
        mime_type: MIME type of the file (e.g. "application/pdf").
        existing_folders: List of the user's current folder paths.

    Returns:
        PathSuggestion with the suggested path, whether it's a new folder,
        and the reasoning behind the suggestion.
    """
    folders_text = ", ".join(existing_folders) if existing_folders else "No folders yet"

    user_prompt = (
        f"File: \"{filename}\"\n"
        f"MIME type: {mime_type or 'unknown'}\n"
        f"Existing folders: [{folders_text}]\n\n"
        f"Where should this file go?"
    )

    llm = get_llm()

    try:
        response = await llm.ainvoke([
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ])

        # Parse the JSON response
        content = response.content.strip()
        # Handle markdown code blocks if the model wraps the JSON
        if content.startswith("```"):
            content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        data = json.loads(content)

        # Ensure path starts with /
        path = data["path"]
        if not path.startswith("/"):
            path = f"/{path}"

        return PathSuggestion(
            path=path,
            new_folder=data.get("new_folder", True),
            reason=data.get("reason", "AI classification"),
        )

    except (json.JSONDecodeError, KeyError) as e:
        logger.warning("Failed to parse AI response: %s — falling back to /Uploads", e)
        return PathSuggestion(
            path="/Uploads",
            new_folder=True,
            reason="Fallback: could not parse AI response",
        )
    except Exception as e:
        logger.error("OpenAI organizer call failed: %s", e)
        return PathSuggestion(
            path="/Uploads",
            new_folder=True,
            reason=f"Fallback: AI service error ({e})",
        )
