"""
AI Router — Chat endpoint for Zenith AI Assistant.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.features.auth.dependencies import get_current_user
from app.features.openai.schemas import ChatRequest, ChatResponse
from app.features.openai.chat import chat_with_assistant

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Chat with the Zenith AI assistant.

    The assistant has context of all your files and can answer questions
    about them, help you find things, or suggest how to organize your storage.

    Supports multi-turn conversation via the optional `history` field.
    """
    # Convert history to list of dicts if present
    history = None
    if request.history:
        history = [{"role": msg.role, "content": msg.content} for msg in request.history]

    reply, files_used = await chat_with_assistant(
        message=request.message,
        db=db,
        user_id=current_user.id,
        history=history,
    )

    return ChatResponse(reply=reply, files_used=files_used)
