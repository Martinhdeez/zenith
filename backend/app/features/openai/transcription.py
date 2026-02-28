"""
Audio Transcription Service — Zenith AI Engine.

Uses OpenAI's Whisper (whisper-1) model to transcribe audio files.
"""
import logging
import io
import openai
from app.core.config import settings

logger = logging.getLogger(__name__)


def transcribe_audio(file_content: bytes, filename: str) -> str:
    """
    Transcribes audio content using OpenAI Whisper API.

    Args:
        file_content: The raw bytes of the audio file.
        filename: Original filename (used for extension detection by OpenAI).

    Returns:
        Transcribed text or empty string on failure.
    """
    if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY.startswith("dummy"):
        logger.warning("OPENAI_API_KEY is not set or is a dummy. Skipping transcription.")
        return ""

    try:
        client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        
        # Whisper expects a file-like object with a name attribute
        audio_file = io.BytesIO(file_content)
        audio_file.name = filename

        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file
        )
        return transcript.text
    except Exception as e:
        logger.error("Whisper transcription failed for %s: %s", filename, e)
        return ""
