"""Chat router with endpoints for sending and retrieving messages."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.features.auth.dependencies import get_current_active_user
from app.features.user.model import User
from app.features.challenge.repository import ChallengeRepository
from app.features.chat.repository import ChatMessageRepository
from app.features.chat.schemas import (
    ChatMessageCreate,
    ChatMessageRead,
)
from app.common.exceptions import NotFoundException

router = APIRouter()

@router.post(
    "/challenges/{challenge_id}",
    response_model=ChatMessageRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_message(
    challenge_id: int,
    message_data: ChatMessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Post a message to a challenge's chat/forum (authenticated)."""
    # Verify challenge exists
    challenge_repo = ChallengeRepository(db)
    try:
        await challenge_repo.get_or_fail(challenge_id)
    except NotFoundException:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Challenge with ID {challenge_id} not found",
        )

    msg_repo = ChatMessageRepository(db)
    message_dict = message_data.model_dump()
    message_dict.update({
        "challenge_id": challenge_id,
        "user_id": current_user.id,
    })
    
    # Create the message
    created_msg = await msg_repo.create(message_dict)
    
    # Return directly, attach username explicitly for the schema
    result_dict = {
        "id": created_msg.id,
        "content": created_msg.content,
        "challenge_id": created_msg.challenge_id,
        "user_id": created_msg.user_id,
        "created_at": created_msg.created_at,
        "username": current_user.username
    }
    return result_dict


@router.get("/challenges/{challenge_id}", response_model=list[ChatMessageRead])
async def get_messages(
    challenge_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """Get the message history for a challenge."""
    # Verify challenge exists
    challenge_repo = ChallengeRepository(db)
    try:
        await challenge_repo.get_or_fail(challenge_id)
    except NotFoundException:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Challenge with ID {challenge_id} not found",
        )

    msg_repo = ChatMessageRepository(db)
    messages = await msg_repo.get_challenge_messages(
        challenge_id=challenge_id,
        skip=skip,
        limit=limit,
    )
    
    # Serialize and extract username manually from relationship
    result = []
    for msg in messages:
        # Assuming msg.user is loaded via selectin
        username = msg.user.username if msg.user else None
        
        result.append({
            "id": msg.id,
            "content": msg.content,
            "challenge_id": msg.challenge_id,
            "user_id": msg.user_id,
            "created_at": msg.created_at,
            "username": username
        })
        
    return result
