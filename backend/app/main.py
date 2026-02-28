from fastapi import FastAPI
from app.features.auth.router import router as auth_router
from app.features.user.router import router as user_router
from app.features.file.router import router as file_router 

app = FastAPI(
    title="Zenith API",
    description="API para Zenith - Gestión de archivos con IA",
    version="1.0.0"
)

@app.get("/")
async def root():
    return {"message": "Zenith API - Bienvenido"}


@app.get("/health")
async def health_check():
    """
    Endpoint de health check para verificar que el servicio está funcionando.
    Usado por Docker healthcheck.
    """
    return {"status": "healthy", "service": "zenith-backend"}

# incluir routers
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(user_router, prefix="/users", tags=["users"])
app.include_router(file_router, prefix="/files", tags=["files"])
