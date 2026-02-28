# SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
# SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
# SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
#
# SPDX-License-Identifier: GPL-3.0-or-later

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os

async def test_db():
    url = os.getenv("DATABASE_URL")
    print(f"Testing URL: {url}")
    engine = create_async_engine(url)
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'files';"))
        columns = [row[0] for row in result.all()]
        print(f"Columns in DB according to information_schema: {columns}")
        
        try:
            result = await conn.execute(text("SELECT transcription FROM files LIMIT 1;"))
            print("Successfully queried 'transcription' column.")
        except Exception as e:
            print(f"Failed to query 'transcription' column: {e}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_db())
