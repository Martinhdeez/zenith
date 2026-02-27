"""
Pytest configuration and shared fixtures.
Uses settings from config.py (which loads the .env file).
"""
import pytest
import asyncio
import os
from pathlib import Path
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv

# Use same logic as config.py to determine which .env file
ENV_FILE = os.getenv("ENV_FILE", ".env.dev")
backend_dir = Path(__file__).parent.parent  # backend/
env_path = backend_dir / ENV_FILE
load_dotenv(env_path)

# Now import settings (env vars already loaded)
from app.core.database import Base
from app.core.config import settings

# Use test database URL from settings or override
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    settings.DATABASE_URL.replace("devarena_db", "test_devarena_db")
)

print(f"🔵 Running tests with PostgreSQL: {TEST_DATABASE_URL}")

print(f"\n🔵 Running tests with PostgreSQL: {TEST_DATABASE_URL}")

# Create test engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    poolclass=NullPool,
)

# Create test session factory
TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Create a test database session with automatic cleanup.
    Uses real PostgreSQL with transaction rollback - no data persists.
    """
    # Create tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create session for test
    async with TestSessionLocal() as session:
        yield session
        # Rollback any changes (cleanup)
        await session.rollback()
    
    # Drop tables after test
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="function")
async def test_user_data():
    """Sample user data for tests."""
    return {
        "email": "test@example.com",
        "username": "testuser",
        "hashed_password": "hashed_password_123",
        "is_active": True
    }
