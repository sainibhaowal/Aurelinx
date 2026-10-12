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

import os

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url

# Set environment variables for testing before any app modules are imported
os.environ["ALLOWED_HOSTS"] = "*"
os.environ["ENVIRONMENT"] = "development"


def pytest_configure():
    """Give each xdist worker its own PostgreSQL schema.

    Several integration fixtures rebuild the complete SQLModel metadata. Sharing
    one schema makes parallel workers race while dropping and creating tables.
    """
    worker_id = os.getenv("PYTEST_XDIST_WORKER")
    if not worker_id:
        return

    database_url = os.getenv(
        "TEST_DATABASE_URL",
        "postgresql+psycopg://aurelinx:AurelinxPg_2026!ChangeMe@localhost:55433/"
        "aurelinx_db?options=-csearch_path%3Dtest,public",
    )
    schema = f"test_{worker_id}"
    url = make_url(database_url)
    query = dict(url.query)
    query["options"] = f"-csearch_path={schema},public"
    worker_url = url.set(query=query).render_as_string(hide_password=False)
    os.environ["TEST_DATABASE_URL"] = worker_url
    os.environ["DATABASE_URL"] = worker_url

    engine = create_engine(worker_url, pool_pre_ping=True)
    try:
        with engine.begin() as connection:
            connection.exec_driver_sql(
                f'CREATE SCHEMA IF NOT EXISTS "{schema}" AUTHORIZATION aurelinx'
            )
    finally:
        engine.dispose()
