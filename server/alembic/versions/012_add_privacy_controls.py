"""Add tenant-scoped consent, retention, and sensitive-field controls."""

import sqlalchemy as sa
from sqlalchemy import inspect

from alembic import op

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = inspect(op.get_bind())
    existing = set(inspector.get_table_names())
    for table, columns in {
        "privacy_consents": [
            sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("tenant_id", sa.String(128), nullable=False, server_default="default"),
            sa.Column("subject_ref", sa.String(256), nullable=False), sa.Column("purpose", sa.String(160), nullable=False), sa.Column("legal_basis", sa.String(80), nullable=False),
            sa.Column("region", sa.String(80), nullable=False, server_default="global"), sa.Column("status", sa.String(40), nullable=False, server_default="active"), sa.Column("expires_at", sa.DateTime(), nullable=True), sa.Column("recorded_by", sa.String(128), nullable=True), sa.Column("created_at", sa.DateTime(), nullable=False),
        ],
        "retention_policies": [
            sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("tenant_id", sa.String(128), nullable=False, server_default="default"), sa.Column("data_class", sa.String(120), nullable=False), sa.Column("region", sa.String(80), nullable=False, server_default="global"), sa.Column("retention_days", sa.Integer(), nullable=False, server_default="365"), sa.Column("deletion_mode", sa.String(40), nullable=False, server_default="review_required"), sa.Column("status", sa.String(40), nullable=False, server_default="active"), sa.Column("created_at", sa.DateTime(), nullable=False), sa.Column("updated_at", sa.DateTime(), nullable=False),
        ],
        "sensitive_field_policies": [
            sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("tenant_id", sa.String(128), nullable=False, server_default="default"), sa.Column("entity", sa.String(120), nullable=False), sa.Column("field_name", sa.String(120), nullable=False), sa.Column("classification", sa.String(40), nullable=False, server_default="confidential"), sa.Column("allowed_roles", sa.Text(), nullable=False, server_default='["admin"]'), sa.Column("redaction_mode", sa.String(40), nullable=False, server_default="omit"), sa.Column("status", sa.String(40), nullable=False, server_default="active"), sa.Column("created_at", sa.DateTime(), nullable=False),
        ],
    }.items():
        if table not in existing:
            op.create_table(table, *columns)
        indexes = {item["name"] for item in inspector.get_indexes(table)} if table in existing else set()
        index_name = f"ix_{table}_tenant_id"
        if index_name not in indexes:
            op.create_index(index_name, table, ["tenant_id"])


def downgrade() -> None:
    inspector = inspect(op.get_bind())
    for table in ("sensitive_field_policies", "retention_policies", "privacy_consents"):
        if table in inspector.get_table_names():
            indexes = {item["name"] for item in inspector.get_indexes(table)}
            if f"ix_{table}_tenant_id" in indexes:
                op.drop_index(f"ix_{table}_tenant_id", table_name=table)
            op.drop_table(table)
