import os
from contextlib import ExitStack

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete

from config import Settings
from database import make_engine
from main import create_app
from migrate import upgrade_database
from models import Base

TOKEN = "test-publish-token"
AUTH = {"X-Publish-Token": TOKEN}
FEEDS = ("deals", "picks", "airdrops", "tips")


def payload(feed, **changes):
    if feed in ("deals", "airdrops"):
        result = dict(
            title="Free tools",
            description="Free software for developers.",
            url="https://example.com/tools",
            source="Example",
            tag="Dev tools",
            expires=None,
            offer_details=None,
            claim_steps=None,
        )
    else:
        result = dict(
            title="Useful news",
            body="A useful article.",
            url="https://example.com/news",
            date="2026-10-15",
        )
    return result | changes


@pytest.fixture
def db_url(tmp_path):
    raw = os.environ.get("TEST_DATABASE_URL") or f"sqlite:///{tmp_path / 'test.db'}"
    upgrade_database(raw)
    engine = make_engine(raw)
    with engine.begin() as connection:
        for table in reversed(Base.metadata.sorted_tables):
            connection.execute(delete(table))
    engine.dispose()
    return raw


@pytest.fixture
def clients(db_url):
    with ExitStack() as stack:

        def make(sender=None, start_worker=False):
            app = create_app(Settings(db_url, TOKEN), sender=sender, start_worker=start_worker)
            return stack.enter_context(TestClient(app))

        yield make


@pytest.fixture
def client(clients):
    return clients()


class Recorder:
    def __init__(self, fail=False):
        self.fail = fail
        self.calls = []

    def send(self, row):
        self.calls.append((row.topic, row.item_id, row.title, row.body, row.url))
        if self.fail:
            raise RuntimeError("Provider unavailable")
