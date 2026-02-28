"""
Pydantic schemas for files.
Used for request validation and response serialization.
"""
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional


# ──────────────────────────────────────────────
# Base schemas
# ──────────────────────────────────────────────

class FileBase(BaseModel):
    """Shared fields across file operations."""
    name: str = Field(..., max_length=255, description="Name of the file without extension")
    description: Optional[str] = Field(None, max_length=255, description="Optional description")
    path: str = Field("/", description="Path where the file is stored, e.g. /my_folder/")
    file_type: str = Field("file", description="Type: 'file' or 'dir'")
    mime_type: Optional[str] = Field(None, description="MIME type, e.g. image/png")
    transcription: Optional[str] = Field(None, description="Transcription for audio/video files")


# ──────────────────────────────────────────────
# Create / Update schemas
# ──────────────────────────────────────────────

class FileCreate(FileBase):
    """Schema for file creation requests."""
    pass


class FileCreateDB(FileBase):
    """Internal schema for creating a file record in the database."""
    user_id: int
    url: Optional[str] = None
    cloudinary_public_id: Optional[str] = None
    size: Optional[int] = 0
    format: Optional[str] = None
    embedding: Optional[list[float]] = None
    transcription: Optional[str] = None


class FolderCreate(BaseModel):
    """Schema for folder creation requests."""
    name: str = Field(..., max_length=255, description="Name of the folder")
    description: Optional[str] = Field(None, max_length=255, description="Optional description")
    path: str = Field("/", description="Path where the folder is created")


class FileUpdate(BaseModel):
    """Schema for partial file updates."""
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=255)


# ──────────────────────────────────────────────
# Response schemas
# ──────────────────────────────────────────────

class FileResponse(FileBase):
    """Standard file response schema."""
    id: int
    user_id: int
    url: Optional[str]
    cloudinary_public_id: Optional[str]
    size: Optional[int]
    format: Optional[str]
    mime_type: Optional[str]
    transcription: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class FileContent(FileBase):
    """Schema for file download — includes raw content bytes."""
    content: bytes = Field(..., description="File content in bytes")


class FileSearchResult(BaseModel):
    """Schema for semantic search results — includes similarity score."""
    id: int
    name: str
    description: Optional[str] = None
    mime_type: Optional[str] = None
    file_type: str
    path: str
    size: Optional[int] = None
    format: Optional[str] = None
    url: Optional[str] = None
    cloudinary_public_id: Optional[str] = None
    transcription: Optional[str] = None
    user_id: int
    uploaded_at: Optional[datetime] = None
    similarity: float = Field(description="Cosine distance: 0.0 = identical, 2.0 = opposite")

    model_config = ConfigDict(from_attributes=True)


class SmartUploadResponse(FileResponse):
    """Response for smart-upload — includes AI classification metadata."""
    suggested_path: str = Field(description="Path suggested by GPT-4o")
    created_new_folder: bool = Field(description="Whether a new folder was created")
    ai_reason: str = Field(description="Brief reasoning from the AI")