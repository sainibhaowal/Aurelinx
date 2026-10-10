"""Add governed external action request and attempt records."""

import sqlalchemy as sa

from alembic import op

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "external_action_requests",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(128), nullable=False, server_default="default"),
        sa.Column("requested_by", sa.String(128), nullable=False),
        sa.Column("provider", sa.String(80), nullable=False),
        sa.Column("action_type", sa.String(120), nullable=False),
        sa.Column("connection_id", sa.UUID(), nullable=True),
        sa.Column("payload_hash", sa.String(128), nullable=False),
        sa.Column("payload", sa.Text(), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending_approval"),
        sa.Column("idempotency_key", sa.String(256), nullable=False),
        sa.Column("approval_id", sa.String(36), nullable=True),
        sa.Column("provider_request_id", sa.String(256), nullable=True),
        sa.Column("result_summary", sa.Text(), nullable=True),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("idempotency_key", name="uq_external_action_idempotency"),
    )
    op.create_index("ix_external_action_requests_tenant_id", "external_action_requests", ["tenant_id"])
    op.create_index("ix_external_action_requests_status", "external_action_requests", ["status"])
    op.create_table(
        "external_action_attempts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("action_id", sa.String(36), nullable=False),
        sa.Column("tenant_id", sa.String(128), nullable=False, server_default="default"),
        sa.Column("attempt_number", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="running"),
        sa.Column("provider_status_code", sa.Integer(), nullable=True),
        sa.Column("provider_request_id", sa.String(256), nullable=True),
        sa.Column("safe_result", sa.Text(), nullable=True),
        sa.Column("error_code", sa.String(128), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_external_action_attempts_action_id", "external_action_attempts", ["action_id"])


def downgrade() -> None:
    op.drop_table("external_action_attempts")
    op.drop_table("external_action_requests")
