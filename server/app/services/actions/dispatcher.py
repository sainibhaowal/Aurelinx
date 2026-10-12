"""Execution boundary for approved provider actions.

Provider adapters are deliberately not called until their action methods are
implemented and an immutable request has status ``approved``.
"""

from typing import Any

from app.services.connectors.factory import get_connector
from app.services.connectors.secrets import open_credentials
from app.services.oauth.tokens import refresh_connection_token_sync, token_is_expired


def _connection_config(connection: Any) -> dict[str, Any]:
    """Build the connector request shape without exposing stored secrets."""
    credentials = open_credentials(getattr(connection, "encrypted_secret_ref", None))
    options = credentials.pop("__options", {}) if credentials else {}
    token_url = credentials.get("token_url") or options.get("token_url")
    if token_url and token_is_expired(credentials) and credentials.get("refresh_token"):
        refresh_connection_token_sync(connection, token_url)
        credentials = open_credentials(
            getattr(connection, "encrypted_secret_ref", None)
        )
        options = credentials.pop("__options", {}) if credentials else {}
    return {
        "connection": connection,
        "session": None,
        "base_url": getattr(connection, "base_url", None),
        "credentials": credentials,
        "options": options,
    }


def dispatch_approved_action(
    provider: str, action_type: str, payload: dict[str, Any], connection: Any
) -> dict[str, Any]:
    connector = get_connector(provider)
    if connector is None:
        raise NotImplementedError(
            f"No connector is registered for {provider}; action remains safely unexecuted"
        )
    if not connector.supports_action(action_type):
        raise NotImplementedError(
            f"{provider} does not support {action_type}; no provider request was made"
        )
    result = connector.execute_action(
        _connection_config(connection), action_type, payload
    )
    if not isinstance(result, dict):
        raise RuntimeError("Provider action adapter returned an invalid result")
    return result
