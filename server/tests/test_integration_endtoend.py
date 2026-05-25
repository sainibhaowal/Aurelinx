import pytest
import hmac
import hashlib
import json
from datetime import datetime, timedelta
import sqlalchemy
import os

# Ensure tests run with an in-memory DB and avoid attempting to initialize external DB on app startup
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'

from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool

from app.main import app
from app.models import database as db
from app.models.database import SQLModel, create_engine, Session, get_session
from sqlalchemy import create_engine as create_engine_fn
from sqlmodel import Session as SQLSession

from app.models.database import IntegrationApiKeyTable, IntegrationWebhookEventTable, EmployeeTable


@pytest.fixture()
def client_db(monkeypatch, tmp_path):
    # Create an in-memory sqlite DB and override get_session dependency
    engine = create_engine_fn(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    def _get_session_override():
        with SQLSession(engine) as s:
            yield s

    monkeypatch.setattr('app.api.v1.integrations.get_session', _get_session_override)
    monkeypatch.setattr('app.models.database.get_session', _get_session_override)
    app.dependency_overrides[get_session] = _get_session_override
    app.dependency_overrides[db.get_session] = _get_session_override
    yield {"client": TestClient(app), "engine": engine}
    app.dependency_overrides.clear()


def test_signature_and_header_auth_and_expiry(client_db):
    client = client_db["client"]
    engine = client_db["engine"]
    # create an API key in DB
    raw_key = 'aur_testsecret'
    hashed = hashlib.sha256(raw_key.encode('utf-8')).hexdigest()

    with SQLSession(engine) as s:
        key = IntegrationApiKeyTable(tenant_id='default', name='test', api_key_hash=hashed, status='active', expires_at=datetime.utcnow() + timedelta(days=1))
        s.add(key)
        s.commit()
        s.refresh(key)

    payload = {"email": "silas.vance@aurelius.io", "sentiment_score": 0.6, "message_count": 10}
    body = json.dumps(payload).encode('utf-8')
    sig = hmac.new(raw_key.encode('utf-8'), body, hashlib.sha256).hexdigest()

    headers = {
        'X-API-Key': raw_key,
        'X-Signature': f'sha256={sig}',
        'Content-Type': 'application/json'
    }

    # first call should 404 because employee not found (but signature/auth should pass)
    resp = client.post('/api/v1/integrations/slack', headers=headers, json=payload)
    assert resp.status_code in (400, 404)

    # Now expire the key
    with SQLSession(engine) as s:
        row = s.exec(sqlalchemy.select(IntegrationApiKeyTable).where(IntegrationApiKeyTable.api_key_hash == hashed)).first()
        k = row[0] if row is not None else None
        assert k is not None
        k.expires_at = datetime.utcnow() - timedelta(days=1)
        s.add(k)
        s.commit()

    resp2 = client.post('/api/v1/integrations/slack', headers=headers, json=payload)
    assert resp2.status_code == 401
