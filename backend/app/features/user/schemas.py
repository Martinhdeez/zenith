"""
Pydantic schemas for users.
These are used for request validation and response serialization.
"""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime


class UserBase(BaseModel):
    """Base user schema with common fields."""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str = Field(..., min_length=8, max_length=100)


class UserUpdate(BaseModel):
    """Schema for updating user (all fields optional)."""
    email: EmailStr | None = None
    username: str | None = Field(None, min_length=3, max_length=50)
    password: str | None = Field(None, min_length=8, max_length=100)


class UserRead(UserBase):
    """Schema for reading user data (response)."""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None
    
    model_config = ConfigDict(from_attributes=True)


class UserInDB(UserRead):
    """Schema with hashed password (internal use only)."""
    hashed_password: str
