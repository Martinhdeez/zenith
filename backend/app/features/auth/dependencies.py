# SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
# SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
# SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
#
# SPDX-License-Identifier: GPL-3.0-or-later

from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import ALGORITHM
from app.core.config import settings
from app.features.auth.schemas import TokenData
from app.features.user.model import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: Annotated[AsyncSession, Depends(get_db)]):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(username=user_id)
    except JWTError:
        raise credentials_exception
    
    # Find user by ID, email or username
    try:
        # Check if user_id is numeric (original ID-based sub)
        if user_id.isdigit():
            result = await db.execute(select(User).where(User.id == int(user_id)))
        else:
            # Try finding by email or username (new string-based sub)
            result = await db.execute(
                select(User).where((User.email == user_id) | (User.username == user_id))
            )
        
        user = result.scalars().first()
    except (ValueError, Exception):
        raise credentials_exception
        
    if user is None:
        raise credentials_exception
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    return user


# Alias for clarity (already checks is_active)
get_current_active_user = get_current_user
