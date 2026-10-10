import httpx

from app.services.connectors.base import BaseConnector


class HiBobConnector(BaseConnector):
    provider = "hibob"
    source_type = "hris"
    supported_actions = frozenset({"create_employee", "update_employee"})

    def _client(self, connection: dict) -> httpx.Client:
        token = (connection.get("credentials") or {}).get("access_token") or (
            connection.get("credentials") or {}
        ).get("service_user_token")
        if not token:
            raise ValueError("HiBob requires an access token or service user token")
        return httpx.Client(
            base_url=(connection.get("base_url") or "https://api.hibob.com/v1").rstrip(
                "/"
            ),
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            timeout=45,
        )

    def verify(self, connection: dict) -> dict:
        with self._client(connection) as client:
            response = self.request(
                client,
                "POST",
                "/people/search",
                json={"filters": [], "fields": ["root.id", "root.email"]},
            )
            response.raise_for_status()
            return {"connected": True, "status_code": response.status_code}

    def discover(self, connection: dict) -> dict:
        with self._client(connection) as client:
            response = self.request(client, "GET", "/metadata/fields")
            response.raise_for_status()
            return {
                "provider": self.provider,
                "source_type": self.source_type,
                "fields": response.json(),
            }

    def fetch_records(self, connection: dict) -> list[dict]:
        with self._client(connection) as client:
            response = self.request(
                client,
                "POST",
                "/people/search",
                json={
                    "filters": [],
                    "fields": [
                        "root.id",
                        "root.email",
                        "root.firstName",
                        "root.lastName",
                        "work.title",
                        "work.department",
                    ],
                },
            )
            response.raise_for_status()
            rows = response.json().get("employees", response.json().get("people", []))
            return [
                {
                    "external_id": str(row.get("id") or row.get("root.id") or ""),
                    "full_name": row.get("fullName")
                    or f"{row.get('firstName', '')} {row.get('lastName', '')}".strip()
                    or "Unknown Employee",
                    "email": row.get("email") or "",
                    "department": row.get("department") or "General",
                    "role": row.get("title") or "Employee",
                }
                for row in rows
            ]

    def execute_action(self, connection: dict, action_type: str, payload: dict) -> dict:
        if action_type not in self.supported_actions:
            raise ValueError(f"HiBob does not implement {action_type}")
        if action_type == "update_employee":
            employee_id = payload.get("id")
            fields = {key: value for key, value in payload.items() if key != "id"}
            if not employee_id or not fields:
                raise ValueError("HiBob employee update requires id and fields")
            with self._client(connection) as client:
                response = self.request(
                    client, "PUT", f"/people/{employee_id}", json=fields
                )
                response.raise_for_status()
                return {
                    "provider_request_id": str(employee_id),
                    "status_code": response.status_code,
                    "result": {"updated": True},
                }
        with self._client(connection) as client:
            response = self.request(client, "POST", "/people", json=payload)
            response.raise_for_status()
            data = response.json() if response.content else {}
            return {
                "provider_request_id": data.get("id"),
                "status_code": response.status_code,
                "result": {"created": True},
            }
