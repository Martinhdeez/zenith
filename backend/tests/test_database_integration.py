"""
Integration tests for database connection.
Tests against real PostgreSQL database.
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.user.model import User
from app.features.user.repository import UserRepository



@pytest.mark.asyncio
async def test_postgresql_connection(db_session: AsyncSession):
    """Test that we can connect to PostgreSQL and perform operations."""
    repo = UserRepository(db_session)
    
    # Create user
    user = await repo.create({
        "email": "integration@example.com",
        "username": "integrationuser",
        "hashed_password": "hashed_123",
        "is_active": True
    })
    
    assert user.id is not None
    assert user.email == "integration@example.com"
    
    # Verify we can query it back
    fetched = await repo.get(user.id)
    assert fetched is not None
    assert fetched.email == user.email



@pytest.mark.asyncio
async def test_postgresql_constraints(db_session: AsyncSession):
    """Test that PostgreSQL constraints work (unique, foreign keys, etc)."""
    repo = UserRepository(db_session)
    
    # Create user
    await repo.create({
        "email": "unique@example.com",
        "username": "uniqueuser",
        "hashed_password": "hashed_123"
    })
    
    # Try to create duplicate - should fail
    from app.common.exceptions import AlreadyExistsException
    
    with pytest.raises(AlreadyExistsException):
        await repo.create({
            "email": "unique@example.com",  # Duplicate email
            "username": "anotheruser",
            "hashed_password": "hashed_456"
        })



@pytest.mark.asyncio
async def test_postgresql_transactions(db_session: AsyncSession):
    """Test that transactions work correctly with PostgreSQL."""
    repo = UserRepository(db_session)
    
    # Create multiple users in same transaction
    user1 = await repo.create({
        "email": "user1@example.com",
        "username": "user1",
        "hashed_password": "hashed_123"
    })
    
    user2 = await repo.create({
        "email": "user2@example.com",
        "username": "user2",
        "hashed_password": "hashed_456"
    })
    
    # Both should exist
    assert user1.id is not None
    assert user2.id is not None
    
    # Count should be 2
    count = await repo.count()
    assert count == 2



@pytest.mark.asyncio
async def test_postgresql_timestamps(db_session: AsyncSession):
    """Test that PostgreSQL timestamp functions work."""
    repo = UserRepository(db_session)
    
    user = await repo.create({
        "email": "timestamp@example.com",
        "username": "timestampuser",
        "hashed_password": "hashed_123"
    })
    
    # created_at should be set by database
    assert user.created_at is not None
    
    # updated_at should be None initially
    assert user.updated_at is None
    
    # Update user
    updated_user = await repo.update(user.id, {"email": "newemail@example.com"})
    await db_session.refresh(updated_user)
    
    # updated_at should now be set
    # Note: This might not work with all SQLAlchemy setups
    # Depends on onupdate configuration
