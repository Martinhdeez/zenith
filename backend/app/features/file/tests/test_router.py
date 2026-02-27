"""Tests for User router endpoints."""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash
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
async def test_register_user(test_client: AsyncClient):
    """Test user registration endpoint."""
    response = await test_client.post("/api/users/", json={
        "email": "newuser@example.com",
        "username": "newuser",
        "password": "securepassword123"
    })
    
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["username"] == "newuser"
    assert data["is_active"] is True
    assert "id" in data
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_register_duplicate_email(test_client: AsyncClient, db_session: AsyncSession):
    """Test registration with duplicate email fails."""
    repo = UserRepository(db_session)
    
    await repo.create({
        "email": "existing@example.com",
        "username": "existinguser",
        "hashed_password": get_password_hash("password123")
    })
    
    response = await test_client.post("/api/users/", json={
        "email": "existing@example.com",
        "username": "newuser",
        "password": "password123"
    })
    
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_get_current_user(test_client: AsyncClient, db_session: AsyncSession):
    """Test getting current authenticated user."""
    repo = UserRepository(db_session)
    
    user = await repo.create({
        "email": "currentuser@example.com",
        "username": "currentuser",
        "hashed_password": get_password_hash("password123"),
        "is_active": True
    })
    
    token = create_access_token(data={"sub": str(user.id)})
    
    response = await test_client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "currentuser@example.com"
    assert data["id"] == user.id


@pytest.mark.asyncio
async def test_get_current_user_unauthorized(test_client: AsyncClient):
    """Test getting current user without token fails."""
    response = await test_client.get("/api/users/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_user_by_id(test_client: AsyncClient, db_session: AsyncSession):
    """Test getting user by ID."""
    repo = UserRepository(db_session)
    
    user1 = await repo.create({
        "email": "user1@example.com",
        "username": "user1",
        "hashed_password": get_password_hash("password123"),
        "is_active": True
    })
    
    user2 = await repo.create({
        "email": "user2@example.com",
        "username": "user2",
        "hashed_password": get_password_hash("password123"),
        "is_active": True
    })
    
    token = create_access_token(data={"sub": str(user1.id)})
    
    response = await test_client.get(
        f"/api/users/{user2.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "user2@example.com"
    assert data["id"] == user2.id


@pytest.mark.asyncio
async def test_search_user_by_email(test_client: AsyncClient, db_session: AsyncSession):
    """Test searching user by email."""
    repo = UserRepository(db_session)
    
    user = await repo.create({
        "email": "search@example.com",
        "username": "searchuser",
        "hashed_password": get_password_hash("password123"),
        "is_active": True
    })
    
    token = create_access_token(data={"sub": str(user.id)})
    
    response = await test_client.get(
        "/api/users/search/email/search@example.com",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "search@example.com"


@pytest.mark.asyncio
async def test_search_user_by_username(test_client: AsyncClient, db_session: AsyncSession):
    """Test searching user by username."""
    repo = UserRepository(db_session)
    
    user = await repo.create({
        "email": "username@example.com",
        "username": "searchname",
        "hashed_password": get_password_hash("password123"),
        "is_active": True
    })
    
    token = create_access_token(data={"sub": str(user.id)})
    
    response = await test_client.get(
        "/api/users/search/username/searchname",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "searchname"


@pytest.mark.asyncio
async def test_update_own_user(test_client: AsyncClient, db_session: AsyncSession):
    """Test user can update their own profile."""
    repo = UserRepository(db_session)
    
    user = await repo.create({
        "email": "update@example.com",
        "username": "updateuser",
        "hashed_password": get_password_hash("password123"),
        "is_active": True
    })
    
    token = create_access_token(data={"sub": str(user.id)})
    
    response = await test_client.put(
        f"/api/users/{user.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"email": "newemail@example.com"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "newemail@example.com"
    assert data["username"] == "updateuser"


@pytest.mark.asyncio
async def test_update_other_user_forbidden(test_client: AsyncClient, db_session: AsyncSession):
    """Test user cannot update another user's profile."""
    repo = UserRepository(db_session)
    
    user1 = await repo.create({
        "email": "user1@example.com",
        "username": "user1",
        "hashed_password": get_password_hash("password123"),
        "is_active": True
    })
    
    user2 = await repo.create({
        "email": "user2@example.com",
        "username": "user2",
        "hashed_password": get_password_hash("password123"),
        "is_active": True
    })
    
    token = create_access_token(data={"sub": str(user1.id)})
    
    response = await test_client.put(
        f"/api/users/{user2.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"email": "hacked@example.com"}
    )
    
    assert response.status_code == 403
    assert "your own" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_delete_own_user(test_client: AsyncClient, db_session: AsyncSession):
    """Test user can delete their own account."""
    repo = UserRepository(db_session)
    
    user = await repo.create({
        "email": "delete@example.com",
        "username": "deleteuser",
        "hashed_password": get_password_hash("password123"),
        "is_active": True
    })
    
    token = create_access_token(data={"sub": str(user.id)})
    
    response = await test_client.delete(
        f"/api/users/{user.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 204
    
    # Verify user is deleted
    deleted_user = await repo.get(user.id)
    assert deleted_user is None


@pytest.mark.asyncio
async def test_delete_other_user_forbidden(test_client: AsyncClient, db_session: AsyncSession):
    """Test user cannot delete another user's account."""
    repo = UserRepository(db_session)
    
    user1 = await repo.create({
        "email": "user1@example.com",
        "username": "user1",
        "hashed_password": get_password_hash("password123"),
        "is_active": True
    })
    
    user2 = await repo.create({
        "email": "user2@example.com",
        "username": "user2",
        "hashed_password": get_password_hash("password123"),
        "is_active": True
    })
    
    token = create_access_token(data={"sub": str(user1.id)})
    
    response = await test_client.delete(
        f"/api/users/{user2.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 403
