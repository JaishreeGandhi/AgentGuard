import os
import secrets
import logging
from typing import Optional
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class Settings(BaseModel):
    APP_NAME: str = "AgentGuard API"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./agentguard.db")
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]
    # Configurable Model Identifier
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")

    # Privacy Settings
    STORE_USER_INPUT: bool = os.getenv("STORE_USER_INPUT", "false").lower() == "true"
    STORE_FULL_PROMPTS: bool = os.getenv("STORE_FULL_PROMPTS", "false").lower() == "true"
    AGENTGUARD_SECRET_KEY: Optional[str] = os.getenv("AGENTGUARD_SECRET_KEY")

    # Pricing reference (per million tokens)
    GEMINI_FLASH_INPUT_RATE_PER_M: float = 0.15
    GEMINI_FLASH_OUTPUT_RATE_PER_M: float = 0.60

settings = Settings()

# Ephemeral in-memory key storage for local development fallback
_ephemeral_secret_key: Optional[str] = None

def get_secret_key() -> str:
    """
    Returns the secret key used for HMAC-SHA256 query hashing.
    - Requires AGENTGUARD_SECRET_KEY in production environment.
    - Automatically falls back to an ephemeral in-memory random salt in development.
    """
    global _ephemeral_secret_key
    if settings.AGENTGUARD_SECRET_KEY and settings.AGENTGUARD_SECRET_KEY.strip():
        return settings.AGENTGUARD_SECRET_KEY.strip()

    if settings.ENVIRONMENT.lower() == "production":
        raise ValueError("AGENTGUARD_SECRET_KEY must be set in production environment.")

    if _ephemeral_secret_key is None:
        _ephemeral_secret_key = secrets.token_hex(32)
        logger.warning(
            "AGENTGUARD_SECRET_KEY not set. Using ephemeral in-memory key for development. "
            "Hashes will not persist across server restarts."
        )
    return _ephemeral_secret_key
