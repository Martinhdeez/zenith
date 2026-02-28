import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.features.openai.embedding import generate_embedding, EMBEDDING_DIM
from app.features.file.model import File
from app.features.user.model import User

@pytest.mark.asyncio
async def test_file_embedding_storage(db_session: AsyncSession, test_user_data):
    """
    Test generating an embedding via DeepSeek API and saving it to the database
    in the pgvector column of the File model.
    """
    
    # 1. Provide a dummy user required for the foreign key
    test_user = User(**test_user_data)
    db_session.add(test_user)
    await db_session.flush()  # To get the test_user.id
    
    # 2. Text to embed
    file_description = "Este es un archivo financiero del Q1 2025."
    
    try:
        # 3. Call DeepSeek embedding API
        embedding_vector = generate_embedding(file_description)
        
        # Verify vector dimensions
        assert len(embedding_vector) == EMBEDDING_DIM, f"Expected {EMBEDDING_DIM} dims, got {len(embedding_vector)}"
        
        # 4. Create File record with the embedding
        new_file = File(
            user_id=test_user.id,
            name="informe_q1_2025.pdf",
            description=file_description,
            mime_type="application/pdf",
            path="/storage/informe_q1_2025.pdf",
            size=1024500,
            embedding=embedding_vector
        )
        
        # 5. Save to database
        db_session.add(new_file)
        await db_session.commit()
        await db_session.refresh(new_file)
        
        # 6. Retrieve from database to verify it was saved correctly
        stmt = select(File).where(File.id == new_file.id)
        result = await db_session.execute(stmt)
        saved_file = result.scalar_one()
        
        # 7. Assertions
        assert saved_file is not None
        assert saved_file.embedding is not None
        assert len(saved_file.embedding) == EMBEDDING_DIM
        # Check that the first value in the array matches (allowing minor float differences)
        assert abs(saved_file.embedding[0] - embedding_vector[0]) < 1e-4
        
    except Exception as e:
        pytest.fail(f"Fallo en la prueba de embeddings y DB: {str(e)}")
