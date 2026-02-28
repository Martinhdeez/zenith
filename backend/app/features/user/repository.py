# SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
# SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
# SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
#
# SPDX-License-Identifier: GPL-3.0-or-later

"""
User repository.
Implements database operations for users.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.common.repositories import BaseRepository
from app.features.user.model import User


class UserRepository(BaseRepository[User]):
    """User repository with custom methods."""
    
    def __init__(self, db: AsyncSession):
        super().__init__(User, db)
    
    async def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        return await self.get_by_field("email", email)
    
    async def get_by_username(self, username: str) -> Optional[User]:
        """Get user by username."""
        return await self.get_by_field("username", username)
