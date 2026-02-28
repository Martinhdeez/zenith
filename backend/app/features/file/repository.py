from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.common.repositories import BaseRepository
from app.features.file.model import File


class FileRepository(BaseRepository[File]):
    def __init__(self, db: AsyncSession):
        super().__init__(File, db)

    async def get_files_by_path(self, user_id: int, path: str, skip: int = 0, limit: int = 20) -> List[File]:
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
    
    async def get_file_by_public_id(self, public_id: str) -> Optional[File]:
        return await self.get_by_field("cloudinary_public_id", public_id)