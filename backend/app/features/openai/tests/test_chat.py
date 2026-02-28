"""
Tests for the AI Chat Service.
Validates that the assistant responds with file context.
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.features.openai.chat import chat_with_assistant, _build_file_context


# ──────────────────────────────────────────────
# Unit tests (mocked LLM)
# ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_chat_returns_response():
    """The chat service should return a non-empty reply and file count."""
    mock_response = MagicMock()
    mock_response.content = "Hola! Tienes 3 archivos en tu cuenta."

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=mock_response)

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_db.execute = AsyncMock(return_value=mock_result)

    with patch("app.features.openai.chat.get_llm", return_value=mock_llm):
        reply, files_used = await chat_with_assistant(
            message="Hola, ¿qué archivos tengo?",
            db=mock_db,
            user_id=1,
        )

    assert isinstance(reply, str)
    assert len(reply) > 0
    assert files_used == 0  # No files in mock DB


@pytest.mark.asyncio
async def test_chat_with_history():
    """The chat service should include conversation history in the LLM call."""
    mock_response = MagicMock()
    mock_response.content = "Sí, tienes un PDF llamado factura.pdf."

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=mock_response)

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_db.execute = AsyncMock(return_value=mock_result)

    history = [
        {"role": "user", "content": "Hola"},
        {"role": "assistant", "content": "Hola! ¿En qué puedo ayudarte?"},
    ]

    with patch("app.features.openai.chat.get_llm", return_value=mock_llm):
        reply, files_used = await chat_with_assistant(
            message="¿Tengo algún PDF?",
            db=mock_db,
            user_id=1,
            history=history,
        )

    assert isinstance(reply, str)
    assert len(reply) > 0
    # Verify history was passed: system + 2 history msgs + 1 user msg = 4
    call_args = mock_llm.ainvoke.call_args[0][0]
    assert len(call_args) == 4
    assert call_args[0]["role"] == "system"
    assert call_args[1]["role"] == "user"
    assert call_args[2]["role"] == "assistant"
    assert call_args[3]["role"] == "user"


@pytest.mark.asyncio
async def test_chat_includes_file_context():
    """The system prompt should include the user's file inventory."""
    mock_file = MagicMock()
    mock_file.name = "factura.pdf"
    mock_file.description = "Factura de marzo"
    mock_file.path = "/Facturas"
    mock_file.file_type = "file"
    mock_file.mime_type = "application/pdf"
    mock_file.size = 1024

    mock_response = MagicMock()
    mock_response.content = "Tienes un archivo: factura.pdf en /Facturas."

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=mock_response)

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_file]
    mock_db.execute = AsyncMock(return_value=mock_result)

    with patch("app.features.openai.chat.get_llm", return_value=mock_llm):
        reply, files_used = await chat_with_assistant(
            message="¿Qué archivos tengo?",
            db=mock_db,
            user_id=1,
        )

    assert files_used == 1
    # Verify the system prompt includes the file info
    call_args = mock_llm.ainvoke.call_args[0][0]
    system_content = call_args[0]["content"]
    assert "factura.pdf" in system_content
    assert "/Facturas" in system_content


@pytest.mark.asyncio
async def test_chat_handles_llm_error():
    """If GPT-4o fails, the service should return a friendly fallback message."""
    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(side_effect=Exception("API timeout"))

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_db.execute = AsyncMock(return_value=mock_result)

    with patch("app.features.openai.chat.get_llm", return_value=mock_llm):
        reply, files_used = await chat_with_assistant(
            message="Hola",
            db=mock_db,
            user_id=1,
        )

    assert "error" in reply.lower() or "inténtalo" in reply.lower()
    assert files_used == 0
