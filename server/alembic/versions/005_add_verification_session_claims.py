# Copyright 2026 Ravinder Singh
#
# Licensed under the Apache License, Version 2.0 (the "License");
"""Add device-bound session claims to email verification challenges.

Revision ID: 005
Revises: 004
"""

import sqlalchemy as sa

from alembic import op

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    columns = {column["name"] for column in sa.inspect(conn).get_columns("email_verifications")}

    if "session_token" not in columns:
        op.add_column("email_verifications", sa.Column("session_token", sa.String(length=255), nullable=True))
        op.create_index("ix_email_verifications_session_token", "email_verifications", ["session_token"], unique=True)
    if "approved_at" not in columns:
        op.add_column("email_verifications", sa.Column("approved_at", sa.DateTime(), nullable=True))
    if "session_claimed_at" not in columns:
        op.add_column("email_verifications", sa.Column("session_claimed_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("email_verifications", "session_claimed_at")
    op.drop_column("email_verifications", "approved_at")
    op.drop_index("ix_email_verifications_session_token", table_name="email_verifications")
    op.drop_column("email_verifications", "session_token")
