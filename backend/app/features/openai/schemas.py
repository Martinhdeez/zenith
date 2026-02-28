"""
Pydantic schemas for the AI chat endpoint.
"""
from pydantic import BaseModel, Field
from typing import List, Optional


class ChatMessage(BaseModel):
    """A single message in the conversation history."""
    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    """Request body for the chat endpoint."""
    message: str = Field(..., min_length=1, description="User message to send to the AI assistant")
    history: Optional[List[ChatMessage]] = Field(
        default=None,
        description="Previous conversation messages for multi-turn context",
    )


class ChatResponse(BaseModel):
    """Response from the AI assistant."""
    reply: str = Field(..., description="AI assistant response")
    files_used: int = Field(description="Number of user files used as context")
