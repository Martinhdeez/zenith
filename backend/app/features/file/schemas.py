"""
Pydantic schemas for files.
These are used for request validation and response serialization.
"""
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional

class FileBase(BaseModel):
    name: str = Field(..., max_length=255, description="Name of the file without extension")
    description: Optional[str] = Field(None, max_length=255, description="Optional description of the file")
    path: str = Field("/", description="Path where the file is stored, e.g. /my_folder/")
    file_type: str = Field("file", description="Type of the file: 'file' or 'dir'")
    mime_type: Optional[str] = Field(None, description="MIME type of the file, e.g. image/png")

class FileContent(FileBase): 
    content: bytes = Field(..., description="Content of the file in base64") 
    

class FolderCreate(BaseModel):
    name: str = Field(..., max_length=255, description="Name of the folder")
    description: Optional[str] = Field(None, max_length=255, description="Optional description of the folder")
    path: str = Field("/", description="Path where the folder is created, e.g. /my_folder/")

class FileCreate(FileBase):
    pass


class FileCreateDB(FileBase):
    user_id: int
    url: Optional[str] = None
    cloudinary_public_id: Optional[str] = None
    size: Optional[int] = 0
    format: Optional[str] = None


class FileUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=255)

class FileResponse(FileBase):
    id: int
    user_id: int
    url: Optional[str]
    cloudinary_public_id: Optional[str]
    size: Optional[int]
    format: Optional[str]
    mime_type: Optional[str]

    created_at: datetime
    updated_at: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True)