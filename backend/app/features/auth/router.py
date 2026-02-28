# SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
# SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
# SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
#
# SPDX-License-Identifier: GPL-3.0-or-later

"""Auth router with login and OAuth2 endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
import os
import uuid

from app.core.database import get_db
from app.core.config import settings
from app.core.security import create_access_token, verify_password
from app.features.auth.schemas import Token
from app.features.user.repository import UserRepository
from app.features.user.model import User

router = APIRouter()

@router.post("/token", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    OAuth2 compatible token login.
    
    - **username**: Email or username
    - **password**: User password
    
    Returns JWT access token for authenticated requests.
    """
    repo = UserRepository(db)
    
    # Try to find user by email first, then username
    user = await repo.get_by_email(form_data.username)
    if not user:
        user = await repo.get_by_username(form_data.username)
    
    # Verify user exists and password is correct
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Create access token — CRITICAL FIX: use user.id (as string)
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return {"access_token": access_token, "token_type": "bearer"}

    # Redirect to frontend with token
    # Ensure no double slashes or missing base items
    frontend_base = settings.FRONTEND_URL.rstrip('/')
    redirect_url = f"{frontend_base}/auth/callback?token={access_token}"
    return RedirectResponse(url=redirect_url)
