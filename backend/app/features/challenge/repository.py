"""
Repositories for challenges feature.
Implements database operations for Language, Challenge, and ChallengeAnswer.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List

from app.common.repositories import BaseRepository
from app.features.challenge.model import Language, Challenge, ChallengeAnswer, DifficultyLevel


class LanguageRepository(BaseRepository[Language]):
    """Language repository."""

    def __init__(self, db: AsyncSession):
        super().__init__(Language, db)

    async def get_by_name(self, name: str) -> Optional[Language]:
        """Get language by name."""
        return await self.get_by_field("name", name)


class ChallengeRepository(BaseRepository[Challenge]):
    """Challenge repository with filtering and search."""

    def __init__(self, db: AsyncSession):
        super().__init__(Challenge, db)

    async def get_filtered(
        self,
        skip: int = 0,
        limit: int = 100,
        difficulty: Optional[str] = None,
        language_id: Optional[int] = None,
        search: Optional[str] = None,
    ) -> List[Challenge]:
        """Get challenges with optional filters."""
        query = select(Challenge)

        if difficulty:
            query = query.where(Challenge.difficulty == DifficultyLevel(difficulty))

        if language_id:
            query = query.where(Challenge.language_id == language_id)

        if search:
            search_term = f"%{search}%"
            query = query.where(
                Challenge.title.ilike(search_term) | Challenge.description.ilike(search_term)
            )

        query = query.order_by(Challenge.created_at.desc())
        query = query.offset(skip).limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count_filtered(
        self,
        difficulty: Optional[str] = None,
        language_id: Optional[int] = None,
        search: Optional[str] = None,
    ) -> int:
        """Count challenges with optional filters."""
        query = select(func.count()).select_from(Challenge)

        if difficulty:
            query = query.where(Challenge.difficulty == DifficultyLevel(difficulty))

        if language_id:
            query = query.where(Challenge.language_id == language_id)

        if search:
            search_term = f"%{search}%"
            query = query.where(
                Challenge.title.ilike(search_term) | Challenge.description.ilike(search_term)
            )

        result = await self.db.execute(query)
        return result.scalar()


class ChallengeAnswerRepository(BaseRepository[ChallengeAnswer]):
    """ChallengeAnswer repository with ranking support."""

    def __init__(self, db: AsyncSession):
        super().__init__(ChallengeAnswer, db)

    async def get_user_submissions(
        self,
        user_id: int,
        challenge_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> List[ChallengeAnswer]:
        """Get all submissions by a user for a specific challenge."""
        query = (
            select(ChallengeAnswer)
            .where(
                ChallengeAnswer.user_id == user_id,
                ChallengeAnswer.challenge_id == challenge_id,
            )
            .order_by(ChallengeAnswer.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_ranking(
        self,
        challenge_id: int,
        limit: int = 50,
    ) -> List[ChallengeAnswer]:
        """
        Get ranking for a challenge.
        Returns successful answers ordered by compile_time (fastest first).
        Only includes the best submission per user.
        """
        # Subquery: best (min) compile_time per user for this challenge
        best_times = (
            select(
                ChallengeAnswer.user_id,
                func.min(ChallengeAnswer.compile_time).label("best_time"),
            )
            .where(
                ChallengeAnswer.challenge_id == challenge_id,
                ChallengeAnswer.succeed == True,
                ChallengeAnswer.compile_time.isnot(None),
            )
            .group_by(ChallengeAnswer.user_id)
            .subquery()
        )

        # Main query: get full answer rows matching each user's best time
        query = (
            select(ChallengeAnswer)
            .join(
                best_times,
                (ChallengeAnswer.user_id == best_times.c.user_id)
                & (ChallengeAnswer.compile_time == best_times.c.best_time),
            )
            .where(
                ChallengeAnswer.challenge_id == challenge_id,
                ChallengeAnswer.succeed == True,
            )
            .order_by(ChallengeAnswer.compile_time.asc())
            .limit(limit)
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())
