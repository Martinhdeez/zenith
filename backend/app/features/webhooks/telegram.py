# SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
# SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
# SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
#
# SPDX-License-Identifier: GPL-3.0-or-later

"""
Telegram Bot Webhook Handler — Zenith Integration.

Flow:
  1. User sends /link <jwt_token> → associates their Telegram chat_id with Zenith account
  2. Any subsequent file or text → uploaded to Zenith under /Telegram folder
"""
import io
import logging
import mimetypes
from typing import Any, Dict, Optional

import httpx
from fastapi import APIRouter, Depends, Request
from jose import JWTError, jwt
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

import cloudinary
import cloudinary.uploader

from app.core.config import settings
from app.core.database import get_db
from app.features.file.repository import FileRepository
from app.features.file.schemas import FileCreateDB
from app.features.openai.embedding import generate_embedding
from app.features.openai.transcription import is_transcribable, transcribe_media
from app.features.user.model import User

logger = logging.getLogger(__name__)

router = APIRouter()

TELEGRAM_API = "https://api.telegram.org/bot{token}"
TELEGRAM_FILE_API = "https://api.telegram.org/file/bot{token}/{file_path}"
TELEGRAM_FOLDER = "/Telegram"


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def _tg_url(path: str) -> str:
    return f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}{path}"


async def _send_message(chat_id: int | str, text: str) -> None:
    """Fire-and-forget message to a Telegram chat."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                _tg_url("/sendMessage"),
                json={"chat_id": chat_id, "text": text},
            )
    except Exception as e:
        logger.warning("Failed to send Telegram message: %s", e)


async def _download_file(file_id: str) -> tuple[bytes, str]:
    """Download a file from Telegram. Returns (bytes, file_path)."""
    async with httpx.AsyncClient(timeout=60) as client:
        # Get file metadata
        resp = await client.get(_tg_url(f"/getFile?file_id={file_id}"))
        resp.raise_for_status()
        data = resp.json()
        file_path = data["result"]["file_path"]

        # Download actual bytes
        dl_url = f"https://api.telegram.org/file/bot{settings.TELEGRAM_BOT_TOKEN}/{file_path}"
        file_resp = await client.get(dl_url, follow_redirects=True)
        file_resp.raise_for_status()
        return file_resp.content, file_path


async def _ensure_telegram_folder(repo: FileRepository, user_id: int) -> None:
    """Create /Telegram folder if it doesn't exist for this user."""
    existing = await repo.get_folder_by_name_and_path(user_id, "Telegram", "/")
    if not existing:
        folder_data = FileCreateDB(
            name="Telegram",
            description="Files received via Telegram bot",
            path="/",
            file_type="dir",
            user_id=user_id,
            url=None,
            cloudinary_public_id=None,
            size=0,
            format=None,
            mime_type=None,
        )
        await repo.create(folder_data.model_dump())


async def _upload_to_zenith(
    db: AsyncSession,
    user_id: int,
    file_bytes: bytes,
    filename: str,
    mime_type: Optional[str],
) -> None:
    """Upload file bytes to Cloudinary and save record in DB."""
    repo = FileRepository(db)
    await _ensure_telegram_folder(repo, user_id)

    transcription = None
    snippet = None

    effective_mime = mime_type or "application/octet-stream"

    if is_transcribable(effective_mime):
        logger.info("Transcribing Telegram media: %s (%s)", filename, effective_mime)
        transcription = transcribe_media(file_bytes, filename)
    elif effective_mime.startswith("text/"):
        try:
            decoded = file_bytes.decode("utf-8", errors="ignore").strip()
            clean_text = " ".join(decoded.split())
            snippet = clean_text[:250] + ("..." if len(clean_text) > 250 else "")
        except Exception as e:
            logger.warning("Failed to extract snippet: %s", e)

    cloudinary.config(cloudinary_url=settings.CLOUDINARY_URL)
    cld_resource_type = "raw" if (
        effective_mime == "application/pdf"
        or filename.lower().endswith(".pdf")
    ) else "auto"

    result = cloudinary.uploader.upload(
        io.BytesIO(file_bytes),
        folder="zenith_files",
        resource_type=cld_resource_type,
        use_filename=True,
        unique_filename=True,
    )

    ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
    file_data = FileCreateDB(
        name=filename,
        description="Received via Telegram",
        path=TELEGRAM_FOLDER,
        file_type="file",
        mime_type=effective_mime,
        user_id=user_id,
        url=result["secure_url"],
        cloudinary_public_id=result["public_id"],
        size=result["bytes"],
        format=result.get("format", ext),
        embedding=generate_embedding(
            f"{filename} {transcription or ''} {snippet or ''}"
        ),
        transcription=transcription,
        snippet=snippet,
    )
    await repo.create(file_data.model_dump())


# ──────────────────────────────────────────────
# Webhook endpoint
# ──────────────────────────────────────────────

@router.post("/telegram")
async def telegram_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Receive updates from Telegram."""
    if not settings.TELEGRAM_BOT_TOKEN:
        logger.warning("Telegram webhook called but TELEGRAM_BOT_TOKEN is not set")
        return {"ok": True}

    try:
        body: Dict[str, Any] = await request.json()
    except Exception:
        return {"ok": True}

    message = body.get("message") or body.get("edited_message")
    if not message:
        return {"ok": True}

    chat_id = message["chat"]["id"]
    text: Optional[str] = message.get("text", "").strip()

    # ── /link <token> — associate Telegram account with Zenith ──
    if text and text.startswith("/link"):
        parts = text.split(maxsplit=1)
        if len(parts) < 2:
            await _send_message(chat_id, "Usage: /link <your_jwt_token>")
            return {"ok": True}

        token = parts[1].strip()
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
            user_id_raw: str = payload.get("sub")
            if not user_id_raw:
                raise JWTError("No sub")
        except JWTError:
            await _send_message(chat_id, "Invalid or expired token. Please generate a fresh one from Zenith.")
            return {"ok": True}

        # Resolve user
        try:
            if user_id_raw.isdigit():
                result = await db.execute(select(User).where(User.id == int(user_id_raw)))
            else:
                result = await db.execute(
                    select(User).where(
                        (User.email == user_id_raw) | (User.username == user_id_raw)
                    )
                )
            user = result.scalars().first()
        except Exception:
            user = None

        if not user:
            await _send_message(chat_id, "Account not found. Please check your token.")
            return {"ok": True}

        # Save chat_id
        await db.execute(
            update(User)
            .where(User.id == user.id)
            .values(telegram_chat_id=str(chat_id))
        )
        await db.commit()
        await _send_message(
            chat_id,
            f"Linked! Hi {user.username}, your files will now be saved to Zenith under /Telegram.",
        )
        return {"ok": True}

    # ── Look up user by chat_id ──
    result = await db.execute(
        select(User).where(User.telegram_chat_id == str(chat_id))
    )
    user = result.scalars().first()

    if not user:
        await _send_message(
            chat_id,
            "Your Telegram is not linked to any Zenith account. "
            "Send /link <jwt_token> to connect.",
        )
        return {"ok": True}

    # ── Handle media attachments ──
    media_info = _extract_media(message)
    if media_info:
        file_id, filename, mime_type = media_info
        try:
            file_bytes, tg_file_path = await _download_file(file_id)
            # Infer mime if not provided
            if not mime_type:
                guessed, _ = mimetypes.guess_type(tg_file_path)
                mime_type = guessed or "application/octet-stream"
            await _upload_to_zenith(db, user.id, file_bytes, filename, mime_type)
            await _send_message(chat_id, f"Saved '{filename}' to /Telegram in Zenith!")
        except Exception as e:
            logger.error("Failed to process Telegram file: %s", e)
            await _send_message(chat_id, f"Sorry, failed to save the file: {e}")
        return {"ok": True}

    # ── Handle plain text (including /start) ──
    if text and not text.startswith("/"):
        try:
            # Save as .txt file
            from datetime import datetime
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filename = f"telegram_note_{timestamp}.txt"
            file_bytes = text.encode("utf-8")
            await _upload_to_zenith(db, user.id, file_bytes, filename, "text/plain")
            await _send_message(chat_id, f"Note saved to /Telegram in Zenith!")
        except Exception as e:
            logger.error("Failed to save Telegram text note: %s", e)
            await _send_message(chat_id, f"Sorry, failed to save the note: {e}")
    elif text and text.startswith("/start"):
        await _send_message(
            chat_id,
            "Welcome to Zenith Bot!\n\n"
            "Send /link <jwt_token> to connect your account.\n"
            "After that, send any file or text and it will be saved to your Zenith.",
        )

    return {"ok": True}


def _extract_media(
    message: Dict[str, Any],
) -> Optional[tuple[str, str, Optional[str]]]:
    """
    Extract (file_id, filename, mime_type) from a Telegram message.
    Returns None if the message has no supported media.
    """
    # Document (PDF, zip, etc.)
    if "document" in message:
        doc = message["document"]
        return (
            doc["file_id"],
            doc.get("file_name", f"document_{doc['file_id'][:8]}"),
            doc.get("mime_type"),
        )

    # Photo (array — take the largest)
    if "photo" in message:
        photo = max(message["photo"], key=lambda p: p.get("file_size", 0))
        return (photo["file_id"], f"photo_{photo['file_id'][:8]}.jpg", "image/jpeg")

    # Audio
    if "audio" in message:
        audio = message["audio"]
        return (
            audio["file_id"],
            audio.get("file_name", f"audio_{audio['file_id'][:8]}.mp3"),
            audio.get("mime_type", "audio/mpeg"),
        )

    # Voice note (ogg/opus)
    if "voice" in message:
        voice = message["voice"]
        return (voice["file_id"], f"voice_{voice['file_id'][:8]}.ogg", "audio/ogg")

    # Video
    if "video" in message:
        video = message["video"]
        return (
            video["file_id"],
            video.get("file_name", f"video_{video['file_id'][:8]}.mp4"),
            video.get("mime_type", "video/mp4"),
        )

    # Video note (circular)
    if "video_note" in message:
        vn = message["video_note"]
        return (vn["file_id"], f"video_note_{vn['file_id'][:8]}.mp4", "video/mp4")

    # Sticker (webp)
    if "sticker" in message:
        sticker = message["sticker"]
        return (sticker["file_id"], f"sticker_{sticker['file_id'][:8]}.webp", "image/webp")

    return None
