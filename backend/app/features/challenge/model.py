"""
SQLAlchemy models for challenges feature.
Includes Language, Challenge, and ChallengeAnswer tables.
"""
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Float,
    DateTime, ForeignKey, JSON, Enum as SQLEnum
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base
from app.features.user.model import User
from app.features.chat.model import ChatMessage


class DifficultyLevel(str, enum.Enum):
    """Challenge difficulty levels."""
    EASY = "Easy"
    MEDIUM = "Medium"
    HARD = "Hard"


class Language(Base):
    """Language model - represents 'languages' table."""

    __tablename__ = "languages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)

    # Relationships
    challenges = relationship("Challenge", back_populates="language")

    def __repr__(self):
        return f"<Language(id={self.id}, name={self.name})>"


class Challenge(Base):
    """Challenge model - represents 'challenges' table."""

    __tablename__ = "challenges"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Challenge info
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=False)
    difficulty = Column(
        SQLEnum(DifficultyLevel, name="difficulty_level", create_constraint=True),
        nullable=False,
        index=True
    )
    estimated_time = Column(String(50), nullable=True)
    solutions = Column(JSON, nullable=True, default=list)

    # Foreign keys
    language_id = Column(Integer, ForeignKey("languages.id"), nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    language = relationship("Language", back_populates="challenges", lazy="selectin")
    answers = relationship("ChallengeAnswer", back_populates="challenge", cascade="all, delete-orphan")
    creator = relationship("User", lazy="selectin")
    messages = relationship("ChatMessage", back_populates="challenge", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Challenge(id={self.id}, title={self.title}, creator_id={self.creator_id})>"


class ChallengeAnswer(Base):
    """ChallengeAnswer model - represents 'challenge_answers' table."""

    __tablename__ = "challenge_answers"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Answer data
    code = Column(Text, nullable=False)
    succeed = Column(Boolean, default=False, nullable=False)
    compile_time = Column(Float, nullable=True)  # seconds
    memory_used = Column(Float, nullable=True)    # MB

    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    challenge_id = Column(Integer, ForeignKey("challenges.id"), nullable=False, index=True)
    language_id = Column(Integer, ForeignKey("languages.id"), nullable=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", lazy="selectin")
    challenge = relationship("Challenge", back_populates="answers")
    language = relationship("Language", lazy="selectin")

    def __repr__(self):
        return f"<ChallengeAnswer(id={self.id}, user_id={self.user_id}, challenge_id={self.challenge_id}, succeed={self.succeed})>"
