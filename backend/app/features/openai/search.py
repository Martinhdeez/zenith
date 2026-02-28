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
    base_path: str = "/",
) -> List[SearchResult]:
    """
    Semantic search for files, scoped to base_path and its subtree.

    Mode 1 (fast, default): Vector similarity via pgvector (~20ms).
    Mode 2 (deep=True): Vector search + GPT-4o re-ranking (~3s).

    Args:
        query: Natural language search query from the user.
        db: Database session.
        user_id: Optional filter for a specific user's files.
        top_k: Number of results to return.
        deep: If True, use GPT-4o to re-rank results.
        base_path: Root path for recursive scoping (default "/" = all files).

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
        .where(distance_expr <= 0.65)  # Threshold: only show relevant results
        .order_by(distance_expr)
    )

    if user_id is not None:
        stmt = stmt.where(File.user_id == user_id)

    # Scope to current subtree
    if base_path != "/":
        from sqlalchemy import or_
        normalized = base_path.rstrip("/")
        stmt = stmt.where(
            or_(
                File.path == normalized,
                File.path.like(f"{normalized}/%"),
            )
        )

    # Fetch more candidates if deep mode is on (for re-ranking)
    fetch_k = top_k * 6 if deep else top_k
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

    Sends file metadata (including paths and transcriptions) to the LLM.
    """
    llm = get_llm()

    # Build a rich file list for the LLM context
    file_info_blocks = []
    for i, c in enumerate(candidates):
        info = (
            f"[{i}] Name: {c.file.name}\n"
            f"    Path: {c.file.path}\n"
            f"    Type: {c.file.mime_type or 'unknown'}\n"
            f"    Description: {c.file.description or 'No desc'}"
        )
        if c.file.transcription:
            # Provide first 300 chars of transcription as context
            snippet = c.file.transcription[:300].strip()
            info += f"\n    Content Snippet: {snippet}..."
        
        file_info_blocks.append(info)

    file_list = "\n".join(file_info_blocks)

    prompt = f"""Eres el motor de búsqueda inteligente de Zenith. El usuario busca información sobre: "{query}"

Tu tarea es re-ordenar los siguientes candidatos por relevancia real, considerando el nombre, la ubicación (PATH) y el contenido (Transcripción).
Zenith usa la metodología PARA (Projects, Areas, Resources, Archive). Los archivos en /Projects suelen ser más relevantes que en /Archive a menos que se busque algo histórico.

Candidatos:
{file_list}

Responde EXCLUSIVAMENTE con los índices (números entre corchetes) de los {top_k} más relevantes, separados por comas.
Ejemplo: 2,0,5,1"""

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
