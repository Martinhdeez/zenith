# SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
# SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
# SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
#
# SPDX-License-Identifier: GPL-3.0-or-later

"""
Media Transcription Service — Zenith AI Engine.

Uses OpenAI's Whisper (whisper-1) model to transcribe audio and video files.
Whisper handles both formats natively — for video it extracts the audio track.
"""
import logging
import io
import openai
from app.core.config import settings

logger = logging.getLogger(__name__)


# Supported MIME type prefixes for transcription
_TRANSCRIBABLE_MIME_PREFIXES = ("audio/", "video/")


def is_transcribable(mime_type: str) -> bool:
    """Return True if the MIME type can be transcribed by Whisper."""
    if not mime_type:
        return False
    return mime_type.lower().startswith(_TRANSCRIBABLE_MIME_PREFIXES)


def transcribe_media(file_content: bytes, filename: str) -> str:
    """
    Transcribes audio or video content using OpenAI Whisper API.

    Whisper-1 natively handles audio files (mp3, wav, ogg, flac, m4a, webm)
    and video files that contain an audio track (mp4, mov, avi, webm, mkv).
    For video files, Whisper extracts the audio automatically.

    Args:
        file_content: The raw bytes of the media file.
        filename: Original filename (used by OpenAI for format detection).

    Returns:
        Transcribed text, or empty string on failure / missing API key.
    """
    if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY.startswith("dummy"):
        logger.warning("OPENAI_API_KEY is not set or is a dummy. Skipping transcription.")
        return ""

    try:
        client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

        # Whisper expects a file-like object with a name attribute
        media_file = io.BytesIO(file_content)
        media_file.name = filename

        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=media_file
        )
        return transcript.text
    except Exception as e:
        logger.error("Whisper transcription failed for %s: %s", filename, e)
        return ""


# Backwards-compatible alias
transcribe_audio = transcribe_media
