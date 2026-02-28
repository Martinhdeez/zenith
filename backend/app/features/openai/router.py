"""
AI Router — Chat and Study endpoints for Zenith AI Assistant.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.features.auth.dependencies import get_current_user
from app.features.openai.schemas import (
    ChatRequest, ChatResponse, StudyRequest, StudyResponse, ChatHistoryResponse, ChatHistoryMessage
)
from app.features.openai.chat import chat_with_assistant
from app.features.openai.study import generate_study_material
from app.features.openai.repository import ChatRepository
from app.features.file.repository import FileRepository

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


@router.get("/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    limit: int = 50,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve the recent chat history for the current user.
    """
    repo = ChatRepository(db)
    messages = await repo.get_history(user_id=current_user.id, limit=limit)
    
    return ChatHistoryResponse(
        messages=[
            ChatHistoryMessage(
                role=msg.role,
                content=msg.content,
                created_at=msg.created_at.isoformat(),
                files_used=msg.files_used
            )
            for msg in messages
        ]
    )


@router.post("/study", response_model=StudyResponse)
async def study(
    request: StudyRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate study material (quiz, outline, flashcards, or custom)
    from a specific file's content using GPT-4o.
    """
    valid_modes = ("quiz", "outline", "flashcards", "custom")
    if request.mode not in valid_modes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid mode '{request.mode}'. Must be one of: {', '.join(valid_modes)}",
        )

    if request.mode == "custom" and not request.custom_prompt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="custom_prompt is required when mode is 'custom'",
        )

    # Get file name for the response
    repo = FileRepository(db)
    file_obj = await repo.get_or_fail(request.file_id)

    if file_obj.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this file",
        )

    try:
        content = await generate_study_material(
            file_id=request.file_id,
            mode=request.mode,
            db=db,
            user_id=current_user.id,
            custom_prompt=request.custom_prompt,
        )
    except PermissionError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this file",
        )

    return StudyResponse(
        content=content,
        mode=request.mode,
        file_name=file_obj.name,
    )
