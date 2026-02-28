
import asyncio
import os
import random
from datetime import datetime
from typing import List, Optional

# Mocking the environment to use the backend settings
os.environ["DATABASE_URL"] = "postgresql+asyncpg://zenith_user:zenith_password_cambiar@db:5432/zenith_db"

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.features.file.model import File
from app.features.user.model import User
from app.features.openai.embedding import generate_embeddings_batch
from app.core.database import Base

# PARA Structure
DATA_TO_SEED = [
    # PROJECTS
    {"name": "Zenith Hackathon", "path": "/Projects", "file_type": "dir", "desc": "Current main project for UDC Hack 2026"},
    {"name": "Architecture.md", "path": "/Projects/Zenith Hackathon", "file_type": "file", "mime": "text/markdown", "content": "# Zenith Architecture\nFastAPI backend with PostgreSQL/pgvector and React/Vite frontend. UI features glassmorphism and modern icons.", "desc": "Backend/Frontend blueprint"},
    {"name": "Pitch Ideas.txt", "path": "/Projects/Zenith Hackathon", "file_type": "file", "mime": "text/plain", "content": "- Focus on frictionless capture\n- AI study tools are the killer feature\n- Digital brain concept", "desc": "Brainstorming for the final presentation"},
    {"name": "Demo Audio.ogg", "path": "/Projects/Zenith Hackathon", "file_type": "file", "mime": "audio/ogg", "transcription": "Welcome to Zenith, your smarter digital brain. In this demo, we'll see how we can automatically organize files and generate study summaries using AI.", "desc": "App intro recording"},

    {"name": "Home Renovation", "path": "/Projects", "file_type": "dir", "desc": "Plans for kitchen and living room remodel"},
    {"name": "Kitchen Budget.json", "path": "/Projects/Home Renovation", "file_type": "file", "mime": "application/json", "content": '{"appliances": 5000, "cabinets": 8000, "labor": 4000}', "desc": "Cost breakdown"},
    {"name": "Contractor Notes.md", "path": "/Projects/Home Renovation", "file_type": "file", "mime": "text/markdown", "content": "Met with Carlos today. He suggests using quartz countertops for durability.", "desc": "Meeting summary"},

    # AREAS
    {"name": "Fitness", "path": "/Areas", "file_type": "dir", "desc": "Health and workout tracking"},
    {"name": "Daily Routine.md", "path": "/Areas/Fitness", "file_type": "file", "mime": "text/markdown", "content": "Morning: 5km run. Evening: Weighted squats and bench press.", "desc": "Daily exercise plan"},
    {"name": "Supplements Info.txt", "path": "/Areas/Fitness", "file_type": "file", "mime": "text/plain", "content": "Creatine 5g daily. Whey protein after workouts.", "desc": "Nutrition notes"},

    {"name": "Cooking", "path": "/Areas", "file_type": "dir", "desc": "Recipes and meal prep ideas"},
    {"name": "Italian Lasagna.md", "path": "/Areas/Cooking", "file_type": "file", "mime": "text/markdown", "content": "1. Make ragu.\n2. Layer pasta with bechamel.\n3. Bake at 180C for 40 mins.", "desc": "Authentic family recipe"},
    {"name": "Quick Breakfasts.txt", "path": "/Areas/Cooking", "file_type": "file", "mime": "text/plain", "content": "- Oatmeal with blueberries\n- Avocado toast with eggs", "desc": "Ideas for busy mornings"},

    # RESOURCES
    {"name": "AI Research", "path": "/Resources", "file_type": "dir", "desc": "Machine Learning and LLM papers/notes"},
    {"name": "Transformer Paper.md", "path": "/Resources/AI Research", "file_type": "file", "mime": "text/markdown", "content": "Discussion on Attention is All You Need. Focus on multi-head attention and positional encodings.", "desc": "Study notes on Transformers"},
    {"name": "Vector Databases.txt", "path": "/Resources/AI Research", "file_type": "file", "mime": "text/plain", "content": "Comparison between Pinecone, Weaviate, and PGVector. Zenith uses PGVector.", "desc": "Database tech research"},

    {"name": "Programming", "path": "/Resources", "file_type": "dir", "desc": "Coding tips and design patterns"},
    {"name": "FastAPI Patterns.md", "path": "/Resources/Programming", "file_type": "file", "mime": "text/markdown", "content": "Always use dependency injection for DB sessions. Use BackgroundTasks for slow IO.", "desc": "Back-end dev best practices"},
    {"name": "React Hooks guide.txt", "path": "/Resources/Programming", "file_type": "file", "mime": "text/plain", "content": "useEffect vs useLayoutEffect correctly explained.", "desc": "Frontend notes"},

    # ARCHIVE
    {"name": "University 2024", "path": "/Archive", "file_type": "dir", "desc": "Completed courses and degrees"},
    {"name": "Operating Systems Final.pdf", "path": "/Archive/University 2024", "file_type": "file", "mime": "application/pdf", "desc": "Project on kernel scheduling in Linux"},
    {"name": "Algebre Exam Notes.md", "path": "/Archive/University 2024", "file_type": "file", "mime": "text/markdown", "content": "Focus on Eigenvalues and Eigenvectors. LU decomposition steps.", "desc": "Old exam review"},
]

async def populate():
    # Setup connection
    engine = create_async_engine(os.environ["DATABASE_URL"])
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with AsyncSessionLocal() as session:
        # Fetch the first user
        result = await session.execute(select(User).limit(1))
        user = result.scalar_one_or_none()
        
        if not user:
            print("❌ ERROR: No users found in database. Please register a user first.")
            return

        user_id = user.id
        print("🚀 Starting mockup data population for USER_ID:", user_id)

        all_texts_for_embeddings = []
        for item in DATA_TO_SEED:
            text = f"{item['name']} {item.get('desc', '')} {item.get('content', '')} {item.get('transcription', '')}"
            all_texts_for_embeddings.append(text)

        print(f"🧠 Generating {len(all_texts_for_embeddings)} embeddings via OpenAI...")
        embeddings = generate_embeddings_batch(all_texts_for_embeddings)

        for i, item in enumerate(DATA_TO_SEED):
            new_file = File(
                user_id=user_id,
                name=item["name"],
                description=item.get("desc"),
                path=item["path"],
                file_type=item["file_type"],
                mime_type=item.get("mime"),
                url=f"https://example.com/mock/{item['name']}" if item["file_type"] == "file" else None,
                size=random.randint(500, 50000) if item["file_type"] == "file" else 0,
                format=item["name"].split(".")[-1] if "." in item["name"] else None,
                transcription=item.get("transcription"),
                embedding=embeddings[i]
            )
            session.add(new_file)
            print(f"✅ Added {item['file_type']}: {item['name']} in {item['path']}")

        await session.commit()
        print("\n✨ SUCCESS: Your Digital Brain is now populated with knowledge!")

if __name__ == "__main__":
    asyncio.run(populate())
