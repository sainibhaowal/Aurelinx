# Copyright 2026 Ravinder Singh
#
# Licensed under the Apache License, Version 2.0 (the "License");

"""Add tenant-scoped provider evidence attached to normalized employees.

Revision ID: 006
Revises: 005
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "integration_evidence",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", sa.String(), nullable=False),
        sa.Column("employee_email", sa.String(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("source_type", sa.String(), nullable=False),
        sa.Column("external_id", sa.String(), nullable=True),
        sa.Column("evidence_type", sa.String(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("observed_at", sa.DateTime(), nullable=False),
        sa.Column("raw_event_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in ("tenant_id", "employee_email", "provider", "source_type", "external_id", "evidence_type", "observed_at"):
        op.create_index(f"ix_integration_evidence_{column}", "integration_evidence", [column])


def downgrade() -> None:
    for column in ("observed_at", "evidence_type", "external_id", "source_type", "provider", "employee_email", "tenant_id"):
        op.drop_index(f"ix_integration_evidence_{column}", table_name="integration_evidence")
    op.drop_table("integration_evidence")
