"""Add tenant scope to legacy HR entities used by the agent."""

import sqlalchemy as sa

from alembic import op

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for table in ("skills", "experiences", "employeetable", "candidatetable"):
        op.add_column(table, sa.Column("tenant_id", sa.String(128), nullable=False, server_default="default"))
        op.create_index(f"ix_{table}_tenant_id", table, ["tenant_id"])


def downgrade() -> None:
    for table in ("candidatetable", "employeetable", "experiences", "skills"):
        op.drop_index(f"ix_{table}_tenant_id", table_name=table)
        op.drop_column(table, "tenant_id")
