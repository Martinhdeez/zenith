"""Auth router with login and OAuth2 endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from authlib.integrations.starlette_client import OAuth
import os
import uuid

# Permitir HTTP para OAuth2 en desarrollo local
os.environ['AUTHLIB_INSECURE_TRANSPORT'] = '1'

from app.core.database import get_db
from app.core.config import settings
from app.core.security import create_access_token, verify_password
from app.features.auth.schemas import Token
from app.features.user.repository import UserRepository
from app.features.user.model import User

router = APIRouter()

# Setup Authlib OAuth
oauth = OAuth()
oauth.register(
    name='google',
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)

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


# ──────────────────────────────────────────────
# Traditional Google OAuth2 Flow
# ──────────────────────────────────────────────

@router.get("/google/login")
async def google_login(request: Request):
    """Redirects the user to Google's OAuth2 login page."""
    # Intentar obtener la URL de callback de forma robusta
    try:
        redirect_uri = str(request.url_for('auth_callback'))
        # En algunos entornos (Docker/Proxies), url_for puede devolver http en lugar de https
        # o localhost en lugar de la IP real. Si detectamos desajustes, podemos forzarlo.
    except Exception:
        # Fallback manual si url_for falla
        redirect_uri = f"{request.base_url}api/auth/google/callback"
        
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback", name="auth_callback")
async def auth_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """Handles the callback from Google OAuth2."""
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"OAuth error: {str(e)}"
        )

    user_info = token.get('userinfo')
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to fetch user info from Google"
        )

    google_email = user_info.get('email')
    google_id = str(user_info.get('sub'))
    base_username = user_info.get('given_name', '').lower() or google_email.split('@')[0]

    repo = UserRepository(db)
    user = await repo.get_by_email(google_email)

    if not user:
        # Create new user for social login
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
        await db.commit()
        await db.refresh(user)
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    # Generate JWT token with user.id
    access_token = create_access_token(data={"sub": str(user.id)})

    # Redirect to frontend with token
    # Ensure no double slashes or missing base items
    frontend_base = settings.FRONTEND_URL.rstrip('/')
    redirect_url = f"{frontend_base}/auth/callback?token={access_token}"
    return RedirectResponse(url=redirect_url)
