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
from app.features.file.schemas import FileCreateDB, FileResponse
from app.features.openai.study_summary import generate_deep_study_summary
from app.features.openai.embedding import generate_embedding
import io
import cloudinary
import cloudinary.uploader
from app.core.config import settings

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


@router.post("/folder/{folder_id}/study-summary", response_model=FileResponse)
async def create_study_summary(
    folder_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a comprehensive study guide for a folder and its contents.
    Saves the result as a Markdown file inside the referenced folder.
    """
    # 1. Generate text
    try:
        summary_text = await generate_deep_study_summary(folder_id, current_user.id, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    
    if not summary_text:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate summary.")

    # 2. Get folder data to know where to save it
    repo = FileRepository(db)
    folder = await repo.get_or_fail(folder_id)
    if folder.user_id != current_user.id or folder.file_type != "dir":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid folder")
    
    # Target path is inside the folder
    target_path = f"{folder.path.rstrip('/')}/{folder.name}"
    if target_path == "//":
        target_path = "/"
        
    file_name = f"Guia_de_Estudio_AI_{folder.name}.md"

    # 3. Upload to Cloudinary
    try:
        cloudinary.config(cloudinary_url=settings.CLOUDINARY_URL)
        file_bytes = io.BytesIO(summary_text.encode("utf-8"))
        result = cloudinary.uploader.upload(
            file_bytes,
            folder="zenith_files",
            resource_type="raw",
            # Ensure unique internal names so it doesn't overwrite
            use_filename=True,
            unique_filename=True,
            format="md"
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Cloudinary upload failed: {e}")

    # 4. Save to DB
    file_data = FileCreateDB(
        name=file_name,
        description="Generado automáticamente por Zenith AI",
        path=target_path,
        file_type="file",
        mime_type="text/markdown",
        user_id=current_user.id,
        url=result["secure_url"],
        cloudinary_public_id=result["public_id"],
        size=result["bytes"],
        format="md",
        embedding=generate_embedding(f"{file_name} Guía de Estudio exhaustiva {folder.name}"),
    )
    new_file = await repo.create(file_data.model_dump())
    
    return new_file
