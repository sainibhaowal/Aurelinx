
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

import httpx

from app.services.connectors.base import BaseConnector


class WorkdayConnector(BaseConnector):
    provider = "workday"
    source_type = "hris"

    def _token(self, connection: dict) -> str:
        cfg = connection.get("credentials", {})
        if cfg.get("access_token"):
            return cfg["access_token"]
        token_url = cfg.get("token_url")
        if not token_url or not cfg.get("client_id") or not cfg.get("client_secret"):
            raise ValueError("Workday requires access_token or token_url, client_id, and client_secret")
        response = httpx.post(token_url, data={"grant_type": "client_credentials"}, auth=(cfg["client_id"], cfg["client_secret"]), timeout=30)
        response.raise_for_status()
        token = response.json().get("access_token")
        if not token:
            raise ValueError("Workday token response did not contain access_token")
        return token

    def _client(self, connection: dict) -> httpx.Client:
        base = (connection.get("base_url") or "").rstrip("/")
        if not base:
            raise ValueError("Workday requires the tenant API base_url")
        return httpx.Client(base_url=base, headers={"Authorization": f"Bearer {self._token(connection)}", "Accept": "application/json"}, timeout=45)

    def verify(self, connection: dict) -> dict:
        with self._client(connection) as client:
            response = self.request(client, "GET", connection.get("options", {}).get("verify_path", "/ccx/api/v1/workers"), params={"limit": 1})
            response.raise_for_status()
            return {"connected": True, "status_code": response.status_code}

    def discover(self, connection: dict) -> dict:
        with self._client(connection) as client:
            response = self.request(client, "GET", connection.get("options", {}).get("discover_path", "/ccx/api/v1/workers"), params={"limit": 1})
            response.raise_for_status()
            data = response.json()
            return {"provider": self.provider, "source_type": self.source_type, "resource": "workers", "fields": sorted(data.get("data", [{}])[0].keys()) if isinstance(data.get("data"), list) and data.get("data") else []}

    def fetch_records(self, connection: dict) -> list[dict]:
        options = connection.get("options", {})
        path = options.get("workers_path", "/ccx/api/v1/workers")
        page_size = min(1000, max(1, int(options.get("page_size", 100))))
        max_records = min(50000, max(page_size, int(options.get("max_records", 10000))))
        offset = 0
        raw_rows = []
        with self._client(connection) as client:
            while len(raw_rows) < max_records:
                response = self.request(client, "GET", path, params={"limit": min(page_size, max_records - len(raw_rows)), "offset": offset})
                response.raise_for_status()
                payload = response.json()
                page = payload.get("data", payload if isinstance(payload, list) else [])
                if not page:
                    break
                raw_rows.extend(page)
                if len(page) < page_size:
                    break
                offset += len(page)
        rows = raw_rows
        data = []
        for e in rows:
            data.append(
                {
                    "external_id": str(e.get("id") or e.get("worker_id") or e.get("employee_id") or e.get("email")),
                    "full_name": e.get("full_name") or e.get("name") or "Unknown Employee",
                    "email": e.get("email") or e.get("work_email") or "",
                    "department": e.get("department") or e.get("department_name") or "General",
                    "role": e.get("role") or e.get("job_title") or e.get("position") or "Employee",
                    "salary": e.get("salary"),
                }
            )
        return data
