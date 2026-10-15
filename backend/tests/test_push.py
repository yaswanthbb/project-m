import base64
import json
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

import pytest
from sqlalchemy import select

from config import Settings
from models import PushOutbox
from push import Dispatcher, FirebaseSender, notification_body, utcnow
from tests.conftest import AUTH, FEEDS, TOKEN, Recorder, payload


@pytest.mark.parametrize("feed", FEEDS)
def test_outbox_contents(client, feed):
    item = client.post(f"/api/{feed}", json=payload(feed), headers=AUTH).json()["item"]
    with client.app.state.sessions() as session:
        row = session.scalar(select(PushOutbox))
        assert (row.topic, row.item_id, row.title, row.url) == (
            feed,
            item["id"],
            item["title"],
            item["url"],
        )
        assert row.body == item.get("description", item.get("body"))
        assert row.sent_at is None and row.attempts == 0
        assert row.created_at and row.next_attempt


def test_backoff_and_success(clients):
    recorder = Recorder(fail=True)
    client = clients(recorder)
    response = client.post("/api/deals", json=payload("deals"), headers=AUTH)
    assert response.status_code == 201 and response.json()["push"] == "queued"
    sessions = client.app.state.sessions
    dispatcher = client.app.state.dispatcher
    with sessions() as session:
        row = session.scalar(select(PushOutbox))
        row_id = row.id
        assert row.attempts == 1 and row.sent_at is None
        assert 25 < (row.next_attempt - utcnow()).total_seconds() <= 30
    dispatcher.drain()
    assert len(recorder.calls) == 1  # Not due yet.
    with sessions.begin() as session:
        session.get(PushOutbox, row_id).next_attempt = utcnow() - timedelta(seconds=1)
    dispatcher.drain()
    with sessions.begin() as session:
        row = session.get(PushOutbox, row_id)
        assert row.attempts == 2 and 55 < (row.next_attempt - utcnow()).total_seconds() <= 60
        row.next_attempt = utcnow() - timedelta(seconds=1)
    recorder.fail = False
    dispatcher.drain()
    dispatcher.drain()
    with sessions() as session:
        row = session.get(PushOutbox, row_id)
        assert row.attempts == 3 and row.sent_at is not None
    assert len(recorder.calls) == 3


def test_restart_recovers_unconfigured_queue(clients):
    first = clients()
    first.post("/api/tips", json=payload("tips"), headers=AUTH)
    sent = threading.Event()

    class SignalingSender(Recorder):
        def send(self, row):
            super().send(row)
            sent.set()

    recorder = SignalingSender()
    second = clients(recorder, start_worker=True)
    assert sent.wait(timeout=5), "Restarted lifespan worker did not process the saved queue"
    # Acquiring the dispatcher's lock waits for its acknowledgement transaction.
    with second.app.state.dispatcher._local_lock:
        with second.app.state.sessions() as session:
            row = session.scalar(select(PushOutbox))
            assert row.sent_at is not None and row.attempts == 1
    assert len(recorder.calls) == 1


@pytest.mark.parametrize("encoded", [False, True])
def test_sdk_payload_and_credentials(monkeypatch, encoded):
    info = {"type": "service_account", "project_id": "test"}
    raw = json.dumps(info)
    seen = {}
    monkeypatch.setattr(
        "push.credentials.Certificate", lambda data: seen.setdefault("certificate", data)
    )
    fake_app = object()

    def initialize(cred, options, name):
        seen["options"] = options
        return fake_app

    monkeypatch.setattr("push.firebase_admin.initialize_app", initialize)

    def send(message, app):
        seen["message"], seen["app"] = message, app

    monkeypatch.setattr("push.messaging.send", send)
    settings = Settings(
        "sqlite:///unused.db",
        TOKEN,
        firebase_json=None if encoded else raw,
        firebase_base64=base64.b64encode(raw.encode()).decode() if encoded else None,
    )
    sender = FirebaseSender(settings)
    sender.send(
        PushOutbox(
            topic="picks", item_id=42, title="News", body="Article", url="https://example.com/news"
        )
    )
    message = seen["message"]
    assert (
        message.topic == "picks"
        and message.notification.title == "News"
        and message.notification.body == "Article"
    )
    assert message.data == {
        "tab": "picks",
        "title": "News",
        "url": "https://example.com/news",
        "item_id": "42",
    }
    assert seen["certificate"] == info and seen["app"] is fake_app
    assert seen["options"]["httpTimeout"] == 10


def test_invalid_credentials_are_redacted():
    secret = "sensitive-invalid-private-key"
    with pytest.raises(ValueError) as exc:
        FirebaseSender(Settings("sqlite:///unused.db", TOKEN, firebase_json=secret))
    assert secret not in str(exc.value)


def test_notification_body_utf8_budget():
    result = notification_body("🐍" * 200)
    assert result == "🐍" * 60 and len(result.encode()) == 240


def test_postgres_dispatcher_row_lock(client):
    if client.app.state.engine.dialect.name != "postgresql":
        pytest.skip("PostgreSQL row locks require TEST_DATABASE_URL")
    client.post("/api/picks", json=payload("picks"), headers=AUTH)
    with client.app.state.sessions() as session:
        row_id = session.scalar(select(PushOutbox.id))
    entered, release = threading.Event(), threading.Event()

    class BlockingSender(Recorder):
        def send(self, row):
            super().send(row)
            entered.set()
            assert release.wait(timeout=5)

    recorder = BlockingSender()
    first = Dispatcher(client.app.state.sessions, recorder)
    second = Dispatcher(client.app.state.sessions, recorder)
    with ThreadPoolExecutor(max_workers=2) as pool:
        future = pool.submit(first.deliver, row_id)
        try:
            assert entered.wait(timeout=5)
            assert second.deliver(row_id) == "queued"
        finally:
            release.set()
        assert future.result(timeout=5) == "sent"
    assert len(recorder.calls) == 1


@pytest.mark.parametrize("feed", FEEDS)
def test_postgres_concurrent_duplicate(clients, feed):
    recorder = Recorder()
    client = clients(recorder)
    if client.app.state.engine.dialect.name != "postgresql":
        pytest.skip("Concurrent uniqueness requires TEST_DATABASE_URL")

    def publish(_):
        return client.post(f"/api/{feed}", json=payload(feed), headers=AUTH).status_code

    with ThreadPoolExecutor(max_workers=4) as pool:
        statuses = list(pool.map(publish, range(4)))
    assert sorted(statuses) == [201, 409, 409, 409]
    assert len(recorder.calls) == 1
