from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = Field(default="EKIS Backend")
    app_env: str = Field(default="development")
    debug: bool = Field(default=False)

    database_url: str
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    # Issuer and audience bound into every JWT — tokens from other systems are rejected.
    jwt_issuer: str = Field(default="ekis-backend")
    jwt_audience: str = Field(default="ekis-client")
    gemini_api_key: str
    api_v1_prefix: str = Field(default="/api/v1")

    cors_origins: str = Field(default="http://localhost:3000")

    log_level: str = Field(default="INFO")

    # Maximum allowed file upload size in megabytes.
    max_upload_size_mb: int = Field(default=50)

    @property
    def cors_origin_list(self) -> list[str]:
        """Return configured CORS origins as a list."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings."""
    return Settings()


settings = get_settings()
