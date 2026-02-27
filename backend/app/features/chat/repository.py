"""
Repository for chat feature.
Implements database operations for ChatMessage.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.common.repositories import BaseRepository
from app.features.chat.model import ChatMessage


class ChatMessageRepository(BaseRepository[ChatMessage]):
    """ChatMessage repository."""

    def __init__(self, db: AsyncSession):
        super().__init__(ChatMessage, db)
        
    async def get_challenge_messages(
        self,
        challenge_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> List[ChatMessage]:
        """Get all messages for a specific challenge."""
        query = (
            select(ChatMessage)
            .where(ChatMessage.challenge_id == challenge_id)
            .order_by(ChatMessage.created_at.asc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())
