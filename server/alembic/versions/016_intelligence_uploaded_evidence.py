"""Add uploaded career, collaboration, outcome and skill mapping evidence.

Revision ID: 016
Revises: 015
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "016"
down_revision = "015"
branch_labels = None
depends_on = None


def _inspector():
    return sa.inspect(op.get_bind())


def _column_names(table: str) -> set[str]:
    inspector = _inspector()
    if not inspector.has_table(table):
        return set()
    return {column["name"] for column in inspector.get_columns(table)}


def _add_column_if_missing(table: str, column: sa.Column) -> None:
    if column.name not in _column_names(table):
        op.add_column(table, column)


def _create_index_if_missing(name: str, table: str, columns: list[str]) -> None:
    if not any(index["name"] == name for index in _inspector().get_indexes(table)):
        op.create_index(name, table, columns)


def _require_existing_table_shape(table: str, required_columns: set[str]) -> None:
    actual = _column_names(table)
    missing = required_columns - actual
    if missing:
        raise RuntimeError(
            f"Existing {table} table is missing required columns: {', '.join(sorted(missing))}"
        )


def upgrade() -> None:
    employee_columns = (
        sa.Column("salary_currency", sa.String(3), nullable=True),
        sa.Column("salary_period", sa.String(16), nullable=True),
        sa.Column("employment_start_date", sa.DateTime(), nullable=True),
        sa.Column("employment_end_date", sa.DateTime(), nullable=True),
        sa.Column("employment_censor_date", sa.DateTime(), nullable=True),
        sa.Column("departure_event", sa.Boolean(), nullable=True),
    )
    for column in employee_columns:
        _add_column_if_missing("employeetable", column)
    for column in ("salary_currency", "salary_period", "employment_start_date", "employment_end_date", "employment_censor_date", "departure_event"):
        _create_index_if_missing(f"ix_employeetable_{column}", "employeetable", [column])

    experience_columns = (
        sa.Column("effective_start", sa.DateTime(), nullable=True),
        sa.Column("effective_end", sa.DateTime(), nullable=True),
        sa.Column("is_current", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("source_record_key", sa.String(), nullable=True),
    )
    for column in experience_columns:
        _add_column_if_missing("experiences", column)
    for column in ("effective_start", "effective_end", "is_current", "source_record_key"):
        _create_index_if_missing(f"ix_experiences_{column}", "experiences", [column])
    if not any(
        constraint["name"] == "uq_experience_tenant_source_key"
        for constraint in _inspector().get_unique_constraints("experiences")
    ):
        op.create_unique_constraint(
            "uq_experience_tenant_source_key",
            "experiences",
            ["tenant_id", "source_record_key"],
        )

    if not _inspector().has_table("skill_aliases"):
        op.create_table(
            "skill_aliases",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("tenant_id", sa.String(), nullable=False),
            sa.Column("alias", sa.String(), nullable=False),
            sa.Column("alias_key", sa.String(), nullable=False),
            sa.Column("canonical_skill", sa.String(), nullable=False),
            sa.Column("approved", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("tenant_id", "alias_key", name="uq_skill_alias_tenant_key"),
        )
    else:
        _require_existing_table_shape(
            "skill_aliases",
            {"id", "tenant_id", "alias", "alias_key", "canonical_skill", "approved", "created_at"},
        )
    for column in ("tenant_id", "alias_key", "canonical_skill", "approved"):
        _create_index_if_missing(f"ix_skill_aliases_{column}", "skill_aliases", [column])

    if not _inspector().has_table("collaboration_events"):
        op.create_table(
            "collaboration_events",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("tenant_id", sa.String(), nullable=False),
            sa.Column("source", sa.String(), nullable=False, server_default="uploaded_csv"),
            sa.Column("external_event_id", sa.String(), nullable=False),
            sa.Column("employee_a_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("employee_b_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("event_type", sa.String(), nullable=False, server_default="collaboration"),
            sa.Column("occurred_at", sa.DateTime(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["employee_a_id"], ["employeetable.id"]),
            sa.ForeignKeyConstraint(["employee_b_id"], ["employeetable.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("tenant_id", "source", "external_event_id", name="uq_collaboration_event_source_id"),
        )
    else:
        _require_existing_table_shape(
            "collaboration_events",
            {"id", "tenant_id", "source", "external_event_id", "employee_a_id", "employee_b_id", "event_type", "occurred_at", "created_at"},
        )
    for column in ("tenant_id", "source", "external_event_id", "employee_a_id", "employee_b_id", "event_type", "occurred_at", "created_at"):
        _create_index_if_missing(f"ix_collaboration_events_{column}", "collaboration_events", [column])


def downgrade() -> None:
    bind = op.get_bind()
    for table in ("collaboration_events", "skill_aliases"):
        if _inspector().has_table(table) and bind.execute(sa.text(f'SELECT 1 FROM "{table}" LIMIT 1')).first():
            raise RuntimeError(f"Refusing to drop non-empty {table} during downgrade")
    for table in ("collaboration_events", "skill_aliases"):
        if _inspector().has_table(table):
            op.drop_table(table)
    if any(
        constraint["name"] == "uq_experience_tenant_source_key"
        for constraint in _inspector().get_unique_constraints("experiences")
    ):
        op.drop_constraint("uq_experience_tenant_source_key", "experiences", type_="unique")
    for table, columns in (
        ("experiences", ("source_record_key", "is_current", "effective_end", "effective_start")),
        ("employeetable", ("departure_event", "employment_censor_date", "employment_end_date", "employment_start_date", "salary_period", "salary_currency")),
    ):
        for column in columns:
            op.drop_index(f"ix_{table}_{column}", table_name=table)
            op.drop_column(table, column)
