from fastapi import FastAPI, APIRouter
from app.features.auth.router import router as auth_router
from app.features.user.router import router as user_router
from app.features.file.router import router as file_router 

app = FastAPI(
    title="Zenith API",
    description="API para Zenith - Gestión de archivos con IA",
    version="1.0.0"
)

# Base API Router
api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(user_router, prefix="/users", tags=["users"])
api_router.include_router(file_router, prefix="/files", tags=["files"])

# Include everything with /api prefix
app.include_router(api_router, prefix="/api")

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

