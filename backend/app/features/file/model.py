"""
SQLAlchemy models for users.
These represent database tables.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class File(Base): 
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String(255), unique=True, index=True, nullable=False) 
    description = Column(String(255), unique=True, index=True, nullable=False)
    url = Column(String(255), unique=True, index=True, nullable=False)
    path = Column(String(255), unique=True, index=True, nullable=False)
    size = Column(Integer, unique=True, index=True, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)   
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())    
