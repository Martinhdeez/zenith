from os import path, getenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Priority: .env (if exists) overrides .env.dev
env_files = [".env.dev"]
if path.exists(".env"):
    env_files.append(".env")

# If ENV_FILE is explicitly set, use ONLY that one (standard behavior)
if getenv("ENV_FILE"):
    env_files = [getenv("ENV_FILE")]


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    PROJECT_NAME: str = "Zenith"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Database (PostgreSQL + pgvector)
    DATABASE_URL: str
    
    # OpenAI
    OPENAI_API_KEY: str
    
    # Almacenamiento físico de archivos
    STORAGE_PATH: str = "/app/storage"
    
    # Cloudinary
    CLOUDINARY_URL: str
    
    # OAuth Providers
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    
    # Security
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Session
    SESSION_SECRET: str = "default_unsafe_session_secret_for_dev_only"
    
    # Frontend URL for redirects
    FRONTEND_URL: str = "http://localhost:5173"
    
    model_config = SettingsConfigDict(
        env_file=env_files,
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()