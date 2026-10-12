"""Store explicit employment status for imported workforce records.

Revision ID: 018
Revises: 017
"""

import sqlalchemy as sa

from alembic import op

revision = "018"
down_revision = "017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("employeetable")}
    if "employment_status" not in columns:
        op.add_column("employeetable", sa.Column("employment_status", sa.String(length=24), nullable=True))
    indexes = {item["name"] for item in sa.inspect(op.get_bind()).get_indexes("employeetable")}
    if "ix_employeetable_employment_status" not in indexes:
        op.create_index("ix_employeetable_employment_status", "employeetable", ["employment_status"])


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    indexes = {item["name"] for item in inspector.get_indexes("employeetable")}
    if "ix_employeetable_employment_status" in indexes:
        op.drop_index("ix_employeetable_employment_status", table_name="employeetable")
    columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("employeetable")}
    if "employment_status" in columns:
        op.drop_column("employeetable", "employment_status")
