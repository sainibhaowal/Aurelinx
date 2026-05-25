import pytest
from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy.exc import IntegrityError
from app.models.database import IntegrationWebhookEventTable


@pytest.fixture()
def in_memory_engine():
    engine = create_engine("sqlite:///:memory:", echo=False)
    SQLModel.metadata.create_all(engine)
    return engine


def test_idempotency_unique_constraint(in_memory_engine):
    e = in_memory_engine
    with Session(e) as session:
        event1 = IntegrationWebhookEventTable(
            tenant_id='tenant-a',
            integration_name='jira',
            endpoint='http://example.local/ingest',
            idempotency_key='abc-123',
            payload='{}',
        )
        session.add(event1)
        session.commit()

        event2 = IntegrationWebhookEventTable(
            tenant_id='tenant-a',
            integration_name='jira',
            endpoint='http://example.local/ingest',
            idempotency_key='abc-123',
            payload='{}',
        )
        session.add(event2)
        with pytest.raises(IntegrityError):
            session.commit()
