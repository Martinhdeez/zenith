"""
Tests for the Smart File Organizer.
Validates the path suggestion logic with mocked LLM responses.
"""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from app.features.openai.organizer import suggest_file_path, PathSuggestion


# ──────────────────────────────────────────────
# Path suggestion with existing folders
# ──────────────────────────────────────────────

def _mock_llm_response(json_str: str):
    """Create a mocked LLM that returns the given JSON string."""
    mock_response = MagicMock()
    mock_response.content = json_str

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=mock_response)
    return mock_llm


@pytest.mark.asyncio
async def test_suggest_path_matches_existing_folder():
    """When a clear matching folder exists, the AI should pick it."""
    mock_llm = _mock_llm_response(
        '{"path": "/Facturas", "new_folder": false, "reason": "Invoice matches existing Facturas folder"}'
    )

    with patch("app.features.openai.organizer.get_llm", return_value=mock_llm):
        result = await suggest_file_path(
            filename="factura_marzo_2026.pdf",
            mime_type="application/pdf",
            existing_folders=["/Facturas", "/Fotos", "/Proyectos"],
        )

    assert isinstance(result, PathSuggestion)
    assert result.path == "/Facturas"
    assert result.new_folder is False
    assert len(result.reason) > 0


@pytest.mark.asyncio
async def test_suggest_path_creates_new_folder():
    """When no folder matches, the AI should suggest creating a new one."""
    mock_llm = _mock_llm_response(
        '{"path": "/Salud", "new_folder": true, "reason": "Medical prescription doesn\'t fit existing folders"}'
    )

    with patch("app.features.openai.organizer.get_llm", return_value=mock_llm):
        result = await suggest_file_path(
            filename="receta_medica_dr_garcia.pdf",
            mime_type="application/pdf",
            existing_folders=["/Facturas", "/Fotos"],
        )

    assert isinstance(result, PathSuggestion)
    assert result.path == "/Salud"
    assert result.new_folder is True
    assert len(result.reason) > 0


@pytest.mark.asyncio
async def test_suggest_path_empty_folders():
    """With no existing folders, the AI must create a new one."""
    mock_llm = _mock_llm_response(
        '{"path": "/Photos", "new_folder": true, "reason": "New folder created for vacation photo"}'
    )

    with patch("app.features.openai.organizer.get_llm", return_value=mock_llm):
        result = await suggest_file_path(
            filename="vacation_photo.jpg",
            mime_type="image/jpeg",
            existing_folders=[],
        )

    assert isinstance(result, PathSuggestion)
    assert result.path.startswith("/")
    assert result.new_folder is True


@pytest.mark.asyncio
async def test_suggest_path_image_classification():
    """An image should be classified into a related folder."""
    mock_llm = _mock_llm_response(
        '{"path": "/Images", "new_folder": false, "reason": "Screenshot belongs in Images folder"}'
    )

    with patch("app.features.openai.organizer.get_llm", return_value=mock_llm):
        result = await suggest_file_path(
            filename="screenshot_dashboard.png",
            mime_type="image/png",
            existing_folders=["/Documents", "/Images", "/Projects"],
        )

    assert isinstance(result, PathSuggestion)
    assert result.path == "/Images"
    assert len(result.reason) > 0


@pytest.mark.asyncio
async def test_suggest_path_returns_valid_json():
    """The response should always be a valid PathSuggestion."""
    mock_llm = _mock_llm_response(
        '{"path": "/Work", "new_folder": false, "reason": "Meeting notes belong in Work folder"}'
    )

    with patch("app.features.openai.organizer.get_llm", return_value=mock_llm):
        result = await suggest_file_path(
            filename="meeting_notes.docx",
            mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            existing_folders=["/Work", "/Personal", "/Archive"],
        )

    assert isinstance(result, PathSuggestion)
    assert isinstance(result.path, str)
    assert isinstance(result.new_folder, bool)
    assert isinstance(result.reason, str)


@pytest.mark.asyncio
async def test_suggest_path_fallback_on_llm_error():
    """If the LLM fails, the organizer should fall back to /Uploads."""
    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(side_effect=Exception("API timeout"))

    with patch("app.features.openai.organizer.get_llm", return_value=mock_llm):
        result = await suggest_file_path(
            filename="random_file.txt",
            mime_type="text/plain",
            existing_folders=["/Docs"],
        )

    assert result.path == "/Uploads"
    assert result.new_folder is True
    assert "Fallback" in result.reason


@pytest.mark.asyncio
async def test_suggest_path_handles_markdown_wrapped_json():
    """If the LLM wraps JSON in markdown code blocks, it should still parse."""
    mock_llm = _mock_llm_response(
        '```json\n{"path": "/Facturas", "new_folder": false, "reason": "Parsed from markdown"}\n```'
    )

    with patch("app.features.openai.organizer.get_llm", return_value=mock_llm):
        result = await suggest_file_path(
            filename="factura.pdf",
            mime_type="application/pdf",
            existing_folders=["/Facturas"],
        )

    assert result.path == "/Facturas"
    assert result.new_folder is False
