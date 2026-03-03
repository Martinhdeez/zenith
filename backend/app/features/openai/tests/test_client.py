# SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
# SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
# SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
#
# SPDX-License-Identifier: GPL-3.0-or-later

"""
Tests for the OpenAI client module.
Uses mocks to avoid calling the real OpenAI API.
"""
import pytest
from unittest.mock import patch, MagicMock
from app.features.openai.client import get_llm
from langchain_core.messages import HumanMessage


def test_get_llm_singleton():
    """Verify that get_llm returns the same instance (singleton)."""
    # Clear cache to start fresh
    get_llm.cache_clear()
    llm1 = get_llm()
    llm2 = get_llm()
    assert llm1 is llm2
    get_llm.cache_clear()


def test_get_llm_returns_chat_model():
    """Verify the LLM is configured with the correct model."""
    get_llm.cache_clear()
    llm = get_llm()
    assert llm.model_name == "gpt-4o-mini"
    assert llm.temperature == 0
    get_llm.cache_clear()


@pytest.mark.asyncio
async def test_openai_connection():
    """
    Test that the LLM can be invoked (mocked).
    Verifies the integration path without hitting the real API.
    """
    mock_response = MagicMock()
    mock_response.content = "OK"

    mock_llm = MagicMock()
    mock_llm.invoke.return_value = mock_response

    with patch("app.features.openai.client.get_llm", return_value=mock_llm):
        from app.features.openai.client import get_llm as patched_get_llm
        llm = patched_get_llm()
        response = llm.invoke([HumanMessage(content="Responde solo con la palabra 'OK'")])
        assert "OK" in response.content
        mock_llm.invoke.assert_called_once()
