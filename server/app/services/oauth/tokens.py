"""OAuth access-token refresh with encrypted connection persistence."""

from datetime import datetime, timedelta
from typing import Any

import httpx

from app.services.connectors.secrets import open_credentials, seal_credentials


def token_is_expired(credentials: dict[str, Any], skew_seconds: int = 60) -> bool:
    value = credentials.get("access_token_expires_at")
    if not value:
        return False
    try:
        return (
            datetime.fromisoformat(str(value)).timestamp()
            <= datetime.utcnow().timestamp() + skew_seconds
        )
    except (TypeError, ValueError, OverflowError):
        return True


def refresh_connection_token_sync(connection: Any, token_url: str) -> dict[str, Any]:
    credentials = open_credentials(connection.encrypted_secret_ref)
    refresh_token = credentials.get("refresh_token")
    if not refresh_token:
        raise ValueError("Connection has no refresh token")
    response = httpx.post(
        token_url,
        data={"grant_type": "refresh_token", "refresh_token": refresh_token},
        timeout=30,
    )
    if response.is_error:
        raise ValueError("Provider token refresh failed")
    token = response.json()
    if not token.get("access_token"):
        raise ValueError("Provider refresh response did not contain access_token")
    credentials["access_token"] = token["access_token"]
    if token.get("refresh_token"):
        credentials["refresh_token"] = token["refresh_token"]
    if token.get("expires_in"):
        credentials["access_token_expires_at"] = (
            datetime.utcnow() + timedelta(seconds=int(token["expires_in"]))
        ).isoformat()
    connection.encrypted_secret_ref = seal_credentials(credentials)
    return {"refreshed": True, "expires_in": token.get("expires_in")}


async def refresh_connection_token(connection: Any, token_url: str) -> dict[str, Any]:
    credentials = open_credentials(connection.encrypted_secret_ref)
    refresh_token = credentials.get("refresh_token")
    if not refresh_token:
        raise ValueError("Connection has no refresh token")
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            token_url,
            data={"grant_type": "refresh_token", "refresh_token": refresh_token},
        )
    if response.is_error:
        raise ValueError("Provider token refresh failed")
    token = response.json()
    if not token.get("access_token"):
        raise ValueError("Provider refresh response did not contain access_token")
    credentials["access_token"] = token["access_token"]
    if token.get("refresh_token"):
        credentials["refresh_token"] = token["refresh_token"]
    if token.get("expires_in"):
        credentials["access_token_expires_at"] = (
            datetime.utcnow() + timedelta(seconds=int(token["expires_in"]))
        ).isoformat()
    connection.encrypted_secret_ref = seal_credentials(credentials)
    return {"refreshed": True, "expires_in": token.get("expires_in")}
