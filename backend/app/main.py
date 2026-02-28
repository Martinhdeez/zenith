from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from app.features.auth.router import router as auth_router
from app.features.user.router import router as user_router
from app.features.file.router import router as file_router
from app.features.openai.router import router as ai_router

app = FastAPI(
    title="Zenith API",
    description="API para Zenith - Gestión de archivos con IA",
    version="1.0.0"
)

# Configurar CORS

# Configuración de CORS
# Permitimos todos los orígenes para desarrollo/hackathon, 
# pero idealmente se restringiría a los dominios del frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base API Router
api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(user_router, prefix="/users", tags=["users"])
api_router.include_router(file_router, prefix="/files", tags=["files"])
api_router.include_router(ai_router, prefix="/ai", tags=["ai"])

# Include everything with /api prefix
app.include_router(api_router, prefix="/api")

@app.get("/api")
async def root():
    return {"message": "Zenith API - Bienvenido"}

@app.get("/health")
async def health_check():
    """
    Endpoint de health check para verificar que el servicio está funcionando.
    Usado por Docker healthcheck.
    """
    return {"status": "healthy", "service": "zenith-backend"}

