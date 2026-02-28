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
    Get text content for AI processing (study or chat).
    Prioritizes stored transcription (for audio/video) then downloads text/PDF.
    """
    # 1. If we already have a transcription (audio/video or even text), use it!
    if file_obj.transcription:
        return file_obj.transcription

    if not file_obj.url:
        return None

    # 2. Otherwise, check if it's a direct text/PDF file we can download
    mime = (file_obj.mime_type or "").lower()
    fmt = (file_obj.format or "").lower()
    
    is_text = mime.startswith("text/") or fmt in (
        "txt", "md", "json", "js", "py", "csv", "xml", "html", "css",
    )
    is_pdf = mime == "application/pdf" or fmt == "pdf"

    if not is_text and not is_pdf:
        # If it's not text/pdf AND has no transcription, we can't study it
        return None

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(file_obj.url, follow_redirects=True, timeout=30.0)
            if response.status_code != 200:
                return None

            if is_pdf:
                # For PDFs, we return raw text (Whisper doesn't apply here, just raw extract)
                try:
                    return response.text
                except Exception:
                    return response.content.decode("utf-8", errors="ignore")

            return response.text
    except Exception as e:
        logger.warning(f"Failed to fetch file content for {file_obj.name}: {e}")
        return None
