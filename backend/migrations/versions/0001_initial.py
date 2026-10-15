"""Create all four feeds and the durable push outbox."""

import sqlalchemy as sa
from alembic import op

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def record_columns():
    return [
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    ]


def upgrade():
    for table in ("deals", "airdrops"):
        unique = (
            sa.UniqueConstraint("url", name="uq_deals_url")
            if table == "deals"
            else sa.UniqueConstraint("title", "url", name="uq_airdrops_title_url")
        )
        op.create_table(
            table,
            *record_columns(),
            sa.Column("title", sa.String(200), nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("url", sa.String(1024), nullable=False),
            sa.Column("source", sa.String(200), nullable=False),
            sa.Column("tag", sa.String(30), nullable=False),
            sa.Column("expires", sa.Date(), nullable=True),
            sa.Column("offer_details", sa.Text(), nullable=True),
            sa.Column("claim_steps", sa.JSON(none_as_null=True), nullable=True),
            unique,
        )
        op.create_index(f"ix_{table}_newest", table, ["created_at", "id"])
    for table in ("picks", "tips"):
        op.create_table(
            table,
            *record_columns(),
            sa.Column("title", sa.String(200), nullable=False),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("url", sa.String(1024), nullable=False),
            sa.Column("date", sa.Date(), nullable=False),
            sa.UniqueConstraint("title", "url", "date", name=f"uq_{table}_title_url_date"),
        )
        op.create_index(f"ix_{table}_newest", table, ["date", "created_at", "id"])
    op.create_table(
        "push_outbox",
        *record_columns(),
        sa.Column("topic", sa.String(20), nullable=False),
        sa.Column("item_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("url", sa.String(1024), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "next_attempt", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("attempts >= 0", name="ck_push_attempts_nonnegative"),
        sa.CheckConstraint("topic IN ('deals', 'picks', 'airdrops', 'tips')", name="ck_push_topic"),
    )
    op.create_index("ix_push_outbox_due", "push_outbox", ["sent_at", "next_attempt", "id"])
    op.create_index("ix_push_outbox_item", "push_outbox", ["topic", "item_id"])


def downgrade():
    for table in ("push_outbox", "tips", "picks", "airdrops", "deals"):
        op.drop_table(table)
