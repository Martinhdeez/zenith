"""
SQLAlchemy models for chat feature.
Includes ChatMessage table (formerly ChallengeMessage).
"""
from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class ChatMessage(Base):
    """ChatMessage model - represents 'challenge_messages' table for challenge forums."""
    # We keep the same tablename so we don't need a new database migration
    __tablename__ = "challenge_messages"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Message content
    content = Column(Text, nullable=False)

    # Foreign keys
    challenge_id = Column(Integer, ForeignKey("challenges.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    challenge = relationship("Challenge", back_populates="messages")
    user = relationship("User", lazy="selectin")

    def __repr__(self):
        return f"<ChatMessage(id={self.id}, user_id={self.user_id}, challenge_id={self.challenge_id})>"
