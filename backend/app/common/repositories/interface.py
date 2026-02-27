"""
Repository Protocol - Interface definition for all repositories.
Uses Python Protocol for structural typing (similar to TypeScript interfaces).
"""
from typing import Protocol, TypeVar, Generic, Optional, List, Dict, Any, runtime_checkable

ModelType = TypeVar("ModelType", contravariant=False)


@runtime_checkable
class IRepository(Protocol[ModelType]):
    
    async def create(self, data: Dict[str, Any]) -> ModelType:
        """Create a new record."""
        ...
    
    async def get(self, id: int) -> Optional[ModelType]:
        """Get a record by ID, returns None if not found."""
        ...
    
    async def get_or_fail(self, id: int) -> ModelType:
        """Get a record by ID or raise NotFoundException."""
        ...
    
    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        order_by: Optional[str] = None,
        desc: bool = False
    ) -> List[ModelType]:
        """Get all records with pagination and ordering."""
        ...
    
    async def get_by_field(self, field: str, value: Any) -> Optional[ModelType]:
        """Get a record by a specific field."""
        ...
    
    async def update(
        self,
        id: int,
        data: Dict[str, Any],
        partial: bool = True
    ) -> ModelType:
        """Update a record. Set partial=False to require all fields."""
        ...
    
    async def delete(self, id: int) -> bool:
        """Delete a record. Returns True if deleted, False if not found."""
        ...
    
    async def count(self, **filters) -> int:
        """Count records with optional filters (field=value)."""
        ...
    
    async def exists(self, id: int) -> bool:
        """Check if a record exists."""
        ...
    
    async def bulk_create(self, data_list: List[Dict[str, Any]]) -> List[ModelType]:
        """Create multiple records in a single transaction."""
        ...
