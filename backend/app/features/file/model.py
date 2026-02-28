"""
SQLAlchemy model for files.
Represents the 'files' table in PostgreSQL with pgvector embedding support.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.core.database import Base


# Embedding dimension for OpenAI text-embedding-3-small
EMBEDDING_DIM = 1536


class File(Base):
    """File model — stores file metadata and its vector embedding."""

    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    name = Column(String(255), index=True, nullable=False)
    description = Column(String(255), nullable=True)

    url = Column(String(500), nullable=True)
    cloudinary_public_id = Column(String(255), unique=True, index=True, nullable=True)

    file_type = Column(String(50), nullable=False, default="file")  # "file" o "dir"
    mime_type = Column(String(255), nullable=True)
    path = Column(String(500), index=True, nullable=False, default="/")

    size = Column(Integer, nullable=True, default=0)
    format = Column(String(50), nullable=True)

    # Vector embedding for semantic search (1536 dims = OpenAI text-embedding-3-small)
    embedding = Column(Vector(EMBEDDING_DIM), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<File(id={self.id}, name={self.name}, user_id={self.user_id})>"
