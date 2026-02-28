import pytest
from app.features.openai.client import get_llm
from langchain_core.messages import HumanMessage

@pytest.mark.asyncio
async def test_openai_connection():
    """
    Integration test to verify OpenAI API connection.
    This test actually calls the OpenAI API.
    
    To run this test:
    docker exec zenith_backend pytest app/features/deepseek/tests/test_client.py -v
    """
    llm = get_llm()
    
    # Simple test prompt
    prompt = "Responde solo con la palabra 'OK' si recibes este mensaje."
    
    try:
        # Check if LLM can be invoked
        response = llm.invoke([HumanMessage(content=prompt)])
        
        # Verify response
        content = response.content.strip()
        assert "OK" in content
        
    except Exception as e:
        pytest.fail(f"Fallo en la conexión con la API de OpenAI: {str(e)}")

def test_get_llm_singleton():
    """Verify that get_llm returns the same instance (singleton)."""
    llm1 = get_llm()
    llm2 = get_llm()
    assert llm1 is llm2
