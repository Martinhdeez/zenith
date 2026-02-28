"""
SQLAlchemy model for files.
Represents the 'files' table in PostgreSQL with pgvector embedding support.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, BigInteger
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from app.core.database import Base


# Embedding dimension for OpenAI text-embedding-3-small
EMBEDDING_DIM = 1536


class File(Base):
    """File model — stores file metadata and its vector embedding."""

    __tablename__ = "files"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Owner
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # File metadata
    name = Column(String(255), nullable=False, index=True)
    description = Column(String(1024), nullable=True)
    mime_type = Column(String(127), nullable=True)
    path = Column(String(512), nullable=False)
    size = Column(BigInteger, nullable=False)

    # Vector embedding for semantic search (384 dims = all-MiniLM-L6-v2)
    embedding = Column(Vector(EMBEDDING_DIM), nullable=True)

    # Timestamps
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<File(id={self.id}, name={self.name}, user_id={self.user_id})>"
