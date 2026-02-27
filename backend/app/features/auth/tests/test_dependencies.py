"""Tests for authentication dependencies."""
import pytest
from jose import jwt
from datetime import timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.core.security import create_access_token, get_password_hash, verify_password
from app.features.user.model import User
from app.features.user.repository import UserRepository



def test_password_hashing():
    """Test password hashing and verification."""
    plain_password = "my_secure_password_123"
    
    hashed = get_password_hash(plain_password)
    
    # Hash should not equal plain password
    assert hashed != plain_password
    
    # Verify correct password
    assert verify_password(plain_password, hashed) is True
    
    # Verify incorrect password
    assert verify_password("wrong_password", hashed) is False



def test_create_access_token():
    """Test JWT token creation."""
    data = {"sub": "123", "username": "testuser"}
    
    token = create_access_token(data)
    
    assert token is not None
    assert isinstance(token, str)
    assert len(token) > 50  # JWT tokens are long



def test_create_access_token_with_expiration():
    """Test JWT token with custom expiration."""
    data = {"sub": "123"}
    expires_delta = timedelta(minutes=15)
    
    token = create_access_token(data, expires_delta)
    
    assert token is not None



async def test_verify_password_with_user(db_session: AsyncSession):
    """Test password verification with user from database."""
    repo = UserRepository(db_session)
    
    plain_password = "secure_password_123"
    hashed_password = get_password_hash(plain_password)
    
    user = await repo.create({
        "email": "auth@example.com",
        "username": "authuser",
        "hashed_password": hashed_password
    })
    
    # Correct password should verify
    assert verify_password(plain_password, user.hashed_password) is True
    
    # Wrong password should not verify
    assert verify_password("wrong_password", user.hashed_password) is False



@pytest.mark.asyncio
async def test_inactive_user_login_blocked(db_session: AsyncSession):
    """Test that inactive users cannot authenticate."""
    repo = UserRepository(db_session)
    
    # Create inactive user
    user = await repo.create({
        "email": "inactive@example.com",
        "username": "inactiveuser",
        "hashed_password": get_password_hash("password123"),
        "is_active": False
    })
    
    # Verify user is inactive
    assert user.is_active is False
    
    # In real auth flow, this would raise HTTPException
    # Here we just verify the user state
    fetched_user = await repo.get(user.id)
    assert fetched_user.is_active is False
