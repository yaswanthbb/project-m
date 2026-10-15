"""Durable, at-least-once FCM delivery. No provider call precedes content commit."""

import asyncio
import base64
import json
import logging
import threading
import uuid
from datetime import datetime, timedelta, timezone
from typing import Protocol

import firebase_admin
from firebase_admin import credentials, messaging
from sqlalchemy import select

from config import Settings
from models import PushOutbox

logger = logging.getLogger(__name__)


def utcnow():
    return datetime.now(timezone.utc)


def notification_body(text: str) -> str:
    # Topic messages have a smaller payload budget; data retains full title/URL.
    return text.encode("utf-8")[:240].decode("utf-8", errors="ignore")


class Sender(Protocol):
    def send(self, row: PushOutbox) -> None: ...


class FirebaseSender:
    def __init__(self, settings: Settings):
        try:
            raw = settings.firebase_json
            if not raw:
                raw = base64.b64decode(settings.firebase_base64, validate=True).decode("utf-8")
            info = json.loads(raw)
            self.app = firebase_admin.initialize_app(
                credentials.Certificate(info), {"httpTimeout": 10}, name=f"news-{uuid.uuid4().hex}"
            )
        except Exception:
            # Credential parsing errors can contain private-key material. Never echo them.
            raise ValueError("Invalid Firebase service account configuration") from None

    def send(self, row: PushOutbox) -> None:
        message = messaging.Message(
            topic=row.topic,
            notification=messaging.Notification(title=row.title, body=notification_body(row.body)),
            data={
                "tab": row.topic,
                "title": row.title,
                "url": row.url,
                "item_id": str(row.item_id),
            },
        )
        messaging.send(message, app=self.app)

    def close(self):
        firebase_admin.delete_app(self.app)


class Dispatcher:
    def __init__(self, sessions, sender: Sender | None):
        self.sessions = sessions
        self.sender = sender
        self._local_lock = threading.RLock()

    def deliver(self, outbox_id: int) -> str:
        if self.sender is None:
            return "not_configured"
        # Serialize the inline and background paths for SQLite too. PostgreSQL row
        # locks also protect against overlapping processes during a rolling deploy.
        with self._local_lock, self.sessions.begin() as session:
            row = session.scalar(
                select(PushOutbox)
                .where(PushOutbox.id == outbox_id)
                .with_for_update(skip_locked=True)
            )
            if row is None:
                return "queued"  # Locked elsewhere, or deleted with its content.
            if row.sent_at is not None:
                return "sent"
            if row.next_attempt > utcnow():
                return "queued"
            row.attempts += 1
            try:
                self.sender.send(row)
            except Exception as exc:
                delay = min(3600, 30 * (2 ** min(row.attempts - 1, 7)))
                row.next_attempt = utcnow() + timedelta(seconds=delay)
                logger.warning("Push %s failed (%s); retry scheduled", row.id, type(exc).__name__)
                return "queued"
            row.sent_at = utcnow()
            return "sent"

    def drain(self, stop: threading.Event | None = None, limit: int = 20):
        if self.sender is None:
            return
        with self.sessions() as session:
            ids = list(
                session.scalars(
                    select(PushOutbox.id)
                    .where(PushOutbox.sent_at.is_(None), PushOutbox.next_attempt <= utcnow())
                    .order_by(PushOutbox.next_attempt, PushOutbox.id)
                    .limit(limit)
                )
            )
        for row_id in ids:
            if stop is not None and stop.is_set():
                break
            self.deliver(row_id)

    async def run(self, stop: threading.Event, wake: asyncio.Event, interval: float = 15):
        while not stop.is_set():
            try:
                await asyncio.to_thread(self.drain, stop)
            except Exception as exc:
                logger.error("Outbox retry pass failed (%s)", type(exc).__name__)
            try:
                await asyncio.wait_for(wake.wait(), timeout=interval)
            except TimeoutError:
                pass
