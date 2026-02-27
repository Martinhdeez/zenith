from os import getenv
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = ".env.dev"  # Default to development
if getenv("ENV_FILE") is not None:
    ENV_FILE = getenv("ENV_FILE")


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    PROJECT_NAME: str = "DevArena"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str # .env
    
    # Security
    JWT_SECRET: str  # .env
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()