"""Stateless signed OAuth state and PKCE primitives.

The signed state binds a callback to the authenticated user, tenant, provider,
and redirect target. A production callback must also persist and consume the
nonce once; this module intentionally contains no process-local state.
"""

import base64
import binascii
import hashlib
import hmac
import json
import secrets
import time
from urllib.parse import urlparse

from app.core.config import settings


def create_pkce() -> tuple[str, str]:
    verifier = secrets.token_urlsafe(64)
    challenge = (
        base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest())
        .rstrip(b"=")
        .decode()
    )
    return verifier, challenge


def create_oauth_state(
    user_id: str,
    tenant_id: str,
    provider: str,
    redirect_uri: str,
    nonce: str | None = None,
    connection_id: str | None = None,
) -> str:
    parsed = urlparse(redirect_uri)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("OAuth redirect URI must be an absolute HTTP(S) URL")
    body = {
        "uid": str(user_id),
        "tid": str(tenant_id),
        "provider": provider.lower(),
        "redirect": redirect_uri,
        "nonce": nonce or secrets.token_urlsafe(24),
        "iat": int(time.time()),
    }
    if connection_id:
        body["connection_id"] = str(connection_id)
    encoded = (
        base64.urlsafe_b64encode(
            json.dumps(body, separators=(",", ":"), sort_keys=True).encode()
        )
        .rstrip(b"=")
        .decode()
    )
    signature = hmac.new(
        settings.SECRET_KEY.encode(), encoded.encode(), hashlib.sha256
    ).hexdigest()
    return f"{encoded}.{signature}"


def verify_oauth_state(
    state: str, user_id: str, tenant_id: str, provider: str, max_age_seconds: int = 600
) -> dict:
    try:
        encoded, signature = state.split(".", 1)
        expected = hmac.new(
            settings.SECRET_KEY.encode(), encoded.encode(), hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError("OAuth state signature is invalid")
        padded = encoded + "=" * (-len(encoded) % 4)
        body = json.loads(base64.urlsafe_b64decode(padded.encode()).decode())
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise ValueError("OAuth state is invalid") from exc
    if int(time.time()) - int(body.get("iat", 0)) > max_age_seconds:
        raise ValueError("OAuth state has expired")
    if (
        str(body.get("uid")) != str(user_id)
        or str(body.get("tid")) != str(tenant_id)
        or body.get("provider") != provider.lower()
    ):
        raise ValueError("OAuth state does not match the authenticated connection")
    return body


def decode_oauth_state_claims(state: str) -> dict:
    """Decode claims for lookup without trusting them until signature verification."""
    try:
        encoded = state.split(".", 1)[0]
        padded = encoded + "=" * (-len(encoded) % 4)
        body = json.loads(base64.urlsafe_b64decode(padded.encode()).decode())
        if (
            not isinstance(body, dict)
            or not body.get("uid")
            or not body.get("tid")
            or not body.get("nonce")
        ):
            raise ValueError("OAuth state claims are incomplete")
        return body
    except (
        ValueError,
        IndexError,
        json.JSONDecodeError,
        UnicodeDecodeError,
        binascii.Error,
    ) as exc:
        raise ValueError("OAuth state claims are invalid") from exc
