"""
Chat repository.
Implements database operations for chat messages.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.common.repositories.base import BaseRepository
from app.features.openai.model import ChatMessage


class ChatRepository(BaseRepository[ChatMessage]):
    """Repository for managing chat history."""

    def __init__(self, db: AsyncSession):
        super().__init__(ChatMessage, db)

    async def get_history(self, user_id: int, limit: int = 50) -> List[ChatMessage]:
        """
        Retrieve recent chat history for a specific user.
        Ordered by creation date (oldest first for chronological display).
        """
        # We fetch the last N messages, then sort them chronologically
        stmt = (
            select(self.model)
            .where(self.model.user_id == user_id)
            .order_by(self.model.created_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        messages = list(result.scalars().all())
        
        # Return in ascending order for the UI
        return sorted(messages, key=lambda x: x.created_at)

    async def add_message(self, user_id: int, role: str, content: str, files_used: int = 0) -> ChatMessage:
        """Add a new message to the conversation history."""
        message = ChatMessage(
            user_id=user_id,
            role=role,
            content=content,
            files_used=files_used
        )
        return await self.create(message)
