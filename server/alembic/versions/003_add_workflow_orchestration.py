"""Add durable workflow runs, events, and human approvals.

Revision ID: 003
Revises: 002
"""

from alembic import op
import sqlalchemy as sa


revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "workflow_runs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("session_id", sa.String(36), nullable=False),
        sa.Column("user_id", sa.String(128), nullable=False),
        sa.Column("tenant_id", sa.String(128), nullable=False, server_default="default"),
        sa.Column("status", sa.String(32), nullable=False, server_default="received"),
        sa.Column("intent", sa.String(128), nullable=True),
        sa.Column("current_phase", sa.String(64), nullable=True),
        sa.Column("idempotency_key", sa.String(256), nullable=True),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_workflow_runs_session_id", "workflow_runs", ["session_id"])
    op.create_index("ix_workflow_runs_user_id", "workflow_runs", ["user_id"])
    op.create_index("ix_workflow_runs_tenant_id", "workflow_runs", ["tenant_id"])
    op.create_index("ix_workflow_runs_status", "workflow_runs", ["status"])
    op.create_unique_constraint("uq_workflow_runs_idempotency_key", "workflow_runs", ["idempotency_key"])

    op.create_table(
        "workflow_events",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("run_id", sa.String(36), nullable=False),
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.Column("parent_event_id", sa.String(36), nullable=True),
        sa.Column("event_type", sa.String(64), nullable=False),
        sa.Column("phase", sa.String(64), nullable=False),
        sa.Column("tool_name", sa.String(128), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="running"),
        sa.Column("display_message", sa.Text(), nullable=False),
        sa.Column("safe_input", sa.Text(), nullable=True),
        sa.Column("result_summary", sa.Text(), nullable=True),
        sa.Column("error_code", sa.String(128), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_workflow_events_run_id", "workflow_events", ["run_id"])
    op.create_index("ix_workflow_events_sequence", "workflow_events", ["sequence"])
    op.create_index("ix_workflow_events_event_type", "workflow_events", ["event_type"])
    op.create_unique_constraint("uq_workflow_events_run_sequence", "workflow_events", ["run_id", "sequence"])

    op.create_table(
        "workflow_approvals",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("run_id", sa.String(36), nullable=False),
        sa.Column("tenant_id", sa.String(128), nullable=False, server_default="default"),
        sa.Column("requested_by", sa.String(128), nullable=False),
        sa.Column("approved_by", sa.String(128), nullable=True),
        sa.Column("action_type", sa.String(128), nullable=False),
        sa.Column("action_payload_hash", sa.String(128), nullable=False),
        sa.Column("action_payload", sa.Text(), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_workflow_approvals_run_id", "workflow_approvals", ["run_id"])
    op.create_index("ix_workflow_approvals_status", "workflow_approvals", ["status"])


def downgrade() -> None:
    op.drop_table("workflow_approvals")
    op.drop_constraint("uq_workflow_events_run_sequence", "workflow_events", type_="unique")
    op.drop_table("workflow_events")
    op.drop_constraint("uq_workflow_runs_idempotency_key", "workflow_runs", type_="unique")
    op.drop_table("workflow_runs")
