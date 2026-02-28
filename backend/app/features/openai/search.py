"""
Search Service — Zenith AI Engine.

Provides semantic file search using pgvector + optional GPT-4o re-ranking.
This service is self-contained: it queries the File model directly
and does not depend on the File feature's repository or schemas.
"""
from typing import List, Optional, Any
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from langchain_core.messages import HumanMessage

from app.features.openai.embedding import generate_embedding
from app.features.openai.client import get_llm
from app.features.file.model import File


@dataclass
class SearchResult:
    """Result of a semantic search — file + similarity score."""
    file: Any  # File model instance
    distance: float  # 0.0 = identical, 2.0 = opposite


async def search_files(
    query: str,
    db: AsyncSession,
    user_id: Optional[int] = None,
    top_k: int = 10,
    deep: bool = False,
) -> List[SearchResult]:
    """
    Semantic search for files.

    Mode 1 (fast, default): Vector similarity via pgvector (~20ms).
    Mode 2 (deep=True): Vector search + GPT-4o re-ranking (~3s).

    Args:
        query: Natural language search query from the user.
        db: Database session.
        user_id: Optional filter for a specific user's files.
        top_k: Number of results to return.
        deep: If True, use GPT-4o to re-rank results.

    Returns:
        List of SearchResult with file and similarity distance.
    """
    # 1. Generate embedding for the query
    query_vector = generate_embedding(query)

    # 2. Vector similarity search using pgvector cosine distance (<=>)
    distance_expr = File.embedding.cosine_distance(query_vector)

    stmt = (
        select(File, distance_expr.label("distance"))
        .where(File.embedding.isnot(None))
        .where(distance_expr <= 0.6)  # Threshold: only show relevant results
        .order_by(distance_expr)
    )

    if user_id is not None:
        stmt = stmt.where(File.user_id == user_id)

    # Fetch more candidates if deep mode is on (for re-ranking)
    fetch_k = top_k * 4 if deep else top_k
    stmt = stmt.limit(fetch_k)

    result = await db.execute(stmt)
    search_results = [
        SearchResult(file=row[0], distance=round(row[1], 4))
        for row in result.all()
    ]

    # 3. Optional: GPT-4o deep re-ranking
    if deep and len(search_results) > 0:
        search_results = await _rerank_with_llm(query, search_results, top_k)

    return search_results[:top_k]


async def _rerank_with_llm(
    query: str,
    candidates: List[SearchResult],
    top_k: int,
) -> List[SearchResult]:
    """
    Use GPT-4o to re-rank search candidates based on the user's intent.

    Sends file metadata to the LLM and asks it to pick the most relevant ones.
    """
    llm = get_llm()

    # Build a concise file list for the LLM
    file_list = "\n".join(
        f"[{i}] {c.file.name} — {c.file.description or 'Sin descripción'} "
        f"(distancia: {c.distance})"
        for i, c in enumerate(candidates)
    )

    prompt = f"""Eres un asistente de búsqueda de archivos. El usuario busca: "{query}"

Aquí tienes los archivos candidatos ordenados por similitud semántica:
{file_list}

Devuelve SOLO los índices (números entre corchetes) de los {top_k} archivos \
más relevantes para la búsqueda del usuario, ordenados del más al menos relevante.
Formato: solo números separados por comas, ejemplo: 0,3,1,7,2"""

    response = llm.invoke([HumanMessage(content=prompt)])

    # Parse LLM response to get reranked indices
    try:
        indices = [
            int(idx.strip())
            for idx in response.content.strip().split(",")
            if idx.strip().isdigit()
        ]
        reranked = [
            candidates[i] for i in indices if i < len(candidates)
        ]
        return reranked if reranked else candidates
    except (ValueError, IndexError):
        return candidates
