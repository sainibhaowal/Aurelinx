"""Add tenant scope to chat and audit entities exposed to the agent."""

import sqlalchemy as sa
from sqlalchemy import inspect

from alembic import op

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def _ensure_chat_tables(existing: set[str]) -> None:
    if "chat_sessions" not in existing:
        op.create_table(
            "chat_sessions",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column(
                "tenant_id", sa.String(128), nullable=False, server_default="default"
            ),
            sa.Column("user_id", sa.String(), nullable=False),
            sa.Column(
                "title", sa.String(), nullable=False, server_default="New Session"
            ),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
        )
        op.create_index("ix_chat_sessions_tenant_id", "chat_sessions", ["tenant_id"])
        op.create_index("ix_chat_sessions_user_id", "chat_sessions", ["user_id"])
        op.create_index("ix_chat_sessions_created_at", "chat_sessions", ["created_at"])
        op.create_index("ix_chat_sessions_updated_at", "chat_sessions", ["updated_at"])

    if "chat_messages" not in existing:
        op.create_table(
            "chat_messages",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column(
                "tenant_id", sa.String(128), nullable=False, server_default="default"
            ),
            sa.Column(
                "session_id",
                sa.String(36),
                sa.ForeignKey("chat_sessions.id"),
                nullable=False,
            ),
            sa.Column("role", sa.String(), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("tool_trace", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
        op.create_index("ix_chat_messages_tenant_id", "chat_messages", ["tenant_id"])
        op.create_index("ix_chat_messages_session_id", "chat_messages", ["session_id"])
        op.create_index("ix_chat_messages_role", "chat_messages", ["role"])
        op.create_index("ix_chat_messages_created_at", "chat_messages", ["created_at"])

    if "chat_feedback" not in existing:
        op.create_table(
            "chat_feedback",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column(
                "tenant_id", sa.String(128), nullable=False, server_default="default"
            ),
            sa.Column(
                "session_id",
                sa.String(36),
                sa.ForeignKey("chat_sessions.id"),
                nullable=False,
            ),
            sa.Column("user_id", sa.String(), nullable=False),
            sa.Column(
                "message_id",
                sa.String(36),
                sa.ForeignKey("chat_messages.id"),
                nullable=True,
            ),
            sa.Column("rating", sa.String(), nullable=False, server_default="down"),
            sa.Column("assistant_preview", sa.String(2000), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
        op.create_index("ix_chat_feedback_tenant_id", "chat_feedback", ["tenant_id"])
        op.create_index("ix_chat_feedback_session_id", "chat_feedback", ["session_id"])
        op.create_index("ix_chat_feedback_user_id", "chat_feedback", ["user_id"])
        op.create_index("ix_chat_feedback_message_id", "chat_feedback", ["message_id"])
        op.create_index("ix_chat_feedback_rating", "chat_feedback", ["rating"])
        op.create_index("ix_chat_feedback_created_at", "chat_feedback", ["created_at"])

    if "chat_attachments" not in existing:
        op.create_table(
            "chat_attachments",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column(
                "tenant_id", sa.String(128), nullable=False, server_default="default"
            ),
            sa.Column(
                "session_id",
                sa.String(36),
                sa.ForeignKey("chat_sessions.id"),
                nullable=False,
            ),
            sa.Column(
                "message_id",
                sa.String(36),
                sa.ForeignKey("chat_messages.id"),
                nullable=True,
            ),
            sa.Column("original_name", sa.String(), nullable=False),
            sa.Column("content_type", sa.String(), nullable=True),
            sa.Column("file_path", sa.String(), nullable=False),
            sa.Column("file_size", sa.Integer(), nullable=False, server_default="0"),
            sa.Column(
                "parsing_status",
                sa.String(),
                nullable=False,
                server_default="pending",
            ),
            sa.Column("parsing_error", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
        op.create_index(
            "ix_chat_attachments_tenant_id", "chat_attachments", ["tenant_id"]
        )
        op.create_index(
            "ix_chat_attachments_session_id", "chat_attachments", ["session_id"]
        )
        op.create_index(
            "ix_chat_attachments_message_id", "chat_attachments", ["message_id"]
        )
        op.create_index(
            "ix_chat_attachments_parsing_status", "chat_attachments", ["parsing_status"]
        )
        op.create_index(
            "ix_chat_attachments_created_at", "chat_attachments", ["created_at"]
        )


def upgrade() -> None:
    inspector = inspect(op.get_bind())
    existing = set(inspector.get_table_names())
    _ensure_chat_tables(existing)

    for table in (
        "audit_logs",
        "chat_sessions",
        "chat_messages",
        "chat_feedback",
        "chat_attachments",
    ):
        if table not in existing:
            continue
        cols = {c["name"] for c in inspector.get_columns(table)}
        if "tenant_id" not in cols:
            op.add_column(
                table,
                sa.Column(
                    "tenant_id",
                    sa.String(128),
                    nullable=False,
                    server_default="default",
                ),
            )
        indexes = {idx["name"] for idx in inspector.get_indexes(table)}
        if f"ix_{table}_tenant_id" not in indexes:
            op.create_index(f"ix_{table}_tenant_id", table, ["tenant_id"])


def downgrade() -> None:
    for table in (
        "chat_attachments",
        "chat_feedback",
        "chat_messages",
        "chat_sessions",
        "audit_logs",
    ):
        op.drop_index(f"ix_{table}_tenant_id", table_name=table)
        op.drop_column(table, "tenant_id")
