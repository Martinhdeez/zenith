#!/bin/bash
# Entrypoint script for Zenith backend container
# Runs database migrations and starts the application
set -e

echo "🚀 Starting Zenith Backend..."
echo "================================"

# Wait for database to be ready (extra safety on top of depends_on healthcheck)
echo "⏳ Waiting for database connection..."
python -c "
import time
import asyncio
from app.core.database import engine
from sqlalchemy import text

async def wait_for_db():
    retries = 30
    while retries > 0:
        try:
            async with engine.connect() as conn:
                await conn.execute(text('SELECT 1'))
            print('✅ Database is ready!')
            return
        except Exception as e:
            retries -= 1
            if retries == 0:
                raise
            print(f'⏳ Database not ready yet, retrying... ({30 - retries}/30)')
            time.sleep(1)

asyncio.run(wait_for_db())
"

# Run database migrations
echo "🔧 Running Alembic migrations..."
cd /app && alembic upgrade head

echo "✅ Migrations complete!"
echo "🌐 Starting FastAPI server..."
echo "================================"

# Return to app root directory before starting uvicorn
cd /app

# Start the application
# Incluimos --proxy-headers y --forwarded-allow-ips='*' para soportar proxies inversos (Nginx/Traefik)
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*' --reload
