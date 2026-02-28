# SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
# SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
# SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
#
# SPDX-License-Identifier: GPL-3.0-or-later

"""
Tests for file search — name, semantic, and deep modes.

Verifies that the search engine correctly finds files using:
1. Name-based search (ILIKE)
2. Semantic search (pgvector cosine distance)

Uses mocked embeddings to avoid calling the real OpenAI API.
"""
import math
import pytest
from unittest.mock import patch
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.features.file.model import File, EMBEDDING_DIM
from app.features.file.repository import FileRepository
from app.features.openai.search import search_files
from app.features.user.model import User


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def _make_embedding(seed: float) -> list[float]:
    """Generate a deterministic fake embedding vector based on a seed value."""
    return [math.sin((i + seed) * 0.1) * 0.5 for i in range(EMBEDDING_DIM)]


# ──────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────

@pytest.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create a test user for file ownership."""
    user = User(
        email="search_test@zenith.com",
        username="searchtester",
        hashed_password="hashed_pw_test",
        is_active=True,
    )
    db_session.add(user)
    await db_session.flush()
    return user


@pytest.fixture
async def sample_files(db_session: AsyncSession, test_user: User) -> list[File]:
    """
    Create a set of sample files with fake embeddings for search tests.
    Each file gets a unique embedding seed so cosine distances differ.
    """
    files_data = [
        {
            "name": "informe_financiero_q1_2025.pdf",
            "description": "Informe financiero del primer trimestre de 2025 con análisis de inversiones",
            "file_type": "file",
            "mime_type": "application/pdf",
            "path": "/finanzas/",
            "size": 204800,
            "seed": 0.0,
        },
        {
            "name": "presupuesto_anual_2025.xlsx",
            "description": "Presupuesto anual de la empresa para el año fiscal 2025",
            "file_type": "file",
            "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "path": "/finanzas/",
            "size": 51200,
            "seed": 1.0,
        },
        {
            "name": "manual_usuario_app.pdf",
            "description": "Manual de usuario de la aplicación móvil con instrucciones paso a paso",
            "file_type": "file",
            "mime_type": "application/pdf",
            "path": "/documentacion/",
            "size": 102400,
            "seed": 10.0,
        },
        {
            "name": "foto_equipo_hackathon.jpg",
            "description": "Fotografía del equipo durante la hackathon de febrero 2025",
            "file_type": "file",
            "mime_type": "image/jpeg",
            "path": "/fotos/",
            "size": 3145728,
            "seed": 20.0,
        },
        {
            "name": "arquitectura_sistema.drawio",
            "description": "Diagrama de la arquitectura del sistema backend con microservicios",
            "file_type": "file",
            "mime_type": "application/xml",
            "path": "/documentacion/",
            "size": 25600,
            "seed": 11.0,
        },
    ]

    created_files = []
    for data in files_data:
        seed = data.pop("seed")
        embedding = _make_embedding(seed)

        file = File(
            user_id=test_user.id,
            embedding=embedding,
            **data,
        )
        db_session.add(file)
        created_files.append(file)

    await db_session.flush()
    return created_files


# ──────────────────────────────────────────────
# Name Search Tests
# ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_search_by_name_exact(db_session, test_user, sample_files):
    """Searching for an exact filename should return that file."""
    repo = FileRepository(db_session)
    results = await repo.search_by_name(test_user.id, "informe_financiero")
    assert len(results) == 1
    assert results[0].name == "informe_financiero_q1_2025.pdf"


@pytest.mark.asyncio
async def test_search_by_name_partial(db_session, test_user, sample_files):
    """Searching a partial name should find all matching files."""
    repo = FileRepository(db_session)
    results = await repo.search_by_name(test_user.id, "2025")
    assert len(results) >= 2  # informe + presupuesto both have "2025"


@pytest.mark.asyncio
async def test_search_by_name_case_insensitive(db_session, test_user, sample_files):
    """Name search should be case-insensitive."""
    repo = FileRepository(db_session)
    results = await repo.search_by_name(test_user.id, "MANUAL")
    assert len(results) == 1
    assert "manual" in results[0].name


@pytest.mark.asyncio
async def test_search_by_name_no_results(db_session, test_user, sample_files):
    """Searching for a non-existent name should return empty list."""
    repo = FileRepository(db_session)
    results = await repo.search_by_name(test_user.id, "esto_no_existe_xyz")
    assert len(results) == 0


# ──────────────────────────────────────────────
# Semantic Search Tests
# ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_semantic_search_returns_results(db_session, test_user, sample_files):
    """Semantic search should return results when files have embeddings."""
    # Mock generate_embedding to return a vector close to the financial files
    query_embedding = _make_embedding(0.5)  # close to seed 0.0 and 1.0

    with patch("app.features.openai.search.generate_embedding", return_value=query_embedding):
        results = await search_files(
            query="documentos financieros",
            db=db_session,
            user_id=test_user.id,
            top_k=5,
        )

    assert len(results) > 0


@pytest.mark.asyncio
async def test_semantic_search_returns_distances(db_session, test_user, sample_files):
    """Each search result should have a valid distance score."""
    query_embedding = _make_embedding(20.0)

    with patch("app.features.openai.search.generate_embedding", return_value=query_embedding):
        results = await search_files(
            query="fotos del equipo",
            db=db_session,
            user_id=test_user.id,
            top_k=3,
        )

    assert len(results) > 0
    for r in results:
        assert 0.0 <= r.distance <= 2.0, f"Invalid distance: {r.distance}"


@pytest.mark.asyncio
async def test_semantic_search_respects_top_k(db_session, test_user, sample_files):
    """Search should return at most top_k results."""
    query_embedding = _make_embedding(5.0)

    with patch("app.features.openai.search.generate_embedding", return_value=query_embedding):
        results = await search_files(
            query="archivos",
            db=db_session,
            user_id=test_user.id,
            top_k=2,
        )

    assert len(results) <= 2


@pytest.mark.asyncio
async def test_semantic_search_ordered_by_similarity(db_session, test_user, sample_files):
    """Results should be ordered by distance (most similar first)."""
    query_embedding = _make_embedding(0.0)

    with patch("app.features.openai.search.generate_embedding", return_value=query_embedding):
        results = await search_files(
            query="informe de finanzas",
            db=db_session,
            user_id=test_user.id,
            top_k=5,
        )

    if len(results) > 1:
        distances = [r.distance for r in results]
        assert distances == sorted(distances), "Results should be sorted by distance ascending"
