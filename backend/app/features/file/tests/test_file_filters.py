"""
Tests for File type filtering (Global vs Path-based).
"""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.main import app
from app.core.database import get_db
from app.core.security import create_access_token
from app.features.user.repository import UserRepository
from app.features.file.model import File

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
async def test_user(db_session: AsyncSession):
    """Create a user for testing."""
    repo = UserRepository(db_session)
    user = await repo.create({
        "email": "test_filter_final@zenith.com",
        "username": "test_filter_final",
        "hashed_password": "hashed_password_123",
        "is_active": True
    })
    return user

@pytest.fixture
def auth_headers(test_user):
    """Generate auth headers for test user."""
    token = create_access_token(data={"sub": str(test_user.id)})
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.asyncio
async def test_filter_by_category_global(test_client, auth_headers, test_user, db_session):
    """Test filtering files by category using the global /all endpoint."""
    # Seed files in different paths
    files_to_seed = [
        File(user_id=test_user.id, name="img1.png", path="/", file_type="file", mime_type="image/png"),
        File(user_id=test_user.id, name="vid1.mp4", path="/sub", file_type="file", mime_type="video/mp4"),
        File(user_id=test_user.id, name="doc1.pdf", path="/other", file_type="file", mime_type="application/pdf"),
    ]
    for f in files_to_seed:
        db_session.add(f)
    await db_session.flush()

    # Test Image filter (global)
    resp = await test_client.get("/api/files/all?category=image", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["name"] == "img1.png"

    # Test Video filter (global - even if in /sub)
    resp = await test_client.get("/api/files/all?category=video", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["name"] == "vid1.mp4"

@pytest.mark.asyncio
async def test_filter_by_specific_mime_type_global(test_client, auth_headers, test_user, db_session):
    """Test filtering by specific MIME type with wildcards using /all."""
    # Seed files
    files_to_seed = [
        File(user_id=test_user.id, name="script.py", path="/", file_type="file", mime_type="text/x-python"),
        File(user_id=test_user.id, name="readme.md", path="/sub", file_type="file", mime_type="text/markdown"),
    ]
    for f in files_to_seed:
        db_session.add(f)
    await db_session.flush()

    # Test exact match
    resp = await test_client.get("/api/files/all?mime_type=text/x-python", headers=auth_headers)
    data = resp.json()
    assert len(data) == 1
    assert data[0]["name"] == "script.py"

    # Test wildcard match
    resp = await test_client.get("/api/files/all?mime_type=text/*", headers=auth_headers)
    data = resp.json()
    assert len(data) == 2

@pytest.mark.asyncio
async def test_path_navigation_intact(test_client, auth_headers, test_user, db_session):
    """Test that the original / endpoint still respects path hierarchy."""
    # Seed files in different paths
    files_to_seed = [
        File(user_id=test_user.id, name="root.txt", path="/", file_type="file", mime_type="text/plain"),
        File(user_id=test_user.id, name="sub.txt", path="/sub", file_type="file", mime_type="text/plain"),
        File(user_id=test_user.id, name="folder1", path="/", file_type="dir", mime_type=None),
    ]
    for f in files_to_seed:
        db_session.add(f)
    await db_session.flush()

    # GET / should only return root items
    resp = await test_client.get("/api/files/?path=/", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    names = [f["name"] for f in data]
    assert "root.txt" in names
    assert "folder1" in names
    assert "sub.txt" not in names
