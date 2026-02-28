"""
Embedding Service — Zenith AI Engine.

Uses OpenAI's text-embedding-3-small model via API.
Zero local computation — everything runs in OpenAI's cloud.
"""
from functools import lru_cache
from typing import List

from langchain_openai import OpenAIEmbeddings
from app.core.config import settings


# OpenAI embedding config
_EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIM = 1536


@lru_cache(maxsize=1)
def get_embedding_model() -> OpenAIEmbeddings:
    """
    Returns a singleton OpenAIEmbeddings instance.

    Model: text-embedding-3-small (1536 dimensions)
    - Fast, cheap, and accurate.
    - Zero local computation.

    Usage:
        from app.features.openai.embedding import get_embedding_model
        model = get_embedding_model()
        vector = model.embed_query("search text")
    """
    return OpenAIEmbeddings(
        model=_EMBEDDING_MODEL,
        api_key=settings.OPENAI_API_KEY,
    )


def generate_embedding(text: str) -> List[float]:
    """
    Generate a 1536-dim embedding vector for the given text.

    Args:
        text: The text content to embed (file name, description, etc.)

    Returns:
        A list of 1536 floats representing the text's semantic vector.
    """
    model = get_embedding_model()
    return model.embed_query(text)


def generate_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings for multiple texts at once (more efficient).

    Args:
        texts: List of text strings to embed.

    Returns:
        List of embedding vectors, one per input text.
    """
    model = get_embedding_model()
    return model.embed_documents(texts)
