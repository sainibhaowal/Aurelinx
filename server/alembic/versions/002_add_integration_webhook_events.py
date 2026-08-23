
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

"""Alembic revision: add integration_webhook_events table and unique constraint.

Revision ID: 002
Revises: 001
Create Date: 2026-05-24 00:00:00.000000
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.sql import text

from alembic import op

# revision identifiers, used by Alembic.
revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "integration_webhook_events",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=text("uuid_generate_v4()"),
        ),
        sa.Column("tenant_id", sa.String(), nullable=False),
        sa.Column("api_key_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("integration_name", sa.String(), nullable=False),
        sa.Column("endpoint", sa.String(), nullable=False),
        sa.Column("idempotency_key", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("payload", sa.Text(), nullable=False),
        sa.Column("headers", sa.Text(), nullable=True),
        sa.Column("next_retry_at", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=text("now()")
        ),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=text("now()")
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_unique_constraint(
        "uq_integration_idempotency",
        "integration_webhook_events",
        ["tenant_id", "integration_name", "idempotency_key"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_integration_idempotency", "integration_webhook_events", type_="unique"
    )
    op.drop_table("integration_webhook_events")
