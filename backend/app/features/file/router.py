"""File router"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_password_hash

#from app.features.auth.dependencies import get_current_user, get_current_active_user
#from app.features.user.model import User
#from app.features.user.repository import UserRepository
#from app.features.user.schemas import UserCreate, UserRead, UserUpdate

from app.common.exceptions import AlreadyExistsException, NotFoundException


router = APIRouter()