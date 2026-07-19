from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os


class Settings(BaseSettings):
    """Production-grade application settings"""

    # App Settings
    APP_NAME: str = "Aurelinx"
    VERSION: str = "1.0.0"
    DEBUG: bool | str = False
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = (
        "postgresql+psycopg://aurelinx:aurelinx_password@localhost:5432/aurelinx_db"
    )

    # Security
    SECRET_KEY: str = "your-secret-key-min-32-chars-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALGORITHM: str = "HS256"
    REQUIRE_HTTPS: bool = False

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"
    ALLOWED_ORIGINS: list[str] | str = [
        "http://localhost:3000",
        "http://localhost:3100",
        "http://localhost:5173",
        "http://localhost:5175",
    ]
    ALLOW_ORIGIN_REGEX: str = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"
    # Trusted hosts (for TrustedHostMiddleware) - comma separated env variable supported
    ALLOWED_HOSTS: list[str] | str = []

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    REQUESTS_PER_MINUTE: int = 100

    # Logging
    LOG_LEVEL: str = "INFO"

    # LLM Providers
    OPENAI_API_KEY: Optional[str] = None
    CLAUDE_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None

    # Vector Search
    EMBEDDING_MODEL: str = "text-embedding-3-small"

    # OAuth Settings
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[str] = None

    # Configuration
    model_config = SettingsConfigDict(
        env_file=".env", case_sensitive=True, extra="allow"
    )

    def __init__(self, **data):
        super().__init__(**data)
        # Load OAuth variables
        self.GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
        self.GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
        self.GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
        self.GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
        # Override with environment variables if they exist
        self.DATABASE_URL = os.getenv("DATABASE_URL", self.DATABASE_URL)
        self.SECRET_KEY = os.getenv("SECRET_KEY", self.SECRET_KEY)
        self.OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
        self.CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY")
        self.GROQ_API_KEY = os.getenv("GROQ_API_KEY")
        self.ENVIRONMENT = os.getenv("ENVIRONMENT", self.ENVIRONMENT)
        self.REQUIRE_HTTPS = self._parse_bool(
            os.getenv("REQUIRE_HTTPS", self.REQUIRE_HTTPS)
        )
        self.DEBUG = self._parse_bool(os.getenv("DEBUG", self.DEBUG))
        self.ALLOWED_ORIGINS = self._parse_allowed_origins(
            os.getenv("ALLOWED_ORIGINS"),
            self.ALLOWED_ORIGINS,
        )
        # Parse ALLOWED_HOSTS env var (comma-separated) into list
        raw_hosts = os.getenv("ALLOWED_HOSTS", "")
        if raw_hosts:
            self.ALLOWED_HOSTS = [h.strip() for h in raw_hosts.split(",") if h.strip()]
        self.ALLOW_ORIGIN_REGEX = os.getenv(
            "ALLOW_ORIGIN_REGEX", self.ALLOW_ORIGIN_REGEX
        )

    @staticmethod
    def _parse_bool(value: object) -> bool:
        """Coerce permissive env values into bool."""
        if isinstance(value, bool):
            return value
        normalized = str(value).strip().lower()
        return normalized in {"1", "true", "yes", "on", "debug", "dev", "development"}

    @staticmethod
    def _parse_allowed_origins(
        raw: Optional[str], current: list[str] | str
    ) -> list[str]:
        """Accept ALLOWED_ORIGINS as comma-separated env value and merge safely."""
        if isinstance(current, str):
            defaults = {item.strip() for item in current.split(",") if item.strip()}
        else:
            defaults = set(current or [])
        # Ensure local dev defaults are always included.
        defaults.update(
            {
                "http://localhost:3000",
                "http://localhost:3100",
                "http://localhost:5173",
                "http://localhost:5175",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:3100",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:5175",
            }
        )
        if not raw:
            return sorted(defaults)

        extra = [item.strip() for item in raw.split(",") if item.strip()]
        merged = defaults.union(extra)
        return sorted(merged)


# Global settings instance
settings = Settings()

# Validation - fail fast if critical settings missing
if not settings.DATABASE_URL:
    raise ValueError("DATABASE_URL must be set")

if len(settings.SECRET_KEY) < 32:
    raise ValueError("SECRET_KEY must be at least 32 characters")

if settings.ENVIRONMENT == "production":
    if settings.DEBUG:
        raise ValueError("DEBUG cannot be True in production")
