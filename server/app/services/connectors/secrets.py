"""Small authenticated encryption envelope for connector credentials.

The application secret is the key-encryption root. Production deployments should
still prefer an external secret manager; this keeps credentials out of plaintext
database columns while allowing the connector service to operate without one.
"""

import base64
import hashlib
import json
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings

PREFIX = "aurelinx:v1:"


def _key() -> bytes:
    return hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()


def seal_credentials(credentials: dict) -> str:
    nonce = os.urandom(12)
    plaintext = json.dumps(credentials, separators=(",", ":"), sort_keys=True).encode()
    encrypted = AESGCM(_key()).encrypt(nonce, plaintext, b"aurelinx-connector")
    return PREFIX + base64.urlsafe_b64encode(nonce + encrypted).decode()


def open_credentials(value: str | None) -> dict:
    if not value or not value.startswith(PREFIX):
        return {}
    try:
        raw = base64.urlsafe_b64decode(value[len(PREFIX) :].encode())
        plaintext = AESGCM(_key()).decrypt(raw[:12], raw[12:], b"aurelinx-connector")
        parsed = json.loads(plaintext.decode())
        return parsed if isinstance(parsed, dict) else {}
    except Exception as exc:
        raise ValueError("Connector credentials could not be decrypted") from exc
