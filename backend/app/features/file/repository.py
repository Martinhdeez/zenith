# SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
# SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
# SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
#
# SPDX-License-Identifier: GPL-3.0-or-later

"""
File repository.
Implements database operations for files, including search.
"""
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.common.repositories import BaseRepository
from app.features.file.model import File


class FileRepository(BaseRepository[File]):
    """File repository with file-tree navigation and search capabilities."""

    def __init__(self, db: AsyncSession):
        super().__init__(File, db)

    async def get_files_by_path(
        self,
        user_id: int,
        path: str,
        skip: int = 0,
        limit: int = 20,
        category: Optional[str] = None,
    ) -> List[File]:
        query = select(self.model).where(self.model.user_id == user_id)

        if category:
            query = query.where(self.model.file_type == "file")
            # Recursive: include files in this path and all sub-paths
            if path == "/":
                pass  # no path filter needed at root
            else:
                normalized = path.rstrip("/")
                query = query.where(
                    or_(
                        self.model.path == normalized,
                        self.model.path.like(f"{normalized}/%"),
                    )
                )
            if category == "image":
                query = query.where(self.model.mime_type.ilike("image/%"))
            elif category == "video":
                query = query.where(self.model.mime_type.ilike("video/%"))
            elif category == "audio":
                query = query.where(self.model.mime_type.ilike("audio/%"))
            elif category == "document":
                query = query.where(
                    or_(
                        self.model.mime_type.ilike("text/%"),
                        self.model.mime_type == "application/pdf",
                        self.model.mime_type.ilike("application/vnd.ms-%"),
                        self.model.mime_type.ilike("application/vnd.openxmlformats-officedocument%"),
                    )
                )
        else:
            query = query.where(self.model.path == path)

        query = query.order_by(self.model.file_type.asc(), self.model.name.asc()).offset(skip)
        
        query = query.limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_all_files(
        self,
        user_id: int,
        skip: int = 0,
        limit: int = 50,
        category: Optional[str] = None,
        mime_type: Optional[str] = None,
    ) -> List[File]:
        query = select(self.model).where(self.model.user_id == user_id).where(self.model.file_type == "file")

        if category:
            if category == "image":
                query = query.where(self.model.mime_type.ilike("image/%"))
            elif category == "video":
                query = query.where(self.model.mime_type.ilike("video/%"))
            elif category == "audio":
                query = query.where(self.model.mime_type.ilike("audio/%"))
            elif category == "document":
                query = query.where(
                    or_(
                        self.model.mime_type.ilike("text/%"),
                        self.model.mime_type == "application/pdf",
                        self.model.mime_type.ilike("application/vnd.ms-%"),
                        self.model.mime_type.ilike("application/vnd.openxmlformats-officedocument%"),
                    )
                )
        
        if mime_type:
            if "%" in mime_type or "*" in mime_type:
                query = query.where(self.model.mime_type.ilike(mime_type.replace("*", "%")))
            else:
                query = query.where(self.model.mime_type == mime_type)

        query = query.order_by(self.model.name.asc()).offset(skip)
        query = query.limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def search_by_name(
        self, user_id: int, query: str, skip: int = 0, limit: int = 20,
        base_path: str = "/",
    ) -> List[File]:
        """Search files by name or summary using case-insensitive ILIKE matching, scoped to base_path recursively."""
        stmt = (
            select(self.model)
            .where(self.model.user_id == user_id)
            .where(
                or_(
                    self.model.name.ilike(f"%{query}%"),
                    self.model.summary.ilike(f"%{query}%")
                )
            )
        )
        # Scope to current subtree
        if base_path != "/":
            normalized = base_path.rstrip("/")
            stmt = stmt.where(
                or_(
                    self.model.path == normalized,
                    self.model.path.like(f"{normalized}/%"),
                )
            )
        stmt = stmt.order_by(self.model.name.asc()).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_file_by_public_id(self, public_id: str) -> Optional[File]:
        """Get a file by its Cloudinary public ID."""
        return await self.get_by_field("cloudinary_public_id", public_id)

    async def get_user_folders(self, user_id: int) -> List[str]:
        """Return distinct folder paths owned by the user (directories only)."""
        stmt_dirs = (
            select(self.model.name, self.model.path)
            .where(self.model.user_id == user_id)
            .where(self.model.file_type == "dir")
        )
        dirs_result = await self.db.execute(stmt_dirs)
        folder_paths: set[str] = set()
        for name, path in dirs_result.all():
            full = f"{path.rstrip('/')}/{name}" if path != "/" else f"/{name}"
            folder_paths.add(full)
        return sorted(folder_paths)

    async def get_recent_files(
        self, user_id: int, limit: int = 10
    ) -> List[File]:
        """Return the N most recently created files for a user."""
        stmt = (
            select(self.model)
            .where(self.model.user_id == user_id)
            .where(self.model.file_type == "file")
            .order_by(self.model.created_at.desc(), self.model.id.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_folder_by_name_and_path(self, user_id: int, name: str, path: str) -> Optional[File]:
        """Check if a specific folder already exists in a given path."""
        stmt = (
            select(self.model)
            .where(self.model.user_id == user_id)
            .where(self.model.name == name)
            .where(self.model.path == path)
            .where(self.model.file_type == "dir")
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_file_by_full_path(self, user_id: int, full_path: str) -> Optional[File]:
        """Find a file or folder by its absolute full path."""
        if full_path == "/":
            return None
        
        # Normalize: strip trailing slash except for root
        normalized = full_path.rstrip("/") if full_path != "/" else "/"
        
        if "/" not in normalized.strip("/"):
            parent_path = "/"
            name = normalized.strip("/")
        else:
            parts = normalized.strip("/").split("/")
            name = parts[-1]
            parent_path = "/" + "/".join(parts[:-1])
            
        stmt = (
            select(self.model)
            .where(self.model.user_id == user_id)
            .where(self.model.path == parent_path)
            .where(self.model.name == name)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()