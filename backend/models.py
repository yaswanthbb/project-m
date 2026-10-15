from datetime import date, datetime, timezone

from sqlalchemy import (
    JSON,
    CheckConstraint,
    Date,
    DateTime,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.types import TypeDecorator


class UTCDateTime(TypeDecorator):
    """Keep SQLite test timestamps as timezone-aware as PostgreSQL timestamps."""

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_result_value(self, value, dialect):
        if value is not None:
            return (
                value.replace(tzinfo=timezone.utc)
                if value.tzinfo is None
                else value.astimezone(timezone.utc)
            )
        return value


class Base(DeclarativeBase):
    pass


class Record:
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), server_default=func.now(), nullable=False
    )


class Offer(Record):
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    url: Mapped[str] = mapped_column(String(1024))
    source: Mapped[str] = mapped_column(String(200))
    tag: Mapped[str] = mapped_column(String(30))
    expires: Mapped[date | None] = mapped_column(Date)
    offer_details: Mapped[str | None] = mapped_column(Text)
    claim_steps: Mapped[list[str] | None] = mapped_column(JSON(none_as_null=True))


class Deal(Offer, Base):
    __tablename__ = "deals"
    __table_args__ = (
        UniqueConstraint("url", name="uq_deals_url"),
        Index("ix_deals_newest", "created_at", "id"),
    )


class Airdrop(Offer, Base):
    __tablename__ = "airdrops"
    __table_args__ = (
        UniqueConstraint("title", "url", name="uq_airdrops_title_url"),
        Index("ix_airdrops_newest", "created_at", "id"),
    )


class Article(Record):
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    url: Mapped[str] = mapped_column(String(1024))
    date: Mapped[date] = mapped_column(Date)


class Pick(Article, Base):
    __tablename__ = "picks"
    __table_args__ = (
        UniqueConstraint("title", "url", "date", name="uq_picks_title_url_date"),
        Index("ix_picks_newest", "date", "created_at", "id"),
    )


class Tip(Article, Base):
    __tablename__ = "tips"
    __table_args__ = (
        UniqueConstraint("title", "url", "date", name="uq_tips_title_url_date"),
        Index("ix_tips_newest", "date", "created_at", "id"),
    )


class PushOutbox(Record, Base):
    __tablename__ = "push_outbox"
    __table_args__ = (
        CheckConstraint("attempts >= 0", name="ck_push_attempts_nonnegative"),
        CheckConstraint("topic IN ('deals', 'picks', 'airdrops', 'tips')", name="ck_push_topic"),
        Index("ix_push_outbox_due", "sent_at", "next_attempt", "id"),
        Index("ix_push_outbox_item", "topic", "item_id"),
    )
    topic: Mapped[str] = mapped_column(String(20))
    item_id: Mapped[int] = mapped_column(Integer)  # Polymorphic reference across four tables.
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    url: Mapped[str] = mapped_column(String(1024))
    sent_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    attempts: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)
    next_attempt: Mapped[datetime] = mapped_column(
        UTCDateTime(), server_default=func.now(), nullable=False
    )
