"""Add sourced tenure duration for outcome datasets without calendar dates.

Revision ID: 017
Revises: 016
"""

import sqlalchemy as sa

from alembic import op

revision = "017"
down_revision = "016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("employeetable")}
    if "employment_duration_years" not in columns:
        op.add_column(
            "employeetable",
            sa.Column("employment_duration_years", sa.Float(), nullable=True),
        )
    indexes = {
        item["name"] for item in sa.inspect(op.get_bind()).get_indexes("employeetable")
    }
    if "ix_employeetable_employment_duration_years" not in indexes:
        op.create_index(
            "ix_employeetable_employment_duration_years",
            "employeetable",
            ["employment_duration_years"],
        )


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    indexes = {item["name"] for item in inspector.get_indexes("employeetable")}
    if "ix_employeetable_employment_duration_years" in indexes:
        op.drop_index(
            "ix_employeetable_employment_duration_years",
            table_name="employeetable",
        )
    columns = {
        column["name"]
        for column in sa.inspect(op.get_bind()).get_columns("employeetable")
    }
    if "employment_duration_years" in columns:
        op.drop_column("employeetable", "employment_duration_years")
