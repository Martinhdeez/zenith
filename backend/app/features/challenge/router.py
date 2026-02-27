"""Challenge and Language routers with CRUD + submission + ranking endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.features.auth.dependencies import get_current_active_user
from app.features.user.model import User
from app.features.challenge.model import Challenge, ChallengeAnswer, Language
from app.features.challenge.repository import (
    ChallengeRepository,
    ChallengeAnswerRepository,
    LanguageRepository,
)
from app.features.challenge.schemas import (
    ChallengeCreate,
    ChallengeUpdate,
    ChallengeRead,
    ChallengeList,
    ChallengeAnswerCreate,
    ChallengeAnswerRead,
    LanguageRead,
    RankingEntry,
)
from app.common.exceptions import NotFoundException


# ─── Challenge Router ─────────────────────────────────────────────

router = APIRouter()


@router.get("/", response_model=list[ChallengeList])
async def list_challenges(
    difficulty: Optional[str] = Query(None, pattern="^(Easy|Medium|Hard)$"),
    language_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None, max_length=200),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    List all challenges with optional filters.

    - **difficulty**: Filter by Easy, Medium, or Hard
    - **language_id**: Filter by programming language
    - **search**: Search in title and description
    - **skip/limit**: Pagination
    """
    repo = ChallengeRepository(db)
    challenges = await repo.get_filtered(
        skip=skip,
        limit=limit,
        difficulty=difficulty,
        language_id=language_id,
        search=search,
    )
    return challenges


@router.get("/{challenge_id}", response_model=ChallengeRead)
async def get_challenge(
    challenge_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a challenge by ID with full details including solutions."""
    repo = ChallengeRepository(db)

    try:
        challenge = await repo.get_or_fail(challenge_id)
        return challenge
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e.message),
        )


@router.post("/", response_model=ChallengeRead, status_code=status.HTTP_201_CREATED)
async def create_challenge(
    challenge_data: ChallengeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Create a new challenge (authenticated).

    - **title**: Challenge title
    - **description**: Full description
    - **difficulty**: Easy, Medium, or Hard
    - **estimated_time**: e.g. "30 min"
    - **solutions**: List of solution strings
    - **language_id**: ID of the programming language
    """
    # Verify language exists
    lang_repo = LanguageRepository(db)
    language = await lang_repo.get(challenge_data.language_id)
    if not language:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Language with ID {challenge_data.language_id} not found",
        )

    repo = ChallengeRepository(db)
    
    # Set the current user as creator
    create_data = challenge_data.model_dump()
    create_data["creator_id"] = current_user.id
    
    challenge = await repo.create(create_data)
    return challenge


@router.put("/{challenge_id}", response_model=ChallengeRead)
async def update_challenge(
    challenge_id: int,
    challenge_data: ChallengeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a challenge (authenticated)."""
    repo = ChallengeRepository(db)

    try:
        update_data = challenge_data.model_dump(exclude_unset=True)

        # Verify language exists if updating it
        if "language_id" in update_data:
            lang_repo = LanguageRepository(db)
            language = await lang_repo.get(update_data["language_id"])
            if not language:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Language with ID {update_data['language_id']} not found",
                )

        updated = await repo.update(challenge_id, update_data)
        return updated
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e.message),
        )


@router.delete("/{challenge_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_challenge(
    challenge_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a challenge (authenticated). Also deletes all related answers."""
    repo = ChallengeRepository(db)

    deleted = await repo.delete(challenge_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found",
        )


# ─── Submissions ──────────────────────────────────────────────────

@router.post(
    "/{challenge_id}/submit",
    response_model=ChallengeAnswerRead,
    status_code=status.HTTP_201_CREATED,
)
async def submit_answer(
    challenge_id: int,
    answer_data: ChallengeAnswerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Submit an answer to a challenge (authenticated).

    - **code**: The submitted code
    - **language_id**: Language used for the submission

    Note: `succeed`, `compile_time`, and `memory_used` are determined
    server-side (placeholder for now — marks as succeeded with mock metrics).
    """
    # Verify challenge exists
    challenge_repo = ChallengeRepository(db)
    try:
        await challenge_repo.get_or_fail(challenge_id)
    except NotFoundException:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Challenge with ID {challenge_id} not found",
        )

    # Verify language exists
    lang_repo = LanguageRepository(db)
    language = await lang_repo.get(answer_data.language_id)
    if not language:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Language with ID {answer_data.language_id} not found",
        )

    # TODO: In the future, run the code against test cases and compute
    # compile_time, memory_used, and succeed dynamically.
    # For now, we mark it as succeeded with placeholder metrics.
    answer_repo = ChallengeAnswerRepository(db)
    answer = await answer_repo.create({
        "code": answer_data.code,
        "language_id": answer_data.language_id,
        "challenge_id": challenge_id,
        "user_id": current_user.id,
        "succeed": True,
        "compile_time": 0.0,
        "memory_used": 0.0,
    })
    return answer


@router.get("/{challenge_id}/submissions", response_model=list[ChallengeAnswerRead])
async def get_my_submissions(
    challenge_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get current user's submissions for a challenge (authenticated)."""
    # Verify challenge exists
    challenge_repo = ChallengeRepository(db)
    try:
        await challenge_repo.get_or_fail(challenge_id)
    except NotFoundException:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Challenge with ID {challenge_id} not found",
        )

    answer_repo = ChallengeAnswerRepository(db)
    submissions = await answer_repo.get_user_submissions(
        user_id=current_user.id,
        challenge_id=challenge_id,
        skip=skip,
        limit=limit,
    )
    return submissions


@router.get("/{challenge_id}/ranking", response_model=list[RankingEntry])
async def get_ranking(
    challenge_id: int,
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    Get ranking for a challenge (public).

    Returns the fastest successful submissions, one per user,
    ordered by compile time.
    """
    # Verify challenge exists
    challenge_repo = ChallengeRepository(db)
    try:
        await challenge_repo.get_or_fail(challenge_id)
    except NotFoundException:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Challenge with ID {challenge_id} not found",
        )

    answer_repo = ChallengeAnswerRepository(db)
    ranking_answers = await answer_repo.get_ranking(
        challenge_id=challenge_id,
        limit=limit,
    )

    # Transform to RankingEntry (add position and username)
    ranking = []
    for position, answer in enumerate(ranking_answers, start=1):
        ranking.append(RankingEntry(
            position=position,
            user_id=answer.user_id,
            username=answer.user.username,
            compile_time=answer.compile_time,
            memory_used=answer.memory_used,
            submitted_at=answer.created_at,
        ))

    return ranking


# ─── Language Router ──────────────────────────────────────────────

language_router = APIRouter()


@language_router.get("/", response_model=list[LanguageRead])
async def list_languages(
    db: AsyncSession = Depends(get_db),
):
    """List all available programming languages."""
    repo = LanguageRepository(db)
    languages = await repo.get_all(order_by="name")
    return languages
