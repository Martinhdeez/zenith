# SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
# SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
# SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
#
# SPDX-License-Identifier: GPL-3.0-or-later

"""
OpenAI LLM Client — Zenith AI Engine.

Uses LangChain's ChatOpenAI for gpt-4o-mini, a faster and more
cost-effective model for document understanding and reasoning.
"""
from functools import lru_cache

from langchain_openai import ChatOpenAI
from app.core.config import settings


@lru_cache(maxsize=1)
def get_llm() -> ChatOpenAI:
    """
    Returns a singleton ChatOpenAI instance for Zenith.

    Configuration:
        - model: gpt-4o-mini
        - temperature: 0 (deterministic)
        - max_tokens: 4096

    Usage:
        from app.features.openai.client import get_llm
        llm = get_llm()
        response = llm.invoke("Hello Zenith...")
    """
    return ChatOpenAI(
        model="gpt-4o-mini",
        api_key=settings.OPENAI_API_KEY,
        temperature=0,
        max_tokens=4096,
    )
