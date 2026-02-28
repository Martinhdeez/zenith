"""Auth router with login endpoint."""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.config import Config
#from authlib.integrations.starlette_client import OAuth
import uuid

from app.core.database import get_db
from app.core.config import settings
from app.core.security import create_access_token, verify_password
from app.features.auth.schemas import Token, GoogleTokenRequest
from app.features.user.repository import UserRepository
from app.features.user.model import User

from google.oauth2 import id_token
from google.auth.transport import requests

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
    
    # Create access token
    access_token = create_access_token(data={"sub": user.email})
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/google", response_model=Token)
async def google_auth(
    token_request: GoogleTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Verifies a Google Identity Services (GSI) credential token.
    Creates a new user if one doesn't exist, and returns a Zenith JWT token.
    """
    try:
        # Verify the Google JWT token
        # id_token.verify_oauth2_token verifies the signature, expiration, and audience (client_id)
        idinfo = id_token.verify_oauth2_token(
            token_request.credential,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )

        google_email = idinfo.get('email')
        google_id = str(idinfo.get('sub'))
        base_username = idinfo.get('given_name', '').lower() or google_email.split('@')[0]
        
        if not google_email:
            raise ValueError("Token didn't contain an email")
            
    except ValueError as e:
        # Invalid token
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    repo = UserRepository(db)
    
    user = await repo.get_by_email(google_email)
    
    if not user:
        unique_username = f"{base_username}_{str(uuid.uuid4())[:6]}"
        
        user = User(
            email=google_email,
            username=unique_username,
            hashed_password="[SOCIAL_LOGIN_GOOGLE]", 
            auth_provider="google",
            auth_provider_id=google_id,
            is_active=True
        )
        db.add(user)
        # Commit to the DB
        await db.commit()
        await db.refresh(user)
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
        
    access_token = create_access_token(data={"sub": user.email})
    
    return {"access_token": access_token, "token_type": "bearer"}
