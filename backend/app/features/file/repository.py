"""
File repository.
Implements database operations for files, including search.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.common.repositories import BaseRepository
from app.features.file.model import File


class FileRepository(BaseRepository[File]):
    """File repository with file-tree navigation and search capabilities."""

    def __init__(self, db: AsyncSession):
        super().__init__(File, db)

    async def get_files_by_path(
        self, user_id: int, path: str, skip: int = 0, limit: int = 20
    ) -> List[File]:
        """List files in a directory path (file-tree style)."""
        query = (
            select(self.model)
            .where(self.model.user_id == user_id)
            .where(self.model.path == path)
            .order_by(self.model.file_type.asc(), self.model.name.asc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def search_by_name(
        self, user_id: int, query: str, skip: int = 0, limit: int = 20
    ) -> List[File]:
        """Search files by name using case-insensitive ILIKE matching."""
        stmt = (
            select(self.model)
            .where(self.model.user_id == user_id)
            .where(self.model.name.ilike(f"%{query}%"))
            .order_by(self.model.name.asc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_file_by_public_id(self, public_id: str) -> Optional[File]:
        """Get a file by its Cloudinary public ID."""
        return await self.get_by_field("cloudinary_public_id", public_id)

    async def get_user_folders(self, user_id: int) -> List[str]:
        """Return distinct folder paths owned by the user (directories only)."""
        stmt = (
            select(self.model.path)
            .where(self.model.user_id == user_id)
            .where(self.model.file_type == "dir")
            .distinct()
        )
        result = await self.db.execute(stmt)
        # Collect both the dir's own path AND its name as a "virtual path"
        # e.g. a dir named "Photos" at path "/" → "/Photos"
        folder_paths: set[str] = set()

        stmt_dirs = (
            select(self.model.name, self.model.path)
            .where(self.model.user_id == user_id)
            .where(self.model.file_type == "dir")
        )
        dirs_result = await self.db.execute(stmt_dirs)
        for name, path in dirs_result.all():
            full = f"{path.rstrip('/')}/{name}" if path != "/" else f"/{name}"
            folder_paths.add(full)

        return sorted(folder_paths)