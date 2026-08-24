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
from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, Session as SQLSession

os.environ["ALLOWED_HOSTS"] = "*"
os.environ["ENVIRONMENT"] = "test"
os.environ["ALLOW_SQLITE"] = "1"
os.environ["SECRET_KEY"] = "test-secret-key-at-least-32-characters-long"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app.main import app
from app.models.database import UserTable, EmailVerificationTable, get_session


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite:///file:test_auth_db?mode=memory&cache=shared&uri=true",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    def _get_session_override():
        with SQLSession(engine) as s:
            yield s

    app.dependency_overrides[get_session] = _get_session_override
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_one_time_email_verification_and_direct_signin(client):
    email = "marcus.vance@aurelinx.com"
    password = "SecurePassword123!"

    # Step 1: Register Account with only Email + Password (auto-derives name)
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    assert reg_resp.status_code == 201
    reg_data = reg_resp.json()
    assert reg_data["email"] == email
    assert reg_data["full_name"] == "Marcus Vance"
    assert reg_data["expires_in"] == 30
    assert "demo_code" in reg_data
    code = reg_data["demo_code"]

    # Step 2: Attempting login before verification is rejected
    pre_login = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert pre_login.status_code == 403
    assert "not verified" in pre_login.json()["detail"].lower()

    # Step 3: Verify email with 30s OTP code
    verify_resp = client.post(
        "/api/v1/auth/verify-email",
        json={"email": email, "code": code},
    )
    assert verify_resp.status_code == 200
    assert verify_resp.json()["success"] is True

    # Step 4: Sign in directly with email & password (Instant Access, no second verification)
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_resp.status_code == 200
    auth_data = login_resp.json()
    assert "access_token" in auth_data
    token = auth_data["access_token"]

    # Step 5: Access protected /me route
    me_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email"] == email
    assert me_data["is_verified"] is True
