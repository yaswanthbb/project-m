"""Run versioned upgrades; no app token or Firebase credentials are needed."""

import argparse
import os
from pathlib import Path

from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import text

from config import database_url, load_environment
from database import make_engine


def alembic_config() -> Config:
    return Config(str(Path(__file__).with_name("alembic.ini")))


def upgrade_database(raw_url: str, *, require_postgres: bool = False) -> str:
    url = database_url(raw_url)
    if require_postgres and url.get_backend_name() != "postgresql":
        raise ValueError("--require-postgres requires a PostgreSQL DATABASE_URL")
    engine = make_engine(raw_url)
    try:
        with engine.begin() as connection:
            if url.get_backend_name() == "postgresql":
                # Serialize concurrent migration invocations on the same database.
                connection.execute(text("SELECT pg_advisory_xact_lock(730121042)"))
            config = alembic_config()
            config.attributes["connection"] = connection
            command.upgrade(config, "head")
            current = MigrationContext.configure(connection).get_current_revision()
            if current != ScriptDirectory.from_config(config).get_current_head():
                raise RuntimeError("Database did not reach Alembic head")
        return current
    finally:
        engine.dispose()


def main():
    parser = argparse.ArgumentParser(description="Upgrade the database to Alembic head")
    parser.add_argument(
        "--require-postgres",
        action="store_true",
        help="Refuse SQLite or other non-Postgres targets",
    )
    args = parser.parse_args()
    load_environment()
    raw_url = os.environ.get("DATABASE_URL", "")
    if not raw_url:
        parser.error("DATABASE_URL is required")
    try:
        revision = upgrade_database(raw_url, require_postgres=args.require_postgres)
    except Exception as exc:
        # Avoid printing database credentials from driver errors.
        parser.exit(
            1,
            f"Migration failed ({type(exc).__name__}); verify database connectivity and migration configuration.\n",
        )
    print(f"Database upgraded to {revision}")


if __name__ == "__main__":
    main()
