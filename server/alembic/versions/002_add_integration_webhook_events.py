"""Alembic revision: add integration_webhook_events table and unique constraint.

Revision ID: 002_add_integration_webhook_events
Revises: 001_initial_schema
Create Date: 2026-05-24 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.sql import text

# revision identifiers, used by Alembic.
revision = '002_add_integration_webhook_events'
down_revision = '001_initial_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'integration_webhook_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=text('uuid_generate_v4()')),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('api_key_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('integration_name', sa.String(), nullable=False),
        sa.Column('endpoint', sa.String(), nullable=False),
        sa.Column('idempotency_key', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('payload', sa.Text(), nullable=False),
        sa.Column('headers', sa.Text(), nullable=True),
        sa.Column('next_retry_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=text('now()')),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_unique_constraint('uq_integration_idempotency', 'integration_webhook_events', ['tenant_id', 'integration_name', 'idempotency_key'])


def downgrade() -> None:
    op.drop_constraint('uq_integration_idempotency', 'integration_webhook_events', type_='unique')
    op.drop_table('integration_webhook_events')
