#!/bin/bash
# Database initialization script for development
set -e

echo "📦 DevArena Database Initialization"
echo "===================================="

# Check if we're inside Docker
if [ -f /.dockerenv ]; then
    echo "✅ Running inside Docker container"
    
    # Run migrations
    echo "🔧 Running Alembic migrations..."
    cd /app/alembic && alembic upgrade head
    
    echo "✅ Database initialized successfully!"
else
    echo "🐳 Running via Docker exec..."
    docker exec devarena_backend bash -c "cd /app/alembic && alembic upgrade head"
    
    echo "✅ Database initialized successfully!"
fi
