from typing import Any

HIGH_IMPACT_ACTIONS = {
    "start_offboarding",
    "create_review_cycle",
    "send_manager_notification",
    "request_data_export",
}

_SECRET_KEYS = {
    "password",
    "token",
    "access_token",
    "refresh_token",
    "api_key",
    "secret",
    "client_secret",
    "authorization",
}


def contains_secret_key(value: Any) -> bool:
    if isinstance(value, dict):
        return any(
            str(key).lower() in _SECRET_KEYS or contains_secret_key(item)
            for key, item in value.items()
        )
    if isinstance(value, list):
        return any(contains_secret_key(item) for item in value)
    return False


def validate_action(
    action_type: str, payload: dict[str, Any], is_admin: bool
) -> str | None:
    if not is_admin:
        return "Only an administrator may create an outbound HR action."
    if not payload:
        return "Action payload cannot be empty."
    if contains_secret_key(payload):
        return "Provider credentials must be stored on the encrypted connection, not in an action payload."
    if action_type in {"delete_employee", "terminate_employee"}:
        return "Employment-impacting destructive actions require a dedicated approved workflow."
    return None
