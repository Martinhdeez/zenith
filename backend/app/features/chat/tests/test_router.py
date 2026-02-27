import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash
from app.features.user.repository import UserRepository
from app.features.challenge.repository import ChallengeRepository, LanguageRepository

@pytest.fixture
async def test_client(db_session: AsyncSession):
    """Create test client with overridden database dependency."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


@pytest.fixture
async def auth_headers(db_session: AsyncSession):
    """Create an authenticated user and return auth headers + user."""
    repo = UserRepository(db_session)
    user = await repo.create({
        "email": "chatuser@example.com",
        "username": "chatuser",
        "hashed_password": get_password_hash("password123"),
        "is_active": True,
    })
    token = create_access_token(data={"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}, user

@pytest.fixture
async def seed_language(db_session: AsyncSession):
    """Seed a test language."""
    repo = LanguageRepository(db_session)
    language = await repo.create({"name": "ChatTestLang"})
    return language


@pytest.fixture
async def seed_challenge(db_session: AsyncSession, seed_language, auth_headers):
    """Seed a test challenge for chat testing."""
    headers, user = auth_headers
    repo = ChallengeRepository(db_session)
    challenge = await repo.create({
        "title": "Chat Test Challenge",
        "description": "Challenge for testing chat features.",
        "difficulty": "Easy",
        "estimated_time": "10 min",
        "language_id": seed_language.id,
        "creator_id": user.id,
    })
    return challenge


@pytest.mark.asyncio
async def test_create_message(test_client: AsyncClient, auth_headers, seed_challenge):
    """Test creating a message in a challenge forum."""
    headers, user = auth_headers

    response = await test_client.post(
        f"/api/chat/challenges/{seed_challenge.id}",
        headers=headers,
        json={"content": "Can someone help me understand the optimal approach?"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["content"] == "Can someone help me understand the optimal approach?"
    assert data["challenge_id"] == seed_challenge.id
    assert data["user_id"] == user.id
    assert data["username"] == user.username
    assert "id" in data


@pytest.mark.asyncio
async def test_create_message_unauthorized(test_client: AsyncClient, seed_challenge):
    """Test creating a message without auth fails."""
    response = await test_client.post(
        f"/api/chat/challenges/{seed_challenge.id}",
        json={"content": "I am not logged in"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_messages(test_client: AsyncClient, auth_headers, seed_challenge):
    """Test getting message history for a challenge."""
    headers, _ = auth_headers

    # Post a couple of messages
    await test_client.post(
        f"/api/chat/challenges/{seed_challenge.id}",
        headers=headers,
        json={"content": "First message"},
    )
    await test_client.post(
        f"/api/chat/challenges/{seed_challenge.id}",
        headers=headers,
        json={"content": "Second message"},
    )

    # Get them
    response = await test_client.get(f"/api/chat/challenges/{seed_challenge.id}")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["content"] == "First message"
    assert data[1]["content"] == "Second message"
    assert "username" in data[0]
