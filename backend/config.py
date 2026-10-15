"""Environment configuration, shared by the app and migration runner."""

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy.engine import URL, make_url


def load_environment() -> None:
    load_dotenv(Path(__file__).with_name(".env"), override=False)


def database_url(raw: str) -> URL:
    url = make_url(raw)
    if url.drivername in {"postgres", "postgresql", "postgresql+psycopg"}:
        return url.set(drivername="postgresql+psycopg")
    if url.drivername == "sqlite":
        return url  # Local development and regression tests only.
    raise ValueError("DATABASE_URL must use PostgreSQL (psycopg3) or local SQLite")


@dataclass(frozen=True)
class Settings:
    database_url: str
    publish_token: str
    firebase_json: str | None = None
    firebase_base64: str | None = None

    def __post_init__(self) -> None:
        if not self.publish_token or not self.publish_token.strip():
            raise ValueError("PUBLISH_TOKEN is required and must not be blank")
        if not self.database_url:
            raise ValueError("DATABASE_URL is required")
        database_url(self.database_url)

    @classmethod
    def from_env(cls) -> "Settings":
        load_environment()
        return cls(
            database_url=os.environ.get("DATABASE_URL", ""),
            publish_token=os.environ.get("PUBLISH_TOKEN", ""),
            firebase_json=os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON") or None,
            firebase_base64=os.environ.get("FIREBASE_SERVICE_ACCOUNT_BASE64") or None,
        )


def frontend_origins() -> list[str]:
    """Comma-separated static-site origins; public cross-origin access by default."""
    load_environment()
    raw = os.environ.get("FRONTEND_ORIGINS", "*")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]
