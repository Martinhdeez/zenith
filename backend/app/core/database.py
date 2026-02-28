# SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
# SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
# SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
#
# SPDX-License-Identifier: GPL-3.0-or-later

"""
Database configuration with SQLAlchemy.
Optimized for production with connection pooling.
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

# Async database engine with production-ready pooling
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,  # Show SQL queries in development
    future=True,
    
    # ===== CONNECTION POOLING FOR SCALABILITY =====
    # Pool size: number of permanent connections
    # Rule of thumb: (2 * CPU cores) + effective_spindle_count
    # For 4 cores: 2*4 + 1 = 9, rounded to 10-20
    pool_size=20,
    
    # Max overflow: temporary connections during traffic spikes
    # Total max connections = pool_size + max_overflow
    max_overflow=10,  # Max 30 total connections
    
    # Pool recycle: close connections after this time (seconds)
    # Prevents stale connections and DB timeouts
    pool_recycle=3600,  # 1 hour
    
    # Pool pre-ping: verify connections before using them
    # Prevents errors from closed connections
    pool_pre_ping=True,
    
    # Pool timeout: max time to wait for available connection
    pool_timeout=30,  # 30 seconds
    
    # Echo pool: log pool checkouts/checkins (disable in production)
    echo_pool=False,
)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Base for models
Base = declarative_base()


# Dependency to get database session
async def get_db():
    """
    Dependency that provides a database session.
    Automatically closes when request completes.
    
    Usage:
        @app.get("/users/")
        async def get_users(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(User))
            return result.scalars().all()
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
