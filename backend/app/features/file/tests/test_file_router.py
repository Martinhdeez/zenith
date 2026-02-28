"""
Tests for File router endpoints.
"""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from unittest.mock import patch, MagicMock

from app.main import app
from app.core.database import get_db
from app.core.security import create_access_token
from app.features.user.repository import UserRepository
from app.features.openai.organizer import PathSuggestion


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
async def admin_user(db_session: AsyncSession):
    """Create an admin user for testing."""
    repo = UserRepository(db_session)
    user = await repo.create({
        "email": "admin@zenith.com",
        "username": "admin",
        "hashed_password": "hashed_password_123",
        "is_active": True
    })
    return user


@pytest.fixture
def auth_headers(admin_user):
    """Generate auth headers for admin user."""
    token = create_access_token(data={"sub": str(admin_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_smart_upload_existing_folder(test_client, auth_headers, admin_user, db_session):
    """Test smart upload into an existing folder."""
    # Seed the folder
    from app.features.file.model import File
    db_session.add(File(name="Facturas", path="/", file_type="dir", user_id=admin_user.id))
    await db_session.flush()
    
    # Mock OpenAI suggestion
    suggestion = PathSuggestion(path="/Facturas", new_folder=False, reason="Clasificación por IA")

    
    # Mock Cloudinary upload
    cloudinary_result = {
        "secure_url": "https://cloudinary.com/test.pdf",
        "public_id": "test_public_id",
        "bytes": 1024,
        "format": "pdf"
    }
    
    with patch("app.features.file.router.suggest_file_path", return_value=suggestion), \
         patch("app.features.file.router.generate_embedding", return_value=[0.1] * 1536), \
         patch("cloudinary.uploader.upload", return_value=cloudinary_result):
        
        # We need a real file content for UploadFile
        files = {"file": ("test.pdf", b"pdf content", "application/pdf")}
        data = {"name": "test.pdf", "description": "factura de prueba"}
        
        response = await test_client.post(
            "/api/files/smart-upload",
            headers=auth_headers,
            data=data,
            files=files
        )
        
        assert response.status_code == 201
        res_data = response.json()
        assert res_data["path"] == "/Facturas"
        assert res_data["suggested_path"] == "/Facturas"
        assert res_data["created_new_folder"] is False
        assert res_data["url"] == "https://cloudinary.com/test.pdf"


@pytest.mark.asyncio
async def test_smart_upload_new_folder(test_client, auth_headers, db_session):
    """Test smart upload creating a new folder."""
    # Mock OpenAI suggestion
    suggestion = PathSuggestion(path="/Salud", new_folder=True, reason="Nueva categoría detectada")
    
    # Mock Cloudinary upload
    cloudinary_result = {
        "secure_url": "https://cloudinary.com/receta.pdf",
        "public_id": "receta_id",
        "bytes": 512,
        "format": "pdf"
    }
    
    with patch("app.features.file.router.suggest_file_path", return_value=suggestion), \
         patch("app.features.file.router.generate_embedding", return_value=[0.1] * 1536), \
         patch("cloudinary.uploader.upload", return_value=cloudinary_result):
        
        files = {"file": ("receta.pdf", b"pdf content", "application/pdf")}
        data = {"name": "receta.pdf", "description": "receta medica"}
        
        response = await test_client.post(
            "/api/files/smart-upload",
            headers=auth_headers,
            data=data,
            files=files
        )
        
        assert response.status_code == 201
        res_data = response.json()
        assert res_data["path"] == "/Salud"
        assert res_data["created_new_folder"] is True
        assert res_data["ai_reason"] == "Nueva categoría detectada"
        
        # Verify folder was actually created in DB
        from app.features.file.model import File
        from sqlalchemy import select
        
        stmt = select(File).where(File.name == "Salud").where(File.file_type == "dir")
        result = await db_session.execute(stmt)
        folder = result.scalar_one_or_none()
        assert folder is not None
        assert folder.path == "/"


@pytest.mark.asyncio
async def test_smart_upload_audio_with_transcription(test_client, auth_headers, db_session):
    """Test smart upload with an audio file (triggers transcription)."""
    # Mock OpenAI suggestion
    suggestion = PathSuggestion(path="/Audios", new_folder=True, reason="Audio detectado")
    
    # Mock Cloudinary upload
    cloudinary_result = {
        "secure_url": "https://cloudinary.com/audio.mp3",
        "public_id": "audio_public_id",
        "bytes": 2048,
        "format": "mp3"
    }

    # Mock transcription
    transcript_text = "Esta es una transcripción de prueba del audio."
    
    with patch("app.features.file.router.suggest_file_path", return_value=suggestion), \
         patch("app.features.file.router.generate_embedding", return_value=[0.1] * 1536), \
         patch("app.features.file.router.transcribe_audio", return_value=transcript_text), \
         patch("cloudinary.uploader.upload", return_value=cloudinary_result):
        
        files = {"file": ("audio.mp3", b"fake mp3 data", "audio/mpeg")}
        data = {"name": "audio.mp3", "description": "mi grabación"}
        
        response = await test_client.post(
            "/api/files/smart-upload",
            headers=auth_headers,
            data=data,
            files=files
        )
        
        assert response.status_code == 201
        res_data = response.json()
        assert res_data["transcription"] == transcript_text
        assert res_data["path"] == "/Audios"


@pytest.mark.asyncio
async def test_get_recent_files(test_client, auth_headers, admin_user, db_session):
    """Test getting recent files via API."""
    from app.features.file.model import File
    
    # 1. Seed some files
    for i in range(5):
        db_session.add(File(
            user_id=admin_user.id,
            name=f"recent_{i}.txt",
            path="/",
            file_type="file",
            url=f"https://test.com/{i}.txt",
            cloudinary_public_id=f"id_{i}",
            size=100
        ))
    await db_session.flush()
    
    # 2. Call endpoint
    response = await test_client.get(
        "/api/files/recent?limit=3",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    res_data = response.json()
    assert len(res_data) == 3
    # Should be ordered by most recent (highest ID/created_at)
    assert res_data[0]["name"] == "recent_4.txt"
    assert res_data[1]["name"] == "recent_3.txt"
    assert res_data[2]["name"] == "recent_2.txt"


@pytest.mark.asyncio
async def test_get_recent_files_unauthorized(test_client):
    """Test getting recent files without auth."""
    response = await test_client.get("/api/files/recent")
    assert response.status_code == 401
