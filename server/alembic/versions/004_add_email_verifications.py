# Copyright 2026 Ravinder Singh
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Add email verifications and user verification status.

Revision ID: 004
Revises: 003
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add is_verified column to users if not present
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    user_columns = [col["name"] for col in inspector.get_columns("users")]

    if "is_verified" not in user_columns:
        op.add_column(
            "users",
            sa.Column(
                "is_verified",
                sa.Boolean(),
                server_default=sa.text("true"),
                nullable=False,
            ),
        )
        op.create_index("ix_users_is_verified", "users", ["is_verified"])

    # 2. Create email_verifications table if not present
    tables = inspector.get_table_names()
    if "email_verifications" not in tables:
        op.create_table(
            "email_verifications",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("code", sa.String(length=16), nullable=False),
            sa.Column("token", sa.String(length=255), nullable=False),
            sa.Column(
                "purpose",
                sa.String(length=64),
                nullable=False,
                server_default="register",
            ),
            sa.Column(
                "is_used",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_email_verifications_user_id", "email_verifications", ["user_id"])
        op.create_index("ix_email_verifications_email", "email_verifications", ["email"])
        op.create_index("ix_email_verifications_code", "email_verifications", ["code"])
        op.create_index("ix_email_verifications_token", "email_verifications", ["token"], unique=True)
        op.create_index("ix_email_verifications_purpose", "email_verifications", ["purpose"])
        op.create_index("ix_email_verifications_is_used", "email_verifications", ["is_used"])
        op.create_index("ix_email_verifications_expires_at", "email_verifications", ["expires_at"])


def downgrade() -> None:
    op.drop_table("email_verifications")
    op.drop_index("ix_users_is_verified", table_name="users")
    op.drop_column("users", "is_verified")
