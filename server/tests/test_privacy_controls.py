"""Privacy governance route and schema safety checks."""

from fastapi.testclient import TestClient

from app.api.v1.privacy import _sensitive_out
from app.main import app
from app.models.database import SensitiveFieldPolicyTable


def test_privacy_routes_are_registered_and_require_authentication():
    client = TestClient(app)
    for path in (
        "/api/v1/actions/capabilities",
        "/api/v1/privacy/consents",
        "/api/v1/privacy/retention",
        "/api/v1/privacy/sensitive-fields",
    ):
        response = client.get(path)
        assert response.status_code == 401, (path, response.status_code, response.text)


def test_privacy_route_contract_is_complete():
    paths = app.openapi()["paths"]
    assert "get" in paths["/api/v1/actions/capabilities"]
    assert {"get", "post"} <= paths["/api/v1/privacy/consents"].keys()
    assert "post" in paths["/api/v1/privacy/consents/{consent_id}/withdraw"]
    assert {"get", "post"} <= paths["/api/v1/privacy/retention"].keys()
    assert {"get", "post"} <= paths["/api/v1/privacy/sensitive-fields"].keys()


def test_sensitive_policy_response_decodes_stored_roles():
    row = SensitiveFieldPolicyTable(
        entity="employee",
        field_name="tax_id",
        allowed_roles='["admin", "privacy_officer"]',
    )
    assert _sensitive_out(row)["allowed_roles"] == ["admin", "privacy_officer"]
