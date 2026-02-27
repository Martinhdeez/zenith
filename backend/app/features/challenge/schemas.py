"""
Pydantic schemas for challenges feature.
Used for request validation and response serialization.
"""
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional


# ─── Language Schemas ─────────────────────────────────────────────

class LanguageRead(BaseModel):
    """Schema for reading language data."""
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


# ─── Challenge Schemas ────────────────────────────────────────────

class ChallengeCreate(BaseModel):
    """Schema for creating a new challenge."""
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    difficulty: str = Field(..., pattern="^(Easy|Medium|Hard)$")
    estimated_time: str | None = Field(None, max_length=50)
    solutions: list[str] | None = Field(default_factory=list)
    language_id: int


class ChallengeUpdate(BaseModel):
    """Schema for updating a challenge (all fields optional)."""
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    difficulty: str | None = Field(None, pattern="^(Easy|Medium|Hard)$")
    estimated_time: str | None = None
    solutions: list[str] | None = None
    language_id: int | None = None


class ChallengeRead(BaseModel):
    """Schema for reading challenge data (full detail)."""
    id: int
    title: str
    description: str
    difficulty: str
    estimated_time: str | None = None
    solutions: list[str] | None = None
    language: LanguageRead
    creator_id: int
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ChallengeList(BaseModel):
    """Schema for listing challenges (simplified, no solutions)."""
    id: int
    title: str
    description: str
    difficulty: str
    estimated_time: str | None = None
    language: LanguageRead
    creator_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─── ChallengeAnswer Schemas ─────────────────────────────────────

class ChallengeAnswerCreate(BaseModel):
    """Schema for submitting an answer to a challenge."""
    code: str = Field(..., min_length=1)
    language_id: int


class ChallengeAnswerRead(BaseModel):
    """Schema for reading a challenge answer."""
    id: int
    code: str
    succeed: bool
    compile_time: float | None = None
    memory_used: float | None = None
    user_id: int
    challenge_id: int
    language: LanguageRead
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


# ─── Ranking Schemas ──────────────────────────────────────────────


class RankingEntry(BaseModel):
    """Schema for a ranking entry (computed from successful answers)."""
    position: int
    user_id: int
    username: str
    compile_time: float
    memory_used: float | None = None
    submitted_at: datetime

    model_config = ConfigDict(from_attributes=True)
