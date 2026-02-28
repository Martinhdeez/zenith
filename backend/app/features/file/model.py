"""
SQLAlchemy models for users.
These represent database tables.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class File(Base):
    """File model"""
    
    __tablename__ = "files"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    name = Column(String(255), index=True, nullable=False) 
    description = Column(String(255), nullable=True)
    
    url = Column(String(500), nullable=True) 
    cloudinary_public_id = Column(String(255), unique=True, index=True, nullable=True) 
    
    file_type = Column(String(50), nullable=False, default="file")  # "file" o "dir"
    mime_type = Column(String(50), nullable=True) # tipo MIME del fichero  
    path = Column(String(500), index=True, nullable=False, default="/")

    size = Column(Integer, nullable=True, default=0) 
    format = Column(String(50), nullable=True) 
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())    
