import httpx

from app.services.connectors.base import BaseConnector


class TeamsConnector(BaseConnector):
    provider = "teams"
    source_type = "productivity"
    supported_actions = frozenset({"send_manager_notification"})

    def _client(self, connection: dict) -> httpx.Client:
        token = (connection.get("credentials") or {}).get("access_token")
        if not token:
            raise ValueError("Microsoft Teams requires a Microsoft Graph access token")
        return httpx.Client(
            base_url="https://graph.microsoft.com/v1.0",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            timeout=30,
        )

    def verify(self, connection: dict) -> dict:
        with self._client(connection) as client:
            response = self.request(client, "GET", "/me")
            response.raise_for_status()
            data = response.json()
            return {
                "connected": True,
                "user": data.get("displayName"),
                "account": data.get("mail") or data.get("userPrincipalName"),
            }

    def discover(self, connection: dict) -> dict:
        with self._client(connection) as client:
            response = self.request(client, "GET", "/me/joinedTeams")
            response.raise_for_status()
            return {
                "provider": self.provider,
                "source_type": self.source_type,
                "teams": response.json().get("value", []),
            }

    def fetch_records(self, connection: dict) -> list[dict]:
        return []

    def execute_action(self, connection: dict, action_type: str, payload: dict) -> dict:
        if action_type != "send_manager_notification":
            raise ValueError(f"Teams does not implement {action_type}")
        team_id, channel_id, content = (
            payload.get("team_id"),
            payload.get("channel_id"),
            payload.get("message"),
        )
        if not team_id or not channel_id or not content:
            raise ValueError(
                "Teams notification requires team_id, channel_id, and message"
            )
        with self._client(connection) as client:
            response = self.request(
                client,
                "POST",
                f"/teams/{team_id}/channels/{channel_id}/messages",
                json={"body": {"contentType": "text", "content": str(content)[:4000]}},
            )
            response.raise_for_status()
            data = response.json() if response.content else {}
            return {
                "provider_request_id": data.get("id"),
                "status_code": response.status_code,
                "result": {"team_id": team_id, "channel_id": channel_id},
            }
