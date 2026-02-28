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
