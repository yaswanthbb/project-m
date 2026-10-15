from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event, func, select

from config import Settings
from main import create_app
from models import Deal, PushOutbox
from tests.conftest import AUTH, FEEDS, Recorder, payload


@pytest.mark.parametrize("feed", FEEDS)
def test_publish_list_delete(client, feed):
    assert client.get(f"/api/{feed}").json() == []
    response = client.post(f"/api/{feed}", headers=AUTH, json=payload(feed))
    assert response.status_code == 201, response.text
    item = response.json()["item"]
    assert response.json()["push"] == "not_configured"
    assert item["id"] > 0
    assert datetime.fromisoformat(
        item["created_at"].replace("Z", "+00:00")
    ).utcoffset() == timedelta(0)
    assert client.get(f"/api/{feed}").json() == [item]
    removed = client.delete(f"/api/{feed}/{item['id']}", headers=AUTH)
    assert removed.status_code == 204 and removed.content == b""
    assert client.delete(f"/api/{feed}/{item['id']}", headers=AUTH).status_code == 404
    with client.app.state.sessions() as session:
        assert session.scalar(select(func.count()).select_from(PushOutbox)) == 0


@pytest.mark.parametrize("feed", FEEDS)
@pytest.mark.parametrize("headers", [{}, {"X-Publish-Token": "wrong"}, {"X-Publish-Token": ""}])
def test_auth(client, feed, headers):
    assert client.post(f"/api/{feed}", json=payload(feed), headers=headers).status_code == 401
    assert client.delete(f"/api/{feed}/1", headers=headers).status_code == 401
    assert client.get(f"/api/{feed}").status_code == 200


@pytest.mark.parametrize("feed", FEEDS)
def test_duplicate_has_no_second_push(clients, feed):
    recorder = Recorder()
    client = clients(recorder)
    first = client.post(f"/api/{feed}", json=payload(feed), headers=AUTH)
    assert first.status_code == 201 and first.json()["push"] == "sent"
    assert client.post(f"/api/{feed}", json=payload(feed), headers=AUTH).status_code == 409
    assert len(recorder.calls) == 1
    with client.app.state.sessions() as session:
        rows = list(session.scalars(select(PushOutbox)))
        assert len(rows) == 1 and rows[0].sent_at is not None and rows[0].attempts == 1


def test_deal_url_unique_even_with_other_title(client):
    assert client.post("/api/deals", json=payload("deals"), headers=AUTH).status_code == 201
    assert (
        client.post(
            "/api/deals", json=payload("deals", title="Another free toolkit"), headers=AUTH
        ).status_code
        == 409
    )


@pytest.mark.parametrize("feed", ["picks", "tips"])
def test_dated_identity_and_ordering(client, feed):
    items = [
        payload(feed, date="2026-10-14"),
        payload(feed, title="Different title"),
        payload(feed, url="https://example.com/other"),
        payload(feed),  # Identical title/URL to first, on a different date.
    ]
    ids = [
        client.post(f"/api/{feed}", json=item, headers=AUTH).json()["item"]["id"] for item in items
    ]
    assert [item["id"] for item in client.get(f"/api/{feed}").json()] == [
        ids[3],
        ids[2],
        ids[1],
        ids[0],
    ]


@pytest.mark.parametrize("feed", ["deals", "airdrops"])
def test_offer_newest_order_and_nullable_fields(client, feed):
    first = client.post(
        f"/api/{feed}",
        json=payload(feed, expires="2028-02-29", claim_steps=["  Visit the page  "]),
        headers=AUTH,
    ).json()["item"]
    second = client.post(
        f"/api/{feed}", json=payload(feed, url="https://example.com/new"), headers=AUTH
    ).json()["item"]
    assert first["claim_steps"] == ["Visit the page"] and first["expires"] == "2028-02-29"
    assert second["expires"] is None and second["claim_steps"] is None
    assert [item["id"] for item in client.get(f"/api/{feed}").json()] == [second["id"], first["id"]]


def test_health_and_db_failure(client, monkeypatch):
    from sqlalchemy.exc import OperationalError

    assert client.get("/health").json() == {"status": "ok"}

    def fail():
        raise OperationalError("", {}, RuntimeError("unavailable"))

    monkeypatch.setattr(client.app.state.engine, "connect", fail)
    assert client.get("/health").status_code == 503


def test_missing_token_refuses_startup(monkeypatch):
    monkeypatch.setattr("config.load_environment", lambda: None)
    monkeypatch.delenv("PUBLISH_TOKEN", raising=False)
    monkeypatch.setenv("DATABASE_URL", "sqlite:///unused.db")
    with pytest.raises(ValueError, match="PUBLISH_TOKEN"):
        with TestClient(create_app()):
            pass


@pytest.mark.parametrize("token", ["", "  "])
def test_blank_token_rejected(token):
    with pytest.raises(ValueError, match="PUBLISH_TOKEN"):
        Settings("sqlite:///unused.db", token)


def test_item_and_outbox_rollback_together(clients):
    recorder = Recorder()
    client = clients(recorder)

    def fail_outbox(*args):
        raise RuntimeError("Injected outbox write failure")

    event.listen(PushOutbox, "before_insert", fail_outbox)
    try:
        with pytest.raises(RuntimeError, match="Injected"):
            client.post("/api/deals", json=payload("deals"), headers=AUTH)
    finally:
        event.remove(PushOutbox, "before_insert", fail_outbox)
    with client.app.state.sessions() as session:
        assert session.scalar(select(func.count()).select_from(Deal)) == 0
        assert session.scalar(select(func.count()).select_from(PushOutbox)) == 0
    assert not recorder.calls


def test_transient_ack_database_failure_does_not_lose_content(client, monkeypatch):
    def fail(*args):
        raise RuntimeError("DB unavailable after content commit")

    monkeypatch.setattr(client.app.state.dispatcher, "deliver", fail)
    response = client.post("/api/picks", json=payload("picks"), headers=AUTH)
    assert response.status_code == 201 and response.json()["push"] == "queued"
    assert len(client.get("/api/picks").json()) == 1
    with client.app.state.sessions() as session:
        assert session.scalar(select(PushOutbox)).sent_at is None
