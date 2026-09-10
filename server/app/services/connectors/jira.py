import httpx

from app.services.connectors.base import BaseConnector


class JiraConnector(BaseConnector):
    provider = "jira"
    source_type = "productivity"

    def _client(self, connection: dict) -> httpx.Client:
        cfg = connection.get("credentials", {})
        base = (connection.get("base_url") or "").rstrip("/")
        if not base or not cfg.get("email") or not cfg.get("api_token"):
            raise ValueError("Jira requires base_url, email, and api_token")
        return httpx.Client(base_url=base, auth=(cfg["email"], cfg["api_token"]), timeout=30)

    def verify(self, connection: dict) -> dict:
        with self._client(connection) as client:
            response = self.request(client, "GET", "/rest/api/3/myself")
            response.raise_for_status()
            user = response.json()
            return {"connected": True, "account": user.get("displayName") or user.get("emailAddress")}

    def discover(self, connection: dict) -> dict:
        with self._client(connection) as client:
            response = self.request(client, "GET", "/rest/api/3/project/search", params={"maxResults": 50})
            response.raise_for_status()
            projects = response.json().get("values", [])
            return {"provider": self.provider, "source_type": self.source_type, "projects": [{"id": p.get("id"), "key": p.get("key"), "name": p.get("name")} for p in projects]}

    def fetch_records(self, connection: dict) -> list[dict]:
        with self._client(connection) as client:
            options = connection.get("options", {})
            jql = options.get("jql", "ORDER BY updated DESC")
            page_size = min(100, max(1, int(options.get("page_size", 100))))
            max_records = min(10000, max(page_size, int(options.get("max_records", 1000))))
            rows: list[dict] = []
            start_at = 0
            while len(rows) < max_records:
                response = self.request(client, "GET", "/rest/api/3/search", params={"jql": jql, "startAt": start_at, "maxResults": min(page_size, max_records - len(rows)), "fields": "summary,assignee,reporter,status,project"})
                response.raise_for_status()
                payload = response.json()
                issues = payload.get("issues", [])
                for issue in issues:
                    fields = issue.get("fields", {})
                    rows.append({"external_id": issue.get("id") or issue.get("key"), "issue_key": issue.get("key"), "full_name": (fields.get("assignee") or {}).get("displayName", "Jira issue"), "email": (fields.get("assignee") or {}).get("emailAddress", ""), "department": (fields.get("project") or {}).get("name", "Jira"), "role": (fields.get("status") or {}).get("name", "Issue"), "summary": fields.get("summary", "")})
                if not issues or len(issues) < page_size:
                    break
                start_at += len(issues)
            return rows
