"""
Common repositories module.

This module contains repositories base and shared interfaces.
"""
from .base import BaseRepository
from .interface import IRepository

__all__ = ["BaseRepository", "IRepository"]
