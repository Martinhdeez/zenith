# SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
# SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
# SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
#
# SPDX-License-Identifier: GPL-3.0-or-later

"""Tests for User repository."""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.user.model import User
from app.features.user.repository import UserRepository
from app.common.exceptions import NotFoundException, AlreadyExistsException


@pytest.mark.asyncio
async def test_create_user(db_session: AsyncSession):
    """Test creating a new user."""
    repo = UserRepository(db_session)
    
    user_data = {
        "email": "test@example.com",
        "username": "testuser",
        "hashed_password": "hashed_password_123",
        "is_active": True
    }
    
    user = await repo.create(user_data)
    
    assert user.id is not None
    assert user.email == "test@example.com"
    assert user.username == "testuser"
    assert user.is_active is True
    assert user.created_at is not None



@pytest.mark.asyncio
async def test_create_duplicate_email(db_session: AsyncSession):
    """Test creating user with duplicate email raises exception."""
    repo = UserRepository(db_session)
    
    user_data = {
        "email": "duplicate@example.com",
        "username": "user1",
        "hashed_password": "hashed_123"
    }
    
    # Create first user
    await repo.create(user_data)
    
    # Try to create user with same email
    user_data["username"] = "user2"
    
    with pytest.raises(AlreadyExistsException):
        await repo.create(user_data)



@pytest.mark.asyncio
async def test_get_user_by_id(db_session: AsyncSession):
    """Test getting user by ID."""
    repo = UserRepository(db_session)
    
    # Create user
    created_user = await repo.create({
        "email": "get@example.com",
        "username": "getuser",
        "hashed_password": "hashed_123"
    })
    
    # Get user
    user = await repo.get(created_user.id)
    
    assert user is not None
    assert user.id == created_user.id
    assert user.email == "get@example.com"



@pytest.mark.asyncio
async def test_get_nonexistent_user(db_session: AsyncSession):
    """Test getting nonexistent user returns None."""
    repo = UserRepository(db_session)
    
    user = await repo.get(99999)
    
    assert user is None



@pytest.mark.asyncio
async def test_get_or_fail_raises_exception(db_session: AsyncSession):
    """Test get_or_fail raises NotFoundException."""
    repo = UserRepository(db_session)
    
    with pytest.raises(NotFoundException) as exc_info:
        await repo.get_or_fail(99999)
    
    assert "not found" in str(exc_info.value.message).lower()



@pytest.mark.asyncio
async def test_get_by_email(db_session: AsyncSession):
    """Test getting user by email."""
    repo = UserRepository(db_session)
    
    await repo.create({
        "email": "email@example.com",
        "username": "emailuser",
        "hashed_password": "hashed_123"
    })
    
    user = await repo.get_by_email("email@example.com")
    
    assert user is not None
    assert user.email == "email@example.com"



@pytest.mark.asyncio
async def test_get_by_username(db_session: AsyncSession):
    """Test getting user by username."""
    repo = UserRepository(db_session)
    
    await repo.create({
        "email": "username@example.com",
        "username": "uniqueuser",
        "hashed_password": "hashed_123"
    })
    
    user = await repo.get_by_username("uniqueuser")
    
    assert user is not None
    assert user.username == "uniqueuser"



@pytest.mark.asyncio
async def test_update_user(db_session: AsyncSession):
    """Test updating user data."""
    repo = UserRepository(db_session)
    
    created_user = await repo.create({
        "email": "update@example.com",
        "username": "updateuser",
        "hashed_password": "hashed_123"
    })
    
    updated_user = await repo.update(created_user.id, {
        "email": "newemail@example.com"
    })
    
    assert updated_user.email == "newemail@example.com"
    assert updated_user.username == "updateuser"  # Unchanged



@pytest.mark.asyncio
async def test_delete_user(db_session: AsyncSession):
    """Test deleting user."""
    repo = UserRepository(db_session)
    
    created_user = await repo.create({
        "email": "delete@example.com",
        "username": "deleteuser",
        "hashed_password": "hashed_123"
    })
    
    deleted = await repo.delete(created_user.id)
    
    assert deleted is True
    
    # Verify user is gone
    user = await repo.get(created_user.id)
    assert user is None



@pytest.mark.asyncio
async def test_count_users(db_session: AsyncSession):
    """Test counting users."""
    repo = UserRepository(db_session)
    
    # Create multiple users
    await repo.create({
        "email": "user1@example.com",
        "username": "user1",
        "hashed_password": "hashed_123",
        "is_active": True
    })
    await repo.create({
        "email": "user2@example.com",
        "username": "user2",
        "hashed_password": "hashed_123",
        "is_active": False
    })
    
    total_count = await repo.count()
    active_count = await repo.count(is_active=True)
    
    assert total_count == 2
    assert active_count == 1
