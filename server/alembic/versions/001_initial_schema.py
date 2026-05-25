"""
Initial database migration
Creates all tables for production deployment
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.sql import text

def upgrade() -> None:
    """Create initial schema"""
    
    # Enable UUID extension for PostgreSQL
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=text('uuid_generate_v4()')),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_admin', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_is_active'), 'users', ['is_active'])
    
    # Create employeetable
    op.create_table(
        'employeetable',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=text('uuid_generate_v4()')),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('department', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('sentiment_score', sa.Float(), nullable=False, server_default='0.5'),
        sa.Column('is_at_risk', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('retention_prob', sa.Float(), nullable=True),
        sa.Column('join_date', sa.DateTime(), nullable=False, server_default=text('now()')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index(op.f('ix_employeetable_department'), 'employeetable', ['department'])
    op.create_index(op.f('ix_employeetable_email'), 'employeetable', ['email'], unique=True)
    op.create_index(op.f('ix_employeetable_full_name'), 'employeetable', ['full_name'])
    op.create_index(op.f('ix_employeetable_is_at_risk'), 'employeetable', ['is_at_risk'])
    op.create_index(op.f('ix_employeetable_role'), 'employeetable', ['role'])
    
    # Create candidatetable
    op.create_table(
        'candidatetable',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=text('uuid_generate_v4()')),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('department', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('sentiment_score', sa.Float(), nullable=False, server_default='0.5'),
        sa.Column('application_date', sa.DateTime(), nullable=False, server_default=text('now()')),
        sa.Column('match_score', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index(op.f('ix_candidatetable_department'), 'candidatetable', ['department'])
    op.create_index(op.f('ix_candidatetable_email'), 'candidatetable', ['email'], unique=True)
    op.create_index(op.f('ix_candidatetable_full_name'), 'candidatetable', ['full_name'])
    op.create_index(op.f('ix_candidatetable_role'), 'candidatetable', ['role'])
    
    # Create skills table
    op.create_table(
        'skills',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=text('uuid_generate_v4()')),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('level', sa.Integer(), nullable=False),
        sa.Column('employee_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('candidate_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=text('now()')),
        sa.ForeignKeyConstraint(['employee_id'], ['employeetable.id']),
        sa.ForeignKeyConstraint(['candidate_id'], ['candidatetable.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_skills_candidate_id'), 'skills', ['candidate_id'])
    op.create_index(op.f('ix_skills_employee_id'), 'skills', ['employee_id'])
    op.create_index(op.f('ix_skills_name'), 'skills', ['name'])
    
    # Create experiences table
    op.create_table(
        'experiences',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=text('uuid_generate_v4()')),
        sa.Column('company', sa.String(), nullable=False),
        sa.Column('position', sa.String(), nullable=False),
        sa.Column('duration_years', sa.Float(), nullable=False),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('employee_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('candidate_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=text('now()')),
        sa.ForeignKeyConstraint(['employee_id'], ['employeetable.id']),
        sa.ForeignKeyConstraint(['candidate_id'], ['candidatetable.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_experiences_candidate_id'), 'experiences', ['candidate_id'])
    op.create_index(op.f('ix_experiences_employee_id'), 'experiences', ['employee_id'])
    
    # Create vector_embeddings table
    op.create_table(
        'vector_embeddings',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=text('uuid_generate_v4()')),
        sa.Column('entity_type', sa.String(), nullable=False),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('embedding_text', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=text('now()')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_vector_embeddings_entity_id'), 'vector_embeddings', ['entity_id'])
    op.create_index(op.f('ix_vector_embeddings_entity_type'), 'vector_embeddings', ['entity_type'])
    
    # Create audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=text('uuid_generate_v4()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('resource_type', sa.String(), nullable=False),
        sa.Column('resource_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('details', sa.String(), nullable=False),
        sa.Column('ip_address', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'])
    op.create_index(op.f('ix_audit_logs_created_at'), 'audit_logs', ['created_at'])
    op.create_index(op.f('ix_audit_logs_user_id'), 'audit_logs', ['user_id'])

def downgrade() -> None:
    """Rollback schema"""
    op.drop_table('audit_logs')
    op.drop_table('vector_embeddings')
    op.drop_table('experiences')
    op.drop_table('skills')
    op.drop_table('candidatetable')
    op.drop_table('employeetable')
    op.drop_table('users')
