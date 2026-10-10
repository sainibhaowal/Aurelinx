import httpx

from app.services.connectors.secrets import open_credentials, seal_credentials
from app.services.oauth.tokens import (
    refresh_connection_token,
    refresh_connection_token_sync,
    token_is_expired,
)


class FakeAsyncClient:
    def __init__(self, **_kwargs):
        self.response = httpx.Response(
            200,
            json={
                "access_token": "new-token",
                "refresh_token": "new-refresh",
                "expires_in": 3600,
            },
            request=httpx.Request("POST", "https://oauth.test/token"),
        )

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return False

    async def post(self, *_args, **_kwargs):
        return self.response


def test_refresh_updates_only_encrypted_connection(monkeypatch):
    monkeypatch.setattr("app.services.oauth.tokens.httpx.AsyncClient", FakeAsyncClient)
    connection = type(
        "Connection",
        (),
        {
            "encrypted_secret_ref": seal_credentials(
                {"refresh_token": "old-refresh", "access_token": "old-token"}
            )
        },
    )()
    import asyncio

    result = asyncio.run(
        refresh_connection_token(connection, "https://oauth.test/token")
    )
    assert result["refreshed"] is True
    assert (
        open_credentials(connection.encrypted_secret_ref)["access_token"] == "new-token"
    )


def test_sync_refresh_and_expiry_detection(monkeypatch):
    response = httpx.Response(
        200,
        json={"access_token": "sync-token", "expires_in": 3600},
        request=httpx.Request("POST", "https://oauth.test/token"),
    )
    monkeypatch.setattr(
        "app.services.oauth.tokens.httpx.post", lambda *_args, **_kwargs: response
    )
    connection = type(
        "Connection",
        (),
        {"encrypted_secret_ref": seal_credentials({"refresh_token": "refresh"})},
    )()
    assert refresh_connection_token_sync(connection, "https://oauth.test/token")[
        "refreshed"
    ]
    credentials = open_credentials(connection.encrypted_secret_ref)
    assert credentials["access_token"] == "sync-token"
    assert token_is_expired(credentials) is False
