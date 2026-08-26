
# Copyright 2026 Ravinder Singh
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import os

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()


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

    # Email verification delivery. Keep this disabled by default locally: the
    # client exposes the simulated code in development instead.
    SMTP_ENABLED: bool = False
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_TLS: bool = False
    SMTP_FROM: str = "noreply@aurelinx.local"
    SMTP_FROM_NAME: str = "Aurelinx"
    SMTP_TIMEOUT_SECONDS: int = 15
    EMAIL_VERIFICATION_EXPIRE_SECONDS: int = 600

    # LLM Providers
    OPENAI_API_KEY: str | None = None
    CLAUDE_API_KEY: str | None = None
    GROQ_API_KEY: str | None = None
    OPENCODE_ZEN: str | None = None

    # Vector Search
    EMBEDDING_MODEL: str = "text-embedding-3-small"

    # OAuth Settings
    GOOGLE_CLIENT_ID: str | None = None
    GOOGLE_CLIENT_SECRET: str | None = None
    GITHUB_CLIENT_ID: str | None = None
    GITHUB_CLIENT_SECRET: str | None = None

    # Configuration
    model_config = SettingsConfigDict(case_sensitive=True, extra="allow")

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
        self.OPENCODE_ZEN = os.getenv("OPENCODE_ZEN")
        self.ENVIRONMENT = os.getenv("ENVIRONMENT", self.ENVIRONMENT)
        self.REQUIRE_HTTPS = self._parse_bool(
            os.getenv("REQUIRE_HTTPS", self.REQUIRE_HTTPS)
        )
        self.DEBUG = self._parse_bool(os.getenv("DEBUG", self.DEBUG))
        self.SMTP_ENABLED = self._parse_bool(os.getenv("SMTP_ENABLED", self.SMTP_ENABLED))
        self.SMTP_TLS = self._parse_bool(os.getenv("SMTP_TLS", self.SMTP_TLS))
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
    def _parse_allowed_origins(raw: str | None, current: list[str] | str) -> list[str]:
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
