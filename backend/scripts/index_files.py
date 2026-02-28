"""
Script to generate embeddings for all files that don't have them.
Usage: docker exec zenith_backend python scripts/index_files.py
"""
import asyncio
import logging
import sys
import os

# Set up paths
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, update
from app.core.database import async_session_factory
from app.features.file.model import File
from app.features.openai.embedding import generate_embedding

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("index_files")

async def index_files():
    async with async_session_factory() as db:
        async with db.begin():
            # Get all files without embeddings
            stmt = select(File).where(File.embedding.isnot(None) == False)
            result = await db.execute(stmt)
            files = result.scalars().all()
            
            logger.info(f"Found {len(files)} files to index.")
            
            for file in files:
                try:
                    text_to_embed = f"{file.name} {file.description or ''}"
                    logger.info(f"Indexing file: {file.name} (ID: {file.id})")
                    
                    vector = generate_embedding(text_to_embed)
                    
                    # Update file in DB
                    file.embedding = vector
                    db.add(file)
                    
                except Exception as e:
                    logger.error(f"Failed to index file {file.id}: {e}")
            
            await db.commit()
            logger.info("Indexing complete.")

if __name__ == "__main__":
    asyncio.run(index_files())
