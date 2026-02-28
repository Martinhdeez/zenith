# SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
# SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
# SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
#
# SPDX-License-Identifier: GPL-3.0-or-later

"""
Base Repository with generic CRUD operations.
All operations are async and handle exceptions consistently.
"""
import logging
from typing import TypeVar, Generic, Type, Optional, List, Dict, Any
from sqlalchemy import select, update, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy.orm import DeclarativeBase

from app.common.exceptions import (
    NotFoundException,
    DatabaseException,
    AlreadyExistsException
)

ModelType = TypeVar("ModelType", bound=DeclarativeBase)
logger = logging.getLogger(__name__)


class BaseRepository(Generic[ModelType]):
    """
    Base repository with generic CRUD operations.
    Type Parameters: ModelType - The SQLAlchemy model this repository handles
    """
    
    def __init__(self, model: Type[ModelType], db: AsyncSession):
        self.model = model
        self.db = db
        self._model_name = model.__name__
    
    async def create(self, data: Dict[str, Any]) -> ModelType:
        """Create a new record."""
        try:
            db_obj = self.model(**data)
            self.db.add(db_obj)
            await self.db.commit()
            await self.db.refresh(db_obj)
            logger.info(f"Created {self._model_name} with ID: {db_obj.id}")
            return db_obj
        except IntegrityError as e:
            await self.db.rollback()
            logger.error(f"Integrity error creating {self._model_name}: {str(e)}")
            raise AlreadyExistsException(
                f"{self._model_name} with this data already exists",
                details={"error": str(e.orig)}
            )
        except SQLAlchemyError as e:
            await self.db.rollback()
            logger.error(f"Database error creating {self._model_name}: {str(e)}")
            raise DatabaseException(
                f"Error creating {self._model_name}",
                details={"error": str(e)}
            )
    
    async def get(self, id: int) -> Optional[ModelType]:
        """Get a record by ID, returns None if not found."""
        try:
            result = await self.db.execute(
                select(self.model).where(self.model.id == id)
            )
            obj = result.scalar_one_or_none()
            if obj:
                logger.debug(f"Found {self._model_name} with ID: {id}")
            return obj
        except SQLAlchemyError as e:
            logger.error(f"Database error getting {self._model_name}: {str(e)}")
            raise DatabaseException(
                f"Error getting {self._model_name}",
                details={"error": str(e)}
            )
    
    async def get_or_fail(self, id: int) -> ModelType:
        """Get a record by ID or raise NotFoundException."""
        obj = await self.get(id)
        if not obj:
            raise NotFoundException(f"{self._model_name} with ID {id} not found")
        return obj
    
    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        order_by: Optional[str] = None,
        desc: bool = False
    ) -> List[ModelType]:
        """Get all records with pagination and ordering."""
        try:
            query = select(self.model)
            
            if order_by:
                column = getattr(self.model, order_by, None)
                if column is not None:
                    query = query.order_by(column.desc() if desc else column)
            
            query = query.offset(skip).limit(limit)
            result = await self.db.execute(query)
            objects = list(result.scalars().all())
            logger.debug(f"Retrieved {len(objects)} {self._model_name} objects")
            return objects
        except SQLAlchemyError as e:
            logger.error(f"Database error getting all {self._model_name}: {str(e)}")
            raise DatabaseException(
                f"Error getting {self._model_name}",
                details={"error": str(e)}
            )
    
    async def get_by_field(self, field: str, value: Any) -> Optional[ModelType]:
        """Get a record by a specific field."""
        try:
            column = getattr(self.model, field, None)
            if column is None:
                raise ValueError(f"Field '{field}' doesn't exist in {self._model_name}")
            
            result = await self.db.execute(
                select(self.model).where(column == value)
            )
            return result.scalar_one_or_none()
        except SQLAlchemyError as e:
            logger.error(f"Database error getting {self._model_name} by {field}: {str(e)}")
            raise DatabaseException(
                f"Error searching {self._model_name}",
                details={"error": str(e)}
            )
    
    async def update(
        self,
        id: int,
        data: Dict[str, Any],
        partial: bool = True
    ) -> ModelType:
        """Update a record. Set partial=False to require all fields."""
        await self.get_or_fail(id)
        
        try:
            if partial:
                data = {k: v for k, v in data.items() if v is not None}
            
            await self.db.execute(
                update(self.model)
                .where(self.model.id == id)
                .values(**data)
            )
            await self.db.commit()
            
            updated_obj = await self.get(id)
            logger.info(f"Updated {self._model_name} with ID: {id}")
            return updated_obj
        except IntegrityError as e:
            await self.db.rollback()
            logger.error(f"Integrity error updating {self._model_name}: {str(e)}")
            raise AlreadyExistsException(
                f"{self._model_name} with this data already exists",
                details={"error": str(e.orig)}
            )
        except SQLAlchemyError as e:
            await self.db.rollback()
            logger.error(f"Database error updating {self._model_name}: {str(e)}")
            raise DatabaseException(
                f"Error updating {self._model_name}",
                details={"error": str(e)}
            )
    
    async def delete(self, id: int) -> bool:
        """Delete a record. Returns True if deleted, False if not found."""
        try:
            result = await self.db.execute(
                delete(self.model).where(self.model.id == id)
            )
            await self.db.commit()
            
            deleted = result.rowcount > 0
            if deleted:
                logger.info(f"Deleted {self._model_name} with ID: {id}")
            return deleted
        except SQLAlchemyError as e:
            await self.db.rollback()
            logger.error(f"Database error deleting {self._model_name}: {str(e)}")
            raise DatabaseException(
                f"Error deleting {self._model_name}",
                details={"error": str(e)}
            )
    
    async def count(self, **filters) -> int:
        """Count records with optional filters (field=value)."""
        try:
            query = select(func.count()).select_from(self.model)
            
            for field, value in filters.items():
                column = getattr(self.model, field, None)
                if column is not None:
                    query = query.where(column == value)
            
            result = await self.db.execute(query)
            count = result.scalar()
            logger.debug(f"Count {self._model_name}: {count}")
            return count
        except SQLAlchemyError as e:
            logger.error(f"Database error counting {self._model_name}: {str(e)}")
            raise DatabaseException(
                f"Error counting {self._model_name}",
                details={"error": str(e)}
            )
    
    async def exists(self, id: int) -> bool:
        """Check if a record exists."""
        obj = await self.get(id)
        return obj is not None
    
    async def bulk_create(self, data_list: List[Dict[str, Any]]) -> List[ModelType]:
        """Create multiple records in a single transaction."""
        try:
            db_objects = [self.model(**data) for data in data_list]
            self.db.add_all(db_objects)
            await self.db.commit()
            
            for obj in db_objects:
                await self.db.refresh(obj)
            
            logger.info(f"Bulk created {len(db_objects)} {self._model_name} objects")
            return db_objects
        except SQLAlchemyError as e:
            await self.db.rollback()
            logger.error(f"Database error bulk creating {self._model_name}: {str(e)}")
            raise DatabaseException(
                f"Error creating multiple {self._model_name}",
                details={"error": str(e)}
            )
