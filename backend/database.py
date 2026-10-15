from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from config import database_url


def make_engine(raw_url: str) -> Engine:
    url = database_url(raw_url)
    connect_args = (
        {"check_same_thread": False, "timeout": 15}
        if url.get_backend_name() == "sqlite"
        else {"connect_timeout": 10}
    )
    return create_engine(url, pool_pre_ping=True, connect_args=connect_args)


def session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(engine, expire_on_commit=False)
