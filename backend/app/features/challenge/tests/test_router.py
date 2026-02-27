"""Tests for Challenge router endpoints."""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash
from app.features.user.repository import UserRepository
from app.features.challenge.repository import (
    ChallengeRepository,
    LanguageRepository,
    ChallengeAnswerRepository,
)


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
        "email": "challenger@example.com",
        "username": "challenger",
        "hashed_password": get_password_hash("password123"),
        "is_active": True,
    })
    token = create_access_token(data={"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}, user


@pytest.fixture
async def seed_language(db_session: AsyncSession):
    """Seed a test language."""
    repo = LanguageRepository(db_session)
    lang = await repo.create({"name": "Python"})
    return lang


@pytest.fixture
async def seed_challenge(db_session: AsyncSession, seed_language, auth_headers):
    """Seed a test challenge."""
    headers, user = auth_headers
    repo = ChallengeRepository(db_session)
    challenge = await repo.create({
        "title": "Two Sum",
        "description": "Find two numbers that add up to target.",
        "difficulty": "Easy",
        "estimated_time": "20 min",
        "solutions": ["def two_sum(nums, target): ..."],
        "language_id": seed_language.id,
        "creator_id": user.id,
    })
    return challenge


# ─── Language Tests ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_languages(test_client: AsyncClient, seed_language):
    """Test listing available languages."""
    response = await test_client.get("/api/languages/")

    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["name"] == "Python"


# ─── Challenge CRUD Tests ────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_challenge(test_client: AsyncClient, auth_headers, seed_language):
    """Test creating a new challenge."""
    headers, _ = auth_headers

    response = await test_client.post("/api/challenges/", headers=headers, json={
        "title": "Count Islands",
        "description": "Count connected components in a grid.",
        "difficulty": "Easy",
        "estimated_time": "25 min",
        "solutions": ["def count_islands(grid): ..."],
        "language_id": seed_language.id,
    })

    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Count Islands"
    assert data["difficulty"] == "Easy"
    assert data["language"]["name"] == "Python"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_challenge_unauthorized(test_client: AsyncClient, seed_language):
    """Test creating a challenge without auth fails."""
    response = await test_client.post("/api/challenges/", json={
        "title": "Test",
        "description": "Test",
        "difficulty": "Easy",
        "language_id": seed_language.id,
    })

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_challenges(test_client: AsyncClient, seed_challenge):
    """Test listing challenges."""
    response = await test_client.get("/api/challenges/")

    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["title"] == "Two Sum"


@pytest.mark.asyncio
async def test_list_challenges_filter_difficulty(test_client: AsyncClient, seed_challenge):
    """Test filtering challenges by difficulty."""
    response = await test_client.get("/api/challenges/?difficulty=Easy")
    assert response.status_code == 200
    data = response.json()
    assert all(c["difficulty"] == "Easy" for c in data)

    response = await test_client.get("/api/challenges/?difficulty=Hard")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 0


@pytest.mark.asyncio
async def test_list_challenges_search(test_client: AsyncClient, seed_challenge):
    """Test searching challenges."""
    response = await test_client.get("/api/challenges/?search=two%20sum")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1

    response = await test_client.get("/api/challenges/?search=nonexistent")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 0


@pytest.mark.asyncio
async def test_get_challenge_by_id(test_client: AsyncClient, seed_challenge):
    """Test getting a challenge by ID."""
    response = await test_client.get(f"/api/challenges/{seed_challenge.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == seed_challenge.id
    assert data["title"] == "Two Sum"
    assert "solutions" in data  # Full detail includes solutions


@pytest.mark.asyncio
async def test_get_challenge_not_found(test_client: AsyncClient):
    """Test getting a non-existent challenge."""
    response = await test_client.get("/api/challenges/99999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_challenge(test_client: AsyncClient, auth_headers, seed_challenge):
    """Test updating a challenge."""
    headers, _ = auth_headers

    response = await test_client.put(
        f"/api/challenges/{seed_challenge.id}",
        headers=headers,
        json={"title": "Two Sum v2", "difficulty": "Medium"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Two Sum v2"
    assert data["difficulty"] == "Medium"


@pytest.mark.asyncio
async def test_delete_challenge(test_client: AsyncClient, auth_headers, seed_challenge):
    """Test deleting a challenge."""
    headers, _ = auth_headers

    response = await test_client.delete(
        f"/api/challenges/{seed_challenge.id}",
        headers=headers,
    )
    assert response.status_code == 204

    # Verify it's gone
    response = await test_client.get(f"/api/challenges/{seed_challenge.id}")
    assert response.status_code == 404


# ─── Submission Tests ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_submit_answer(test_client: AsyncClient, auth_headers, seed_challenge, seed_language):
    """Test submitting an answer to a challenge."""
    headers, _ = auth_headers

    response = await test_client.post(
        f"/api/challenges/{seed_challenge.id}/submit",
        headers=headers,
        json={
            "code": "def two_sum(nums, target): return [0, 1]",
            "language_id": seed_language.id,
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["challenge_id"] == seed_challenge.id
    assert data["succeed"] is True
    assert "code" in data


@pytest.mark.asyncio
async def test_submit_answer_unauthorized(test_client: AsyncClient, seed_challenge, seed_language):
    """Test submitting without auth fails."""
    response = await test_client.post(
        f"/api/challenges/{seed_challenge.id}/submit",
        json={
            "code": "print('hello')",
            "language_id": seed_language.id,
        },
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_my_submissions(test_client: AsyncClient, auth_headers, seed_challenge, seed_language):
    """Test getting my submissions for a challenge."""
    headers, user = auth_headers

    # Submit first
    await test_client.post(
        f"/api/challenges/{seed_challenge.id}/submit",
        headers=headers,
        json={"code": "solution_1()", "language_id": seed_language.id},
    )

    response = await test_client.get(
        f"/api/challenges/{seed_challenge.id}/submissions",
        headers=headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["user_id"] == user.id


# ─── Ranking Tests ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_ranking(test_client: AsyncClient, auth_headers, seed_challenge, seed_language):
    """Test getting ranking for a challenge."""
    headers, _ = auth_headers

    # Submit an answer first
    await test_client.post(
        f"/api/challenges/{seed_challenge.id}/submit",
        headers=headers,
        json={"code": "fast_solution()", "language_id": seed_language.id},
    )

    response = await test_client.get(f"/api/challenges/{seed_challenge.id}/ranking")

    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["position"] == 1
    assert "username" in data[0]
    assert "compile_time" in data[0]


@pytest.mark.asyncio
async def test_get_ranking_empty(test_client: AsyncClient, seed_challenge):
    """Test ranking for a challenge with no submissions."""
    response = await test_client.get(f"/api/challenges/{seed_challenge.id}/ranking")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 0
