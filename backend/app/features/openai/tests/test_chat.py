"""
Tests for the AI Chat Service.
Validates that the assistant uses semantic search and responds with file context.
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from dataclasses import dataclass
from typing import Any

from app.features.openai.chat import chat_with_assistant, _build_file_overview, _search_relevant_files


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

@dataclass
class FakeSearchResult:
    file: Any
    distance: float


def _make_mock_file(**kwargs):
    """Create a mock file object with default values."""
    defaults = {
        "id": 1, "name": "test.pdf", "description": "A test file",
        "path": "/", "file_type": "file", "mime_type": "application/pdf",
        "size": 1024, "user_id": 1,
    }
    defaults.update(kwargs)
    m = MagicMock()
    for k, v in defaults.items():
        setattr(m, k, v)
    return m


def _make_mock_db(files=None):
    """Create a mock DB session that returns the given files."""
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = files or []
    mock_db.execute = AsyncMock(return_value=mock_result)
    return mock_db


# ──────────────────────────────────────────────
# Unit tests
# ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_chat_uses_semantic_search():
    """The chat service should call search_files to get relevant files via embeddings."""
    mock_file = _make_mock_file(name="factura.pdf", path="/Facturas")
    search_results = [FakeSearchResult(file=mock_file, distance=0.15)]

    mock_response = MagicMock()
    mock_response.content = "Tienes una factura en /Facturas."

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=mock_response)

    mock_db = _make_mock_db(files=[mock_file])

    with patch("app.features.openai.chat.get_llm", return_value=mock_llm), \
         patch("app.features.openai.chat.search_files", new_callable=AsyncMock, return_value=search_results):
        reply, files_used = await chat_with_assistant(
            message="¿Dónde está mi factura?",
            db=mock_db,
            user_id=1,
        )

    assert isinstance(reply, str)
    assert len(reply) > 0
    assert files_used == 1  # 1 file returned by semantic search

    # Verify the system prompt includes semantic search results
    call_args = mock_llm.ainvoke.call_args[0][0]
    system_content = call_args[0]["content"]
    assert "factura.pdf" in system_content
    assert "relevance" in system_content.lower() or "%" in system_content


@pytest.mark.asyncio
async def test_chat_includes_file_overview():
    """The system prompt should include a general overview of all files."""
    mock_file = _make_mock_file(name="doc.pdf", path="/Docs", size=2048)

    mock_response = MagicMock()
    mock_response.content = "Tienes 1 archivo."

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=mock_response)

    mock_db = _make_mock_db(files=[mock_file])

    with patch("app.features.openai.chat.get_llm", return_value=mock_llm), \
         patch("app.features.openai.chat.search_files", new_callable=AsyncMock, return_value=[]):
        reply, _ = await chat_with_assistant(
            message="¿Cuántos archivos tengo?",
            db=mock_db,
            user_id=1,
        )

    call_args = mock_llm.ainvoke.call_args[0][0]
    system_content = call_args[0]["content"]
    assert "Total:" in system_content
    assert "1" in system_content


@pytest.mark.asyncio
async def test_chat_with_history():
    """The chat service should include conversation history in the LLM call."""
    mock_response = MagicMock()
    mock_response.content = "Sí, tienes un PDF."

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=mock_response)

    mock_db = _make_mock_db()

    history = [
        {"role": "user", "content": "Hola"},
        {"role": "assistant", "content": "Hola! ¿En qué puedo ayudarte?"},
    ]

    with patch("app.features.openai.chat.get_llm", return_value=mock_llm), \
         patch("app.features.openai.chat.search_files", new_callable=AsyncMock, return_value=[]):
        reply, _ = await chat_with_assistant(
            message="¿Tengo algún PDF?",
            db=mock_db,
            user_id=1,
            history=history,
        )

    # system + 2 history + 1 user = 4 messages
    call_args = mock_llm.ainvoke.call_args[0][0]
    assert len(call_args) == 4
    assert call_args[0]["role"] == "system"
    assert call_args[1]["role"] == "user"
    assert call_args[2]["role"] == "assistant"
    assert call_args[3]["role"] == "user"


@pytest.mark.asyncio
async def test_chat_handles_llm_error():
    """If GPT-4o fails, the service should return a friendly fallback message."""
    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(side_effect=Exception("API timeout"))

    mock_db = _make_mock_db()

    with patch("app.features.openai.chat.get_llm", return_value=mock_llm), \
         patch("app.features.openai.chat.search_files", new_callable=AsyncMock, return_value=[]):
        reply, _ = await chat_with_assistant(
            message="Hola",
            db=mock_db,
            user_id=1,
        )

    assert "error" in reply.lower() or "inténtalo" in reply.lower()


@pytest.mark.asyncio
async def test_chat_handles_search_failure_gracefully():
    """If semantic search fails, the chat should still work with the overview."""
    mock_response = MagicMock()
    mock_response.content = "No pude buscar archivos relevantes, pero aquí tienes un resumen."

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=mock_response)

    mock_db = _make_mock_db()

    with patch("app.features.openai.chat.get_llm", return_value=mock_llm), \
         patch("app.features.openai.chat.search_files", new_callable=AsyncMock, side_effect=Exception("Search failed")):
        reply, files_used = await chat_with_assistant(
            message="Busca algo",
            db=mock_db,
            user_id=1,
        )

    assert isinstance(reply, str)
    assert len(reply) > 0
    assert files_used == 0  # search failed, no files


@pytest.mark.asyncio
async def test_chat_no_files():
    """With no files, the overview should say so and search returns nothing."""
    mock_response = MagicMock()
    mock_response.content = "No tienes archivos todavía."

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=mock_response)

    mock_db = _make_mock_db(files=[])

    with patch("app.features.openai.chat.get_llm", return_value=mock_llm), \
         patch("app.features.openai.chat.search_files", new_callable=AsyncMock, return_value=[]):
        reply, files_used = await chat_with_assistant(
            message="¿Qué tengo?",
            db=mock_db,
            user_id=1,
        )

    call_args = mock_llm.ainvoke.call_args[0][0]
    system_content = call_args[0]["content"]
    assert "no files" in system_content.lower() or "no relevant" in system_content.lower()
    assert files_used == 0
