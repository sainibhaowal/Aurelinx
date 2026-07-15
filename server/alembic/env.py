import os
import sys
import configparser
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.config import settings
from app.models.database import SQLModel

# this is the Alembic Config object, which provides access to the values within the .ini file
config = context.config

# Interpret the config file for Python logging when the legacy sections exist.
if config.config_file_name is not None:
    try:
        fileConfig(config.config_file_name)
    except (KeyError, configparser.Error):
        pass

# Set the SQLAlchemy URL from application settings/environment.
# Alembic uses ConfigParser interpolation, so literal percent signs must be escaped.
config.set_main_option('sqlalchemy.url', settings.DATABASE_URL.replace('%', '%%'))

target_metadata = SQLModel.metadata


def run_migrations_offline():
    url = config.get_main_option('sqlalchemy.url')
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix='sqlalchemy.',
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
