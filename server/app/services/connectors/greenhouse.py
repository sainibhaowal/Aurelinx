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

import base64

import httpx
from sqlmodel import Session, select

from app.models.database import CandidateTable
from app.services.connectors.base import BaseConnector


class GreenhouseConnector(BaseConnector):
    provider = "greenhouse"
    source_type = "ats"
    supported_actions = frozenset(
        {"create_requisition", "move_candidate_stage", "schedule_interview"}
    )

    def _client(self, connection: dict) -> httpx.Client:
        credentials = connection.get("credentials", {})
        api_key = credentials.get("api_key") or credentials.get("harvest_api_key")
        if not api_key:
            raise ValueError("Greenhouse requires a Harvest API key")
        encoded = base64.b64encode(f"{api_key}:".encode()).decode()
        return httpx.Client(
            base_url=(
                connection.get("base_url") or "https://harvest.greenhouse.io"
            ).rstrip("/"),
            headers={"Authorization": f"Basic {encoded}", "Accept": "application/json"},
            timeout=45,
        )

    def verify(self, connection: dict) -> dict:
        with self._client(connection) as client:
            response = self.request(
                client, "GET", "/v3/candidates", params={"per_page": 1}
            )
            response.raise_for_status()
            return {"connected": True, "status_code": response.status_code}

    def discover(self, connection: dict) -> dict:
        with self._client(connection) as client:
            response = self.request(
                client, "GET", "/v3/job_posts", params={"per_page": 1}
            )
            response.raise_for_status()
            data = response.json()
            rows = data.get("data", data if isinstance(data, list) else [])
            return {
                "provider": self.provider,
                "source_type": self.source_type,
                "resource": "job_posts",
                "fields": sorted(rows[0].keys()) if rows else [],
            }

    def fetch_records(self, connection: dict) -> list[dict]:
        credentials = connection.get("credentials", {})
        if credentials.get("api_key") or credentials.get("harvest_api_key"):
            options = connection.get("options", {})
            page = 1
            per_page = min(500, max(1, int(options.get("page_size", 100))))
            max_records = min(
                50000, max(per_page, int(options.get("max_records", 10000)))
            )
            output: list[dict] = []
            with self._client(connection) as client:
                while len(output) < max_records:
                    response = self.request(
                        client,
                        "GET",
                        "/v3/candidates",
                        params={
                            "per_page": min(per_page, max_records - len(output)),
                            "page": page,
                        },
                    )
                    response.raise_for_status()
                    data = response.json()
                    rows = data.get("data", data if isinstance(data, list) else [])
                    if not rows:
                        break
                    for candidate in rows:
                        output.append(
                            {
                                "external_id": str(candidate.get("id") or ""),
                                "full_name": candidate.get("name")
                                or "Unknown Candidate",
                                "email": (
                                    (candidate.get("email_addresses") or [{}])[0].get(
                                        "value", ""
                                    )
                                    if isinstance(
                                        candidate.get("email_addresses"), list
                                    )
                                    else ""
                                ),
                                "department": "General",
                                "role": candidate.get("title") or "Candidate",
                            }
                        )
                    if len(rows) < per_page:
                        break
                    page += 1
            return output

        # Backward-compatible development fallback for seeded local data.
        session: Session = connection["session"]
        rows = session.exec(select(CandidateTable).limit(5000)).all()
        data = []
        for c in rows:
            data.append(
                {
                    "external_id": str(c.id),
                    "full_name": c.full_name,
                    "email": c.email,
                    "department": c.department,
                    "role": c.role,
                    "match_score": c.match_score,
                }
            )
        return data

    def execute_action(self, connection: dict, action_type: str, payload: dict) -> dict:
        """Execute only documented Harvest v3 ATS actions."""
        paths = {
            "create_requisition": (
                "POST",
                "/v3/jobs",
                {"template_job_id", "number_of_openings"},
            ),
            "move_candidate_stage": (
                "POST",
                f"/v3/applications/{payload.get('application_id')}/move",
                {"application_id", "from_stage_id"},
            ),
            "schedule_interview": (
                "POST",
                "/v3/interviews",
                {
                    "application_id",
                    "job_interview_id",
                    "starts_at",
                    "ends_at",
                    "external_event_id",
                    "interviewers",
                },
            ),
        }
        if action_type not in paths:
            raise ValueError(f"Greenhouse does not implement {action_type}")
        method, path, required = paths[action_type]
        missing = sorted(key for key in required if payload.get(key) in (None, "", []))
        if missing:
            raise ValueError(f"Greenhouse action requires: {', '.join(missing)}")
        if (
            action_type == "move_candidate_stage"
            and not payload.get("to_stage_id")
            and not payload.get("to_job_id")
        ):
            raise ValueError("Greenhouse stage move requires to_stage_id or to_job_id")
        body = {
            key: value
            for key, value in payload.items()
            if key not in {"application_id"}
        }
        with self._client(connection) as client:
            response = self.request(client, method, path, json=body)
            response.raise_for_status()
            result = response.json() if response.content else {}
            return {
                "provider_request_id": response.headers.get("X-Request-Id"),
                "status_code": response.status_code,
                "result": result,
            }
