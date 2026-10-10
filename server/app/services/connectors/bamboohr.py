import base64

import httpx

from app.services.connectors.base import BaseConnector


class BambooHRConnector(BaseConnector):
    provider = "bamboohr"
    source_type = "hris"
    supported_actions = frozenset({"create_employee", "update_employee"})

    def _client(self, connection: dict) -> httpx.Client:
        credentials = connection.get("credentials") or {}
        key = credentials.get("api_key")
        domain = credentials.get("company_domain") or connection.get("base_url")
        if not key or not domain:
            raise ValueError("BambooHR requires api_key and company_domain")
        base = (
            domain
            if str(domain).startswith("http")
            else f"https://{domain}.bamboohr.com"
        )
        encoded = base64.b64encode(f"{key}:x".encode()).decode()
        return httpx.Client(
            base_url=f"{base.rstrip('/')}/api/v1",
            headers={"Authorization": f"Basic {encoded}", "Accept": "application/json"},
            timeout=45,
        )

    def verify(self, connection: dict) -> dict:
        with self._client(connection) as client:
            response = self.request(client, "GET", "/employees/directory")
            response.raise_for_status()
            return {"connected": True, "status_code": response.status_code}

    def discover(self, connection: dict) -> dict:
        with self._client(connection) as client:
            response = self.request(client, "GET", "/meta/fields/employee")
            response.raise_for_status()
            fields = response.json()
            return {
                "provider": self.provider,
                "source_type": self.source_type,
                "fields": [item.get("id") for item in fields if isinstance(item, dict)],
            }

    def fetch_records(self, connection: dict) -> list[dict]:
        fields = (connection.get("options") or {}).get(
            "fields",
            ["id", "firstName", "lastName", "workEmail", "jobTitle", "department"],
        )
        with self._client(connection) as client:
            response = self.request(
                client,
                "GET",
                "/employees/directory",
                params={"fields": ",".join(fields)},
            )
            response.raise_for_status()
            return [
                {
                    "external_id": str(row.get("id") or ""),
                    "full_name": f"{row.get('firstName', '')} {row.get('lastName', '')}".strip()
                    or "Unknown Employee",
                    "email": row.get("workEmail") or "",
                    "department": row.get("department") or "General",
                    "role": row.get("jobTitle") or "Employee",
                }
                for row in response.json().get("employees", [])
            ]

    def execute_action(self, connection: dict, action_type: str, payload: dict) -> dict:
        if action_type not in self.supported_actions:
            raise ValueError(f"BambooHR does not implement {action_type}")
        if action_type == "update_employee":
            employee_id = payload.get("id")
            fields = {key: value for key, value in payload.items() if key != "id"}
            if not employee_id or not fields:
                raise ValueError("BambooHR employee update requires id and fields")
            with self._client(connection) as client:
                response = self.request(
                    client, "POST", f"/employees/{employee_id}", json=fields
                )
                response.raise_for_status()
                return {
                    "provider_request_id": str(employee_id),
                    "status_code": response.status_code,
                    "result": {"updated": True},
                }
        if not payload.get("firstName") or not payload.get("lastName"):
            raise ValueError(
                "BambooHR employee creation requires firstName and lastName"
            )
        with self._client(connection) as client:
            response = self.request(client, "POST", "/employees", json=payload)
            response.raise_for_status()
            return {
                "provider_request_id": response.headers.get("Location"),
                "status_code": response.status_code,
                "result": {"created": True},
            }
