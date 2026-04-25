"""
config.py — pydantic-settings environment validation.
App crashes at startup if any required var is missing (no silent defaults).
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Required — app crashes at startup if absent
    gemini_api_key: str
    qdrant_url: str
    qdrant_api_key: str

    # Optional with sensible defaults
    qdrant_collection_name: str = "notebooklm_chunks"
    environment: str = "development"

    # Model config — override via env vars if needed
    gemini_llm_model: str = "gemini-1.5-pro"
    gemini_embedding_model: str = "models/text-embedding-004"
    embedding_dimension: int = 768

    # GoSquad video generation
    gosquad_base_url: str = "https://generate.gosquad.club"
    gosquad_secret_token: str   # required — no default; missing → startup crash

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)


# Module-level singleton — instantiated once at import time.
# Missing required vars raise ValidationError before the server starts.
settings = Settings()
