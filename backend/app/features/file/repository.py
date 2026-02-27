"""
File repository.
Implements database operations for files.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.common.repositories import BaseRepository
from app.features.file.model import File


class FileRepository(BaseRepository[File]):
    """File repository with custom methods."""
    
    def __init__(self, db: AsyncSession):
        super().__init__(File, db)

    # upload file to cloudinary
    def upload_file(self, file: File) -> File: 
        pass