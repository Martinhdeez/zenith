"""
Pydantic schemas for chat feature.
"""
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class ChatMessageCreate(BaseModel):
    """Schema for creating a new chat message."""
    content: str = Field(..., min_length=1, max_length=2000)


class ChatMessageRead(BaseModel):
    """Schema for reading a chat message."""
    id: int
    content: str
    challenge_id: int
    user_id: int
    created_at: datetime
    
    # Extended minimal user data
    username: str | None = None

    model_config = ConfigDict(from_attributes=True)
