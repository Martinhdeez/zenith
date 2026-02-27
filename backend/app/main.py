from fastapi import FastAPI

from app.features.user.router import router as user_router
from app.features.auth.router import router as auth_router
from app.features.challenge.router import router as challenge_router
from app.features.challenge.router import language_router
from app.features.chat.router import router as chat_router

app = FastAPI(
    title="DevArena API",
    description="API para la plataforma DevArena",
    version="1.0.0"
)

# Register routers
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(user_router, prefix="/api/users", tags=["users"])
app.include_router(challenge_router, prefix="/api/challenges", tags=["challenges"])
app.include_router(language_router, prefix="/api/languages", tags=["languages"])
app.include_router(chat_router, prefix="/api/chat", tags=["chat"])


@app.get("/")
async def root():
    return {"message": "DevArena API - Bienvenido"}


@app.get("/health")
async def health_check():
    """
    Endpoint de health check para verificar que el servicio está funcionando.
    Usado por Docker healthcheck.
    """
    return {"status": "healthy", "service": "devarena-backend"}


@app.get("/test")
async def test_hot_reload():
    """
    Endpoint de prueba para verificar hot-reload.
    """
    return {"message": "Hot reload funciona correctamente!", "timestamp": "2026-02-12"}
