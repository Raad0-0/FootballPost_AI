"""Application configuration loaded from environment variables / .env file."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration for the ClubPost backend.

    Values are read from environment variables first, then from a `.env` file
    located in the `backend/` directory.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    SECRET_KEY: str = "dev-secret-change-me"
    DATABASE_URL: str = "sqlite:///./clubpost.db"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    ALGORITHM: str = "HS256"
    API_DAILY_LIMIT: int = 100
    LIVE_POLL_INTERVAL_SECONDS: int = 300
    MANUAL_FETCH_COOLDOWN_SECONDS: int = 45
    GEMINI_API_KEY: str = ""
    FOOTBALL_PROVIDER: str = "auto"
    FOOTBALL_DATA_API_KEY: str = ""
    API_FOOTBALL_KEY: str = ""
    CORS_ORIGINS: str = "*"


settings = Settings()
