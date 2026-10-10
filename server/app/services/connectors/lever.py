import base64

import httpx

from app.services.connectors.base import BaseConnector


class LeverConnector(BaseConnector):
    provider = "lever"
    source_type = "ats"
    supported_actions = frozenset(
        {"move_candidate_stage", "create_candidate_opportunity", "schedule_interview"}
    )

    def _client(self, connection: dict) -> httpx.Client:
        key = (connection.get("credentials") or {}).get("api_key") or (
            connection.get("credentials") or {}
        ).get("lever_api_key")
        if not key:
            raise ValueError("Lever requires an API key")
        encoded = base64.b64encode(f"{key}:".encode()).decode()
        return httpx.Client(
            base_url=(connection.get("base_url") or "https://api.lever.co/v1").rstrip(
                "/"
            ),
            headers={"Authorization": f"Basic {encoded}", "Accept": "application/json"},
            timeout=45,
        )

    def verify(self, connection: dict) -> dict:
        with self._client(connection) as client:
            response = self.request(
                client, "GET", "/opportunities", params={"limit": 1}
            )
            response.raise_for_status()
            return {"connected": True, "status_code": response.status_code}

    def discover(self, connection: dict) -> dict:
        with self._client(connection) as client:
            response = self.request(client, "GET", "/stages")
            response.raise_for_status()
            rows = response.json().get("data", [])
            return {
                "provider": self.provider,
                "source_type": self.source_type,
                "resource": "stages",
                "fields": sorted(rows[0].keys()) if rows else [],
            }

    def fetch_records(self, connection: dict) -> list[dict]:
        with self._client(connection) as client:
            response = self.request(
                client,
                "GET",
                "/opportunities",
                params={
                    "limit": min(
                        100,
                        int((connection.get("options") or {}).get("page_size", 100)),
                    ),
                    "expand": "applications,stage,contact",
                },
            )
            response.raise_for_status()
            rows = []
            for item in response.json().get("data", []):
                contact = item.get("contact") or {}
                rows.append(
                    {
                        "external_id": str(item.get("id") or ""),
                        "full_name": contact.get("name") or "Unknown Candidate",
                        "email": (contact.get("emails") or [""])[0],
                        "department": "General",
                        "role": "Candidate",
                    }
                )
            return rows

    def execute_action(self, connection: dict, action_type: str, payload: dict) -> dict:
        if action_type == "move_candidate_stage":
            opportunity = str(payload.get("opportunity_id") or "")
            stage = payload.get("stage")
            if not opportunity or not stage:
                raise ValueError(
                    "Lever stage movement requires opportunity_id and stage"
                )
            method, path, body = (
                "PUT",
                f"/opportunities/{opportunity}/stage",
                {"stage": stage},
            )
        elif action_type == "create_candidate_opportunity":
            if not payload.get("name") or not payload.get("email"):
                raise ValueError("Lever opportunity requires name and email")
            method, path, body = "POST", "/opportunities", payload
        elif action_type == "schedule_interview":
            opportunity = str(payload.get("opportunity_id") or "")
            panel = str(payload.get("panel") or "")
            interviewers = payload.get("interviewers")
            if (
                not opportunity
                or not panel
                or not isinstance(interviewers, list)
                or not interviewers
            ):
                raise ValueError(
                    "Lever interview scheduling requires opportunity_id, panel, and interviewers"
                )
            body = {
                key: value for key, value in payload.items() if key != "opportunity_id"
            }
            method, path = "POST", f"/opportunities/{opportunity}/interviews"
        else:
            raise ValueError(f"Lever does not implement {action_type}")
        with self._client(connection) as client:
            response = self.request(client, method, path, json=body)
            response.raise_for_status()
            parsed_data = response.json() if response.content else {}
            data = parsed_data if isinstance(parsed_data, dict) else {}
            result = data.get("data")
            if not isinstance(result, dict):
                result = {}
            return {
                "provider_request_id": result.get("id"),
                "status_code": response.status_code,
                "result": data,
            }
