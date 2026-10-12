"""Add approval-gated tenant privacy export requests."""

import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.schema import SchemaItem

from alembic import op

revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    table = "privacy_export_requests"
    columns: list[SchemaItem] = [
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "tenant_id", sa.String(128), nullable=False, server_default="default"
        ),
        sa.Column("requested_by", sa.String(128), nullable=False),
        sa.Column("scope", sa.String(160), nullable=False),
        sa.Column("region", sa.String(80), nullable=False, server_default="global"),
        sa.Column("purpose", sa.String(1000), nullable=False),
        sa.Column(
            "status", sa.String(40), nullable=False, server_default="pending_approval"
        ),
        sa.Column("approval_id", sa.String(128), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    ]
    inspector = inspect(op.get_bind())
    if table not in inspector.get_table_names():
        op.create_table(
            "privacy_export_requests",
            *columns,
        )
    if "ix_privacy_export_requests_tenant_id" not in {
        item["name"] for item in inspector.get_indexes(table)
    }:
        op.create_index("ix_privacy_export_requests_tenant_id", table, ["tenant_id"])


def downgrade() -> None:
    inspector = inspect(op.get_bind())
    if "privacy_export_requests" in inspector.get_table_names():
        if "ix_privacy_export_requests_tenant_id" in {
            item["name"] for item in inspector.get_indexes("privacy_export_requests")
        }:
            op.drop_index(
                "ix_privacy_export_requests_tenant_id",
                table_name="privacy_export_requests",
            )
        op.drop_table("privacy_export_requests")
