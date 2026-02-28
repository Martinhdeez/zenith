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
    reply: str
    files_used: int = 0


class ChatHistoryMessage(BaseModel):
    role: str
    content: str
    created_at: str  # Formatted as string for easy UI handling
    files_used: int = 0


class ChatHistoryResponse(BaseModel):
    messages: List[ChatHistoryMessage]


class StudyRequest(BaseModel):
    """Request body for the study material endpoint."""
    file_id: int = Field(..., description="ID of the file to study")
    mode: str = Field(
        ...,
        description="Study mode: 'quiz', 'outline', 'flashcards', or 'custom'",
    )
    custom_prompt: Optional[str] = Field(
        default=None,
        description="Custom prompt (required when mode is 'custom')",
    )


class StudyResponse(BaseModel):
    """Response with generated study material."""
    content: str = Field(..., description="Generated study material in markdown")
    mode: str = Field(..., description="The study mode used")
    file_name: str = Field(..., description="Name of the source file")
