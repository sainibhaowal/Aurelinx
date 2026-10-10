"""Add tenant scope to chat and audit entities exposed to the agent."""

import sqlalchemy as sa

from alembic import op

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for table in ("audit_logs", "chat_sessions", "chat_messages", "chat_feedback", "chat_attachments"):
        op.add_column(table, sa.Column("tenant_id", sa.String(128), nullable=False, server_default="default"))
        op.create_index(f"ix_{table}_tenant_id", table, ["tenant_id"])


def downgrade() -> None:
    for table in ("chat_attachments", "chat_feedback", "chat_messages", "chat_sessions", "audit_logs"):
        op.drop_index(f"ix_{table}_tenant_id", table_name=table)
        op.drop_column(table, "tenant_id")
