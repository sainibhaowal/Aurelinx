import httpx

from app.services.connectors.base import BaseConnector


class SuccessFactorsConnector(BaseConnector):
    provider = "successfactors"
    source_type = "hris"
    supported_actions = frozenset({"update_employee"})

    def _client(self, connection: dict) -> httpx.Client:
        credentials = connection.get("credentials") or {}
        token = credentials.get("access_token")
        base = connection.get("base_url")
        if not token or not base:
            raise ValueError("SuccessFactors requires access_token and OData base_url")
        return httpx.Client(
            base_url=base.rstrip("/"),
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            timeout=45,
        )

    def verify(self, connection: dict) -> dict:
        with self._client(connection) as client:
            response = self.request(
                client,
                "GET",
                "/odata/v2/User",
                params={"$top": 1, "$select": "userId,email"},
            )
            response.raise_for_status()
            return {"connected": True, "status_code": response.status_code}

    def discover(self, connection: dict) -> dict:
        with self._client(connection) as client:
            response = self.request(client, "GET", "/odata/v2/$metadata")
            response.raise_for_status()
            return {
                "provider": self.provider,
                "source_type": self.source_type,
                "metadata_available": True,
                "content_type": response.headers.get("content-type"),
            }

    def fetch_records(self, connection: dict) -> list[dict]:
        options = connection.get("options") or {}
        entity = options.get("employee_entity", "User")
        fields = options.get(
            "fields", "userId,firstName,lastName,email,jobTitle,department"
        )
        with self._client(connection) as client:
            response = self.request(
                client,
                "GET",
                f"/odata/v2/{entity}",
                params={
                    "$select": fields,
                    "$top": min(1000, int(options.get("page_size", 1000))),
                },
            )
            response.raise_for_status()
            rows = response.json().get("d", {}).get("results", [])
            return [
                {
                    "external_id": str(
                        row.get("userId") or row.get("personIdExternal") or ""
                    ),
                    "full_name": f"{row.get('firstName', '')} {row.get('lastName', '')}".strip()
                    or "Unknown Employee",
                    "email": row.get("email") or "",
                    "department": row.get("department") or "General",
                    "role": row.get("jobTitle") or "Employee",
                }
                for row in rows
            ]

    def execute_action(self, connection: dict, action_type: str, payload: dict) -> dict:
        if action_type != "update_employee":
            raise ValueError(f"SuccessFactors does not implement {action_type}")
        fields = dict(payload)
        user_id = fields.pop("userId", None)
        if not user_id or not fields:
            raise ValueError("SuccessFactors update requires userId and fields")
        with self._client(connection) as client:
            response = self.request(
                client,
                "PATCH",
                f"/odata/v2/User('{user_id}')",
                json=fields,
                headers={"Content-Type": "application/json"},
            )
            response.raise_for_status()
            return {
                "provider_request_id": user_id,
                "status_code": response.status_code,
                "result": {"updated": True},
            }
