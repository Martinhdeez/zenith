# SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
# SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
# SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
#
# SPDX-License-Identifier: GPL-3.0-or-later

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from unittest.mock import AsyncMock
from fastapi.responses import RedirectResponse

from app.main import app
from app.core.database import get_db
from app.features.user.repository import UserRepository

@pytest.fixture
async def test_client(db_session: AsyncSession):
    """Create test client with overridden database dependency."""
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    # We use a base_url that matches what we typically use in dev/tests
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://localhost:8000") as client:
        yield client
    
    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_google_login_redirect(test_client: AsyncClient, mocker):
    """Test that /google/login redirects to Google."""
    # Mock oauth.google.authorize_redirect
    mock_authorize = mocker.patch("app.features.auth.router.oauth.google.authorize_redirect", new_callable=AsyncMock)
    mock_authorize.return_value = RedirectResponse(url="https://accounts.google.com/o/oauth2/v2/auth")

    response = await test_client.get("/api/auth/google/login", follow_redirects=False)
    
    assert response.status_code == 307
    assert "accounts.google.com" in response.headers["location"]
    # Verify it was called with a redirect_uri
    args, _ = mock_authorize.call_args
    assert len(args) >= 2
    assert "google/callback" in args[1]

@pytest.mark.asyncio
async def test_google_callback_creates_new_user(test_client: AsyncClient, db_session: AsyncSession, mocker):
    """Test callback creates a new user if one doesn't exist."""
    # Mock authorize_access_token
    mock_token = mocker.patch("app.features.auth.router.oauth.google.authorize_access_token", new_callable=AsyncMock)
    mock_token.return_value = {
        "userinfo": {
            "email": "new_google_user@example.com",
            "sub": "google-sub-999",
            "given_name": "Newbie"
        }
    }

    # Execute callback
    response = await test_client.get("/api/auth/google/callback", follow_redirects=False)
    
    assert response.status_code == 307
    assert "/auth/callback?token=" in response.headers["location"]
    
    # Verify user in DB
    repo = UserRepository(db_session)
    user = await repo.get_by_email("new_google_user@example.com")
    assert user is not None
    assert user.auth_provider == "google"
    assert user.auth_provider_id == "google-sub-999"
    
    # Verify token contains user ID (numeric) and NOT email
    token_str = response.headers["location"].split("token=")[1]
    from jose import jwt
    from app.core.config import settings
    from app.core.security import ALGORITHM
    payload = jwt.decode(token_str, settings.JWT_SECRET, algorithms=[ALGORITHM])
    assert payload["sub"] == str(user.id)
    assert payload["sub"] != "new_google_user@example.com"

@pytest.mark.asyncio
async def test_google_callback_logs_in_existing_user(test_client: AsyncClient, db_session: AsyncSession, mocker):
    """Test callback logs in an existing user without creating a new one."""
    # Pre-create user
    repo = UserRepository(db_session)
    existing_user = await repo.create({
        "email": "existing_google@example.com",
        "username": "existing_g",
        "hashed_password": "[SOCIAL]",
        "auth_provider": "google",
        "auth_provider_id": "google-sub-existing",
        "is_active": True
    })
    
    # Mock authorize_access_token
    mock_token = mocker.patch("app.features.auth.router.oauth.google.authorize_access_token", new_callable=AsyncMock)
    mock_token.return_value = {
        "userinfo": {
            "email": "existing_google@example.com",
            "sub": "google-sub-existing",
            "given_name": "Existing"
        }
    }

    # Execute callback
    response = await test_client.get("/api/auth/google/callback", follow_redirects=False)
    
    assert response.status_code == 307
    
    # Verify token's sub matches existing user ID
    token_str = response.headers["location"].split("token=")[1]
    from jose import jwt
    from app.core.config import settings
    from app.core.security import ALGORITHM
    payload = jwt.decode(token_str, settings.JWT_SECRET, algorithms=[ALGORITHM])
    assert payload["sub"] == str(existing_user.id)
