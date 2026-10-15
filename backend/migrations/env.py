import os

from alembic import context
from sqlalchemy import create_engine, pool

from config import database_url, load_environment
from models import Base

config = context.config
target_metadata = Base.metadata
load_environment()


def get_url():
    raw = os.environ.get("DATABASE_URL", "")
    if not raw:
        raise ValueError("DATABASE_URL is required for migrations")
    return database_url(raw)


def run_migrations_offline():
    context.configure(
        url=get_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connection = config.attributes.get("connection")
    if connection is not None:
        configure(connection)
        return
    engine = create_engine(get_url(), poolclass=pool.NullPool)
    try:
        with engine.connect() as connection:
            configure(connection)
    finally:
        engine.dispose()


def configure(connection):
    context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
