# SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
# SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
# SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
#
# SPDX-License-Identifier: GPL-3.0-or-later

import logging
import httpx
from typing import Optional

from app.features.file.model import File

logger = logging.getLogger(__name__)


async def fetch_file_text(file_obj: File) -> Optional[str]:
    """
    Get text content for AI processing (study summaries, chat, etc.).

    Strategy (permissive):
      1. Return stored transcription if available (audio/video files).
      2. Skip images — they have no extractable text.
      3. For everything else, try to download and read as text.
         If the file turns out to be binary / unreadable, silently return None.
    """
    # 1. If we already have a transcription (audio/video or even text), use it!
    if file_obj.transcription:
        return file_obj.transcription

    if not file_obj.url:
        return None

    mime = (file_obj.mime_type or "").lower()

    # 2. Skip images — no text to extract
    if mime.startswith("image/"):
        return None

    # 3. Skip audio/video without transcription — nothing we can do here
    if mime.startswith("audio/") or mime.startswith("video/"):
        logger.info("File %s is media without transcription, skipping.", file_obj.name)
        return None

    # 4. For ANY other file type, try to download and read as text
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(file_obj.url, follow_redirects=True, timeout=30.0)
            if response.status_code != 200:
                logger.info("Failed to download %s (status %d), skipping.", file_obj.name, response.status_code)
                return None

            # Try to decode as text
            try:
                text = response.content.decode("utf-8", errors="ignore")
            except Exception:
                text = response.text

            # Sanity check: if more than 30% of chars are non-printable,
            # it's likely a binary file → skip it
            if text and len(text) > 0:
                non_printable = sum(1 for c in text[:2000] if not c.isprintable() and c not in '\n\r\t')
                sample_len = min(len(text), 2000)
                if sample_len > 0 and (non_printable / sample_len) > 0.30:
                    logger.info("File %s appears to be binary, skipping.", file_obj.name)
                    return None

            return text if text and text.strip() else None

    except Exception as e:
        logger.warning("Failed to fetch file content for %s: %s", file_obj.name, e)
        return None
