from fastapi import FastAPI

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
