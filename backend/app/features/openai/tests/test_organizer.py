"""
Tests for the Smart File Organizer.
Validates that GPT-4o correctly suggests file paths based on folder context.
"""
import pytest
from app.features.openai.organizer import suggest_file_path, PathSuggestion


# ──────────────────────────────────────────────
# Path suggestion with existing folders
# ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_suggest_path_matches_existing_folder():
    """When a clear matching folder exists, the AI should pick it."""
    result = await suggest_file_path(
        filename="factura_marzo_2026.pdf",
        mime_type="application/pdf",
        existing_folders=["/Facturas", "/Fotos", "/Proyectos"],
    )

    assert isinstance(result, PathSuggestion)
    assert result.path.startswith("/")
    # The AI should pick /Facturas or a related name for an invoice file
    # We check if it's either in the existing list or it's a very similar name
    assert result.path in ["/Facturas", "/facturas", "/Invoices", "/invoices"] or not result.new_folder
    assert len(result.reason) > 0


@pytest.mark.asyncio
async def test_suggest_path_creates_new_folder():
    """When no folder matches, the AI should suggest creating a new one."""
    result = await suggest_file_path(
        filename="receta_medica_dr_garcia.pdf",
        mime_type="application/pdf",
        existing_folders=["/Facturas", "/Fotos"],
    )

    assert isinstance(result, PathSuggestion)
    assert result.path.startswith("/")
    # Should probably suggest something like /Salud, /Medicina, /Doctor
    assert result.new_folder is True
    assert len(result.reason) > 0


@pytest.mark.asyncio
async def test_suggest_path_empty_folders():
    """With no existing folders, the AI must create a new one."""
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
    result = await suggest_file_path(
        filename="screenshot_dashboard.png",
        mime_type="image/png",
        existing_folders=["/Documents", "/Images", "/Projects"],
    )

    assert isinstance(result, PathSuggestion)
    assert result.path.startswith("/")
    # Should pick /Images or something image-related
    assert "image" in result.path.lower() or "foto" in result.path.lower() or result.path == "/Images"
    assert len(result.reason) > 0


@pytest.mark.asyncio
async def test_suggest_path_returns_valid_json():
    """The response should always be a valid PathSuggestion."""
    result = await suggest_file_path(
        filename="meeting_notes.docx",
        mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        existing_folders=["/Work", "/Personal", "/Archive"],
    )

    assert isinstance(result, PathSuggestion)
    assert isinstance(result.path, str)
    assert isinstance(result.new_folder, bool)
    assert isinstance(result.reason, str)
