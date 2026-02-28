"""Tests for Auth router endpoints."""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.core.database import get_db
from app.core.security import get_password_hash
from app.features.user.repository import UserRepository


@pytest.fixture
async def test_client(db_session: AsyncSession):
    """Create test client with overridden database dependency."""
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client
    
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_login_with_username(test_client: AsyncClient, db_session: AsyncSession):
    """Test login with username and password."""
    repo = UserRepository(db_session)
    
    # Create user
    await repo.create({
        "email": "testuser@example.com",
        "username": "testuser",
        "hashed_password": get_password_hash("password123"),
        "is_active": True
    })
    
    # Login with username
    response = await test_client.post("/api/auth/token", data={
        "username": "testuser",
        "password": "password123"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert len(data["access_token"]) > 0


@pytest.mark.asyncio
async def test_login_with_email(test_client: AsyncClient, db_session: AsyncSession):
    """Test login with email instead of username."""
    repo = UserRepository(db_session)
    
    # Create user
    await repo.create({
        "email": "emailuser@example.com",
        "username": "emailuser",
        "hashed_password": get_password_hash("password123"),
        "is_active": True
    })
    
    # Login with email
    response = await test_client.post("/api/auth/token", data={
        "username": "emailuser@example.com",  # OAuth2 form uses "username" field
        "password": "password123"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_with_invalid_password(test_client: AsyncClient, db_session: AsyncSession):
    """Test login fails with incorrect password."""
    repo = UserRepository(db_session)
    
    # Create user
    await repo.create({
        "email": "user@example.com",
        "username": "user",
        "hashed_password": get_password_hash("correctpassword"),
        "is_active": True
    })
    
    # Try login with wrong password
    response = await test_client.post("/api/auth/token", data={
        "username": "user",
        "password": "wrongpassword"
    })
    
    assert response.status_code == 401
    assert "incorrect" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_with_nonexistent_user(test_client: AsyncClient):
    """Test login fails with non-existent user."""
    response = await test_client.post("/api/auth/token", data={
        "username": "nonexistent",
        "password": "password123"
    })
    
    assert response.status_code == 401
    assert "incorrect" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_with_inactive_user(test_client: AsyncClient, db_session: AsyncSession):
    """Test login fails with inactive user account."""
    repo = UserRepository(db_session)
    
    # Create inactive user
    await repo.create({
        "email": "inactive@example.com",
        "username": "inactive",
        "hashed_password": get_password_hash("password123"),
        "is_active": False
    })
    
    # Try login
    response = await test_client.post("/api/auth/token", data={
        "username": "inactive",
        "password": "password123"
    })
    
    assert response.status_code == 403
    assert "inactive" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_token_can_be_used(test_client: AsyncClient, db_session: AsyncSession):
    """Test that generated token can be used for authenticated requests."""
    repo = UserRepository(db_session)
    
    # Create user
    user = await repo.create({
        "email": "tokenuser@example.com",
        "username": "tokenuser",
        "hashed_password": get_password_hash("password123"),
        "is_active": True
    })
    
    # Login to get token
    login_response = await test_client.post("/api/auth/token", data={
        "username": "tokenuser",
        "password": "password123"
    })
    
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    
    # Use token to access protected endpoint
    me_response = await test_client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert me_response.status_code == 200
    data = me_response.json()
    assert data["email"] == "tokenuser@example.com"
    assert data["id"] == user.id

    assert me_response.status_code == 200
    data = me_response.json()
    assert data["email"] == "tokenuser@example.com"
    assert data["id"] == user.id
