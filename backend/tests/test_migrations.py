import pytest
from alembic import command
from sqlalchemy import inspect

from config import database_url
from database import make_engine
from migrate import alembic_config, upgrade_database


def test_migrations_roundtrip_and_metadata(db_url):
    assert upgrade_database(db_url) == "0001_initial"  # Idempotent.
    engine = make_engine(db_url)
    try:
        with engine.begin() as connection:
            config = alembic_config()
            config.attributes["connection"] = connection
            command.check(config)  # Models and versioned schema must agree.
            command.downgrade(config, "base")
            assert set(inspect(connection).get_table_names()) == {"alembic_version"}
            command.upgrade(config, "head")
            command.check(config)
            assert {"deals", "picks", "airdrops", "tips", "push_outbox"} <= set(
                inspect(connection).get_table_names()
            )
    finally:
        engine.dispose()


def test_postgres_guard(tmp_path):
    path = tmp_path / "must-not-exist.db"
    with pytest.raises(ValueError, match="requires a PostgreSQL"):
        upgrade_database(f"sqlite:///{path}", require_postgres=True)
    assert not path.exists()


@pytest.mark.parametrize("prefix", ["postgres", "postgresql", "postgresql+psycopg"])
def test_neon_url_normalization(prefix):
    url = database_url(f"{prefix}://user:p%40ss@host/db?sslmode=require&channel_binding=require")
    assert url.drivername == "postgresql+psycopg" and url.password == "p@ss"
    assert url.query == {"sslmode": "require", "channel_binding": "require"}
