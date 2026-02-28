"""
Tests for File repository.
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.file.model import File
from app.features.file.repository import FileRepository
from app.features.user.model import User


@pytest.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create a test user."""
    user = User(
        email="repo_test@zenith.com",
        username="repotester",
        hashed_password="hashed_pw_test",
        is_active=True,
    )
    db_session.add(user)
    await db_session.flush()
    return user


@pytest.mark.asyncio
async def test_get_user_folders(db_session: AsyncSession, test_user: User):
    """Test that get_user_folders correctly identifies and formats folder paths."""
    repo = FileRepository(db_session)
    
    # Create some folders
    folders = [
        {"name": "Documents", "path": "/", "file_type": "dir"},
        {"name": "Photos", "path": "/", "file_type": "dir"},
        {"name": "Vacations", "path": "/Photos", "file_type": "dir"},
        {"name": "Invoices", "path": "/Documents", "file_type": "dir"},
    ]
    
    for f in folders:
        db_session.add(File(user_id=test_user.id, **f))
    
    # Add a file (should not be in the folder list)
    db_session.add(File(
        user_id=test_user.id, 
        name="test.txt", 
        path="/Documents", 
        file_type="file"
    ))
    
    await db_session.flush()
    
    user_folders = await repo.get_user_folders(test_user.id)
    
    # Expected: ["/Documents", "/Documents/Invoices", "/Photos", "/Photos/Vacations"]
    expected = ["/Documents", "/Documents/Invoices", "/Photos", "/Photos/Vacations"]
    assert user_folders == expected


@pytest.mark.asyncio
async def test_get_user_folders_empty(db_session: AsyncSession, test_user: User):
    """Test returning empty list when no folders exist."""
    repo = FileRepository(db_session)
    user_folders = await repo.get_user_folders(test_user.id)
    assert user_folders == []


# ──────────────────────────────────────────────
# Recent Files Tests
# ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_recent_files_ordered_by_created_at(db_session: AsyncSession, test_user: User):
    """Recent files should be returned newest first."""
    repo = FileRepository(db_session)

    for i in range(5):
        db_session.add(File(
            user_id=test_user.id,
            name=f"file_{i}.txt",
            path="/",
            file_type="file",
        ))
    await db_session.flush()

    results = await repo.get_recent_files(test_user.id, limit=5)
    assert len(results) == 5
    # Most recently inserted should come first (highest id = newest created_at)
    for i in range(len(results) - 1):
        assert results[i].created_at >= results[i + 1].created_at


@pytest.mark.asyncio
async def test_get_recent_files_respects_limit(db_session: AsyncSession, test_user: User):
    """Should return at most `limit` files."""
    repo = FileRepository(db_session)

    for i in range(10):
        db_session.add(File(
            user_id=test_user.id,
            name=f"file_{i}.pdf",
            path="/",
            file_type="file",
        ))
    await db_session.flush()

    results = await repo.get_recent_files(test_user.id, limit=3)
    assert len(results) == 3


@pytest.mark.asyncio
async def test_get_recent_files_excludes_directories(db_session: AsyncSession, test_user: User):
    """Directories should not appear in the recent files list."""
    repo = FileRepository(db_session)

    db_session.add(File(user_id=test_user.id, name="MyFolder", path="/", file_type="dir"))
    db_session.add(File(user_id=test_user.id, name="report.pdf", path="/", file_type="file"))
    await db_session.flush()

    results = await repo.get_recent_files(test_user.id, limit=10)
    assert len(results) == 1
    assert results[0].name == "report.pdf"


@pytest.mark.asyncio
async def test_get_recent_files_empty(db_session: AsyncSession, test_user: User):
    """Should return empty list when user has no files."""
    repo = FileRepository(db_session)
    results = await repo.get_recent_files(test_user.id, limit=10)
    assert results == []
