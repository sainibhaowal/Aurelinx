
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

import pytest
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, SQLModel, create_engine

from app.models.database import IntegrationWebhookEventTable

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://aurelinx:AurelinxPg_2026!ChangeMe@localhost:55433/aurelinx_db?options=-csearch_path%3Dtest,public",
)


@pytest.fixture()
def in_memory_engine():
    engine = create_engine(TEST_DATABASE_URL, echo=False, pool_pre_ping=True)
    with engine.begin() as conn:
        conn.exec_driver_sql("CREATE SCHEMA IF NOT EXISTS test AUTHORIZATION aurelinx")
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    return engine


def test_idempotency_unique_constraint(in_memory_engine):
    e = in_memory_engine
    with Session(e) as session:
        event1 = IntegrationWebhookEventTable(
            tenant_id="tenant-a",
            integration_name="jira",
            endpoint="http://example.local/ingest",
            idempotency_key="abc-123",
            payload="{}",
        )
        session.add(event1)
        session.commit()

        event2 = IntegrationWebhookEventTable(
            tenant_id="tenant-a",
            integration_name="jira",
            endpoint="http://example.local/ingest",
            idempotency_key="abc-123",
            payload="{}",
        )
        session.add(event2)
        with pytest.raises(IntegrityError):
            session.commit()
