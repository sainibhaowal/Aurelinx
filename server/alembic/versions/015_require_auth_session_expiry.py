"""Require expiry timestamps for refresh sessions."""

from datetime import datetime, timedelta

import sqlalchemy as sa
from sqlalchemy import inspect

from alembic import op

revision = "015"
down_revision = "014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = inspect(op.get_bind())
    if "auth_sessions" not in inspector.get_table_names():
        return

    # Preserve existing active sessions while moving nullable schemas to the
    # same invariant as the application model and the production database.
    grace_expiry = datetime.utcnow() + timedelta(days=365)
    op.get_bind().execute(
        sa.text(
            "UPDATE auth_sessions SET expires_at = :grace_expiry "
            "WHERE expires_at IS NULL"
        ),
        {"grace_expiry": grace_expiry},
    )
    with op.batch_alter_table("auth_sessions") as batch_op:
        batch_op.alter_column(
            "expires_at",
            existing_type=sa.DateTime(),
            nullable=False,
        )


def downgrade() -> None:
    inspector = inspect(op.get_bind())
    if "auth_sessions" not in inspector.get_table_names():
        return
    with op.batch_alter_table("auth_sessions") as batch_op:
        batch_op.alter_column(
            "expires_at",
            existing_type=sa.DateTime(),
            nullable=True,
        )
