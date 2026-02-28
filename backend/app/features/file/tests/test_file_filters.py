"""
Tests for File type filtering.
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
        "email": "test_filter_fijo@zenith.com",
        "username": "test_filter_fijo",
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
async def test_filter_by_category(test_client, auth_headers, test_user, db_session):
    """Test filtering files by category (image, video, audio, document)."""
    # Seed files of different types
    files_to_seed = [
        File(user_id=test_user.id, name="img1.png", path="/", file_type="file", mime_type="image/png"),
        File(user_id=test_user.id, name="vid1.mp4", path="/", file_type="file", mime_type="video/mp4"),
        File(user_id=test_user.id, name="aud1.mp3", path="/", file_type="file", mime_type="audio/mpeg"),
        File(user_id=test_user.id, name="doc1.pdf", path="/", file_type="file", mime_type="application/pdf"),
        File(user_id=test_user.id, name="txt1.txt", path="/", file_type="file", mime_type="text/plain"),
        File(user_id=test_user.id, name="folder1", path="/", file_type="dir", mime_type=None),
    ]
    for f in files_to_seed:
        db_session.add(f)
    await db_session.flush()

    # Test Image filter
    resp = await test_client.get("/api/files/?category=image", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["name"] == "img1.png"

    # Test Video filter
    resp = await test_client.get("/api/files/?category=video", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["name"] == "vid1.mp4"

    # Test Audio filter
    resp = await test_client.get("/api/files/?category=audio", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["name"] == "aud1.mp3"

    # Test Document filter (should return both PDF and text)
    resp = await test_client.get("/api/files/?category=document", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    names = [f["name"] for f in data]
    assert "doc1.pdf" in names
    assert "txt1.txt" in names

    # Verify directories are excluded
    for cat in ["image", "video", "audio", "document"]:
        resp = await test_client.get(f"/api/files/?category={cat}", headers=auth_headers)
        data = resp.json()
        assert all(f["file_type"] == "file" for f in data)
