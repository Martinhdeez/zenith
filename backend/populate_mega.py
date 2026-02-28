
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

# PARA Structure - MEGA DATASET
DATA_TO_SEED = [
    # PROJECTS (Active goals)
    {"name": "Zenith Hackathon", "path": "/Projects", "file_type": "dir", "desc": "Hackathon 2026 Core Project"},
    {"name": "Pitch_Deck.md", "path": "/Projects/Zenith Hackathon", "file_type": "file", "mime": "text/markdown", "content": "# Zenith Pitch\n- User Problem: Information Overload\n- Solution: Frictionless Brain\n- Tech: AI Agents + PGVector", "desc": "Final presentation script"},
    {"name": "Feature_Roadmap.txt", "path": "/Projects/Zenith Hackathon", "file_type": "file", "mime": "text/plain", "content": "1. OCR\n2. Web Scraper\n3. Mobile App\n4. Multi-user support", "desc": "Future ideas"},
    {"name": "Feedback_Session.ogg", "path": "/Projects/Zenith Hackathon", "file_type": "file", "mime": "audio/ogg", "transcription": "The mentor suggested focusing on the 'Save to Pending' feature as it's very unique for deep focus. We should also highlight the Raspberry Pi deployment.", "desc": "Notes from mentor feedback"},

    {"name": "Startup Launch", "path": "/Projects", "file_type": "dir", "desc": "New SaaS business plan"},
    {"name": "Market_Analysis.md", "path": "/Projects/Startup Launch", "file_type": "file", "mime": "text/markdown", "content": "Competitors: Notion, Obsidian, Evernote. Zenith wins on AI-native organization.", "desc": "Competitive landscape"},
    {"name": "BusinessModel.json", "path": "/Projects/Startup Launch", "file_type": "file", "mime": "application/json", "content": '{"revenue": "SaaS Subscription", "target": "Knowledge Workers"}', "desc": "Monetization strategy"},

    # AREAS (Ongoing responsibilities)
    {"name": "Finance", "path": "/Areas", "file_type": "dir", "desc": "Personal wealth and taxes"},
    {"name": "Investment_Strategy.md", "path": "/Areas/Finance", "file_type": "file", "mime": "text/markdown", "content": "70% World Index, 20% Tech, 10% Crypto. Rebalance every quarter.", "desc": "Portfolio allocation"},
    {"name": "Tax_Return_2025.txt", "path": "/Areas/Finance", "file_type": "file", "mime": "text/plain", "content": "Deductible expenses: Work equipment, software subscriptions, office rent.", "desc": "Tax preparation notes"},

    {"name": "Health & Fitness", "path": "/Areas", "file_type": "dir", "desc": "Body health and longevity"},
    {"name": "Marathon_Training.md", "path": "/Areas/Health & Fitness", "file_type": "file", "mime": "text/markdown", "content": "Week 1: 20km total. Week 2: 25km. Focus on zone 2 heart rate.", "desc": "Running schedule"},
    {"name": "Blood_Work_Results.txt", "path": "/Areas/Health & Fitness", "file_type": "file", "mime": "text/plain", "content": "Vitamin D is a bit low. Iron levels look perfect.", "desc": "Medical notes"},

    {"name": "Travel Planning", "path": "/Areas", "file_type": "dir", "desc": "Upcoming trips and bucket list"},
    {"name": "Japan_Itinerary.md", "path": "/Areas/Travel Planning", "file_type": "file", "mime": "text/markdown", "content": "Day 1-3: Tokyo. Day 4-6: Kyoto. Day 7-10: Osaka. Visit Fushimi Inari at dawn.", "desc": "Detailed Japan trip plan"},
    {"name": "Flight_Details.txt", "path": "/Areas/Travel Planning", "file_type": "file", "mime": "text/plain", "content": "NH203. Departure 10:00 AM. Terminal 4.", "desc": "Logistical info"},

    # RESOURCES (Interests, topics)
    {"name": "Artificial Intelligence", "path": "/Resources", "file_type": "dir", "desc": "Papers, tutorials, and AI trends"},
    {"name": "RAG_Techniques.md", "path": "/Resources/Artificial Intelligence", "file_type": "file", "mime": "text/markdown", "content": "HyDE, Corrective RAG, and Agentic RAG compared. Use chunking size of 512.", "desc": "Deep dive into RAG"},
    {"name": "History_of_LLMs.txt", "path": "/Resources/Artificial Intelligence", "file_type": "file", "mime": "text/plain", "content": "From GPT-1 to GPT-4o. The rise of the Transformer architecture.", "desc": "Historical overview"},

    {"name": "Philosophy", "path": "/Resources", "file_type": "dir", "desc": "Books and thoughts on existence"},
    {"name": "Stoicism_Notes.md", "path": "/Resources/Philosophy", "file_type": "file", "mime": "text/markdown", "content": "The dichotomy of control. Focus on what you can change.", "desc": "Meditations summary"},
    {"name": "Existentialism.txt", "path": "/Resources/Philosophy", "file_type": "file", "mime": "text/plain", "content": "Sartre vs Camus. The myth of Sisyphus.", "desc": "Quick definitions"},

    {"name": "Cybersecurity", "path": "/Resources", "file_type": "dir", "desc": "Security tools and best practices"},
    {"name": "Web_Pentesting.md", "path": "/Resources/Cybersecurity", "file_type": "file", "mime": "text/markdown", "content": "XSS, SQLi, and CSRF patterns. How to use Burp Suite effectively.", "desc": "Security study guide"},
    {"name": "Password_Policy.txt", "path": "/Resources/Cybersecurity", "file_type": "file", "mime": "text/plain", "content": "Use bcrypt with salt. Minimum 12 characters, no common patterns.", "desc": "Dev best practices"},

    # ARCHIVE (Completed work)
    {"name": "University 2024", "path": "/Archive", "file_type": "dir", "desc": "CS Degree materials"},
    {"name": "Distributed_Systems_Final.pdf", "path": "/Archive/University 2024", "file_type": "file", "mime": "application/pdf", "desc": "Thesis on Paxos and Raft consensus algorithms"},
    {"name": "Calculus_Exam.md", "path": "/Archive/University 2024", "file_type": "file", "mime": "text/markdown", "content": "Derivatives, integrals, and Taylor series. Passed with 9/10.", "desc": "Graded exam"},

    {"name": "Old Job (Corp)", "path": "/Archive", "file_type": "dir", "desc": "Company materials from previous tenure"},
    {"name": "Quarterly_Report_Q4.json", "path": "/Archive/Old Job (Corp)", "file_type": "file", "mime": "application/json", "content": '{"sales": 1000000, "churn": 0.05}', "desc": "Historical data"},
    {"name": "Team_Structure.txt", "path": "/Archive/Old Job (Corp)", "file_type": "file", "mime": "text/plain", "content": "Org chart for the engineering department.", "desc": "Reference material"},
]

# Generate even more random data for "volume"
for i in range(25):
    category = random.choice(["Projects", "Areas", "Resources", "Archive"])
    DATA_TO_SEED.append({
        "name": f"Item_{i}_{random.randint(100,999)}.txt",
        "path": f"/{category}",
        "file_type": "file",
        "mime": "text/plain",
        "content": f"Random knowledge bit number {i}. This reflects a snippet of information related to {category}.",
        "desc": f"Random entry in {category}"
    })

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
        print("🚀 Starting MEGA mockup data population for USER_ID:", user_id)

        all_texts_for_embeddings = []
        for item in DATA_TO_SEED:
            text = f"{item['name']} {item.get('desc', '')} {item.get('content', '')} {item.get('transcription', '')}"
            all_texts_for_embeddings.append(text)

        print(f"🧠 Generating {len(all_texts_for_embeddings)} embeddings via OpenAI (this take 3-5s)...")
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
            # print(f"✅ Added {item['file_type']}: {item['name']} in {item['path']}")

        await session.commit()
        print(f"\n✨ SUCCESS: Your Digital Brain is now populated with {len(DATA_TO_SEED)} new items!")

if __name__ == "__main__":
    asyncio.run(populate())
