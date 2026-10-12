import httpx

from app.services.connectors.base import BaseConnector


class SlackConnector(BaseConnector):
    provider = "slack"
    source_type = "engagement"
    supported_actions = frozenset({"send_manager_notification"})

    def _client(self, connection: dict) -> httpx.Client:
        credentials = connection.get("credentials", {})
        # Slack bot tokens are OAuth access tokens issued by the Slack app
        # installation. Accept both names so enterprise secret managers can
        # use their standard access_token field.
        token = credentials.get("bot_token") or credentials.get("access_token")
        if not token:
            raise ValueError("Slack requires an OAuth bot_token/access_token")
        return httpx.Client(
            base_url="https://slack.com/api",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )

    def verify(self, connection: dict) -> dict:
        with self._client(connection) as client:
            response = self.request(client, "GET", "/auth.test")
            response.raise_for_status()
            data = response.json()
            if not data.get("ok"):
                raise ValueError(data.get("error", "Slack authentication failed"))
            return {
                "connected": True,
                "team": data.get("team"),
                "user": data.get("user"),
            }

    def discover(self, connection: dict) -> dict:
        with self._client(connection) as client:
            response = self.request(
                client,
                "GET",
                "/conversations.list",
                params={"limit": 200, "types": "public_channel,private_channel"},
            )
            response.raise_for_status()
            data = response.json()
            if not data.get("ok"):
                raise ValueError(data.get("error", "Slack channel discovery failed"))
            return {
                "provider": self.provider,
                "source_type": self.source_type,
                "channels": [
                    {"id": c.get("id"), "name": c.get("name")}
                    for c in data.get("channels", [])
                ],
            }

    def fetch_records(self, connection: dict) -> list[dict]:
        channels = connection.get("options", {}).get("channel_ids", [])
        if not channels:
            # A fresh connection can be used immediately. Discover every
            # channel the installed bot can access; explicit channel_ids can
            # still restrict collection for least-privilege deployments.
            channels = [
                channel["id"]
                for channel in self.discover(connection).get("channels", [])
                if channel.get("id")
            ]
        rows: list[dict] = []
        user_cache: dict[str, dict] = {}
        with self._client(connection) as client:
            for channel_id in channels:
                cursor = None
                while True:
                    params = {
                        "channel": channel_id,
                        "limit": min(
                            100,
                            int(connection.get("options", {}).get("page_size", 100)),
                        ),
                    }
                    if cursor:
                        params["cursor"] = cursor
                    response = self.request(
                        client, "GET", "/conversations.history", params=params
                    )
                    response.raise_for_status()
                    data = response.json()
                    if not data.get("ok"):
                        raise ValueError(
                            data.get("error", "Slack history request failed")
                        )
                    for message in data.get("messages", []):
                        user_id = message.get("user", "")
                        user = user_cache.get(user_id)
                        if user_id and user is None:
                            user_response = self.request(
                                client, "GET", "/users.info", params={"user": user_id}
                            )
                            user_data = user_response.json()
                            user = (
                                user_data.get("user", {}) if user_data.get("ok") else {}
                            )
                            user_cache[user_id] = user
                        profile = (user or {}).get("profile", {})
                        rows.append(
                            {
                                "external_id": f"{channel_id}:{message.get('ts')}",
                                "channel_id": channel_id,
                                "message_count": 1,
                                "text": message.get("text", ""),
                                "user_id": user_id,
                                "full_name": (
                                    profile.get("real_name")
                                    or (user or {}).get("real_name")
                                    or ""
                                ).strip(),
                                "email": (profile.get("email") or "").strip().lower(),
                            }
                        )
                    cursor = (data.get("response_metadata") or {}).get("next_cursor")
                    if not cursor:
                        break
        return rows

    def execute_action(self, connection: dict, action_type: str, payload: dict) -> dict:
        if action_type != "send_manager_notification":
            raise ValueError(f"Slack does not implement {action_type}")
        channel = str(payload.get("channel_id") or payload.get("channel") or "").strip()
        text = str(payload.get("message") or payload.get("text") or "").strip()
        if not channel or not text:
            raise ValueError("Slack notification requires channel_id and message")
        if len(text) > 4000:
            raise ValueError("Slack notification is limited to 4000 characters")
        with self._client(connection) as client:
            response = self.request(
                client,
                "POST",
                "/chat.postMessage",
                json={"channel": channel, "text": text},
            )
            response.raise_for_status()
            data = response.json()
            if not data.get("ok"):
                raise ValueError(data.get("error", "Slack notification failed"))
            return {
                "provider_request_id": data.get("ts"),
                "status_code": response.status_code,
                "channel_id": channel,
                "message_ts": data.get("ts"),
            }
