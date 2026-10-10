"""Provider OAuth2/PKCE connection lifecycle."""

import os
import secrets
from datetime import datetime, timedelta
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlmodel import Session, select

from app.core.config import settings
from app.core.security import TokenData, get_current_admin_user_strict, get_tenant_id
from app.models.database import IntegrationConnectionTable, OAuthStateTable, get_session
from app.services.connectors.secrets import open_credentials, seal_credentials
from app.services.oauth.state import (
    create_oauth_state,
    create_pkce,
    decode_oauth_state_claims,
    verify_oauth_state,
)

router = APIRouter(prefix="/oauth", tags=["oauth"])


def _provider_config(provider: str) -> dict[str, str]:
    prefix = provider.upper().replace("-", "_")
    values = {
        key: os.getenv(f"{prefix}_OAUTH_{key}", "")
        for key in ("CLIENT_ID", "CLIENT_SECRET", "AUTH_URL", "TOKEN_URL")
    }
    if not all(values.values()):
        raise HTTPException(
            status_code=503, detail=f"OAuth is not configured for provider {provider}"
        )
    return values


@router.get("/{provider}/start")
def oauth_start(
    provider: str,
    connection_id: str = Query(...),
    mode: str = Query("redirect", pattern="^(redirect|json)$"),
    current_user: TokenData = Depends(get_current_admin_user_strict),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_session),
):
    if tenant_id != current_user.tenant_id:
        raise HTTPException(
            status_code=403, detail="Authenticated user is not assigned to this tenant"
        )
    connection = db.get(IntegrationConnectionTable, connection_id)
    if (
        not connection
        or connection.tenant_id != tenant_id
        or connection.provider != provider.lower()
    ):
        raise HTTPException(status_code=404, detail="Provider connection not found")
    config = _provider_config(provider)
    verifier, challenge = create_pkce()
    nonce = secrets.token_urlsafe(24)
    redirect_uri = f"{settings.PUBLIC_API_URL.rstrip('/')}/api/v1/oauth/{provider.lower()}/callback"
    state = create_oauth_state(
        str(current_user.user_id),
        tenant_id,
        provider,
        redirect_uri,
        nonce,
        connection_id,
    )
    db.add(
        OAuthStateTable(
            nonce=nonce,
            user_id=str(current_user.user_id),
            tenant_id=tenant_id,
            provider=provider.lower(),
            redirect_uri=redirect_uri,
            code_verifier=verifier,
            expires_at=datetime.utcnow() + timedelta(minutes=10),
        )
    )
    db.commit()
    query = urlencode(
        {
            "response_type": "code",
            "client_id": config["CLIENT_ID"],
            "redirect_uri": redirect_uri,
            "state": state,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
        }
    )
    authorization_url = f"{config['AUTH_URL']}?{query}"
    if mode == "json":
        return {
            "authorization_url": authorization_url,
            "provider": provider.lower(),
            "connection_id": connection_id,
        }
    return RedirectResponse(authorization_url)


@router.get("/{provider}/callback")
async def oauth_callback(
    provider: str, code: str, state: str, db: Session = Depends(get_session)
):
    try:
        claims = decode_oauth_state_claims(state)
        signed = verify_oauth_state(state, claims["uid"], claims["tid"], provider)
    except (ValueError, KeyError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    tenant_id = str(signed["tid"])
    transaction = db.exec(
        select(OAuthStateTable).where(
            OAuthStateTable.nonce == signed["nonce"],
            OAuthStateTable.tenant_id == tenant_id,
            OAuthStateTable.user_id == str(signed["uid"]),
        )
    ).first()
    if (
        not transaction
        or transaction.consumed_at
        or transaction.expires_at <= datetime.utcnow()
    ):
        raise HTTPException(
            status_code=400,
            detail="OAuth transaction is invalid, expired, or already consumed",
        )
    config = _provider_config(provider)
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            config["TOKEN_URL"],
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": transaction.redirect_uri,
                "client_id": config["CLIENT_ID"],
                "client_secret": config["CLIENT_SECRET"],
                "code_verifier": transaction.code_verifier,
            },
        )
    if response.is_error:
        raise HTTPException(
            status_code=502, detail="Provider OAuth token exchange failed"
        )
    token = response.json()
    if not token.get("access_token"):
        raise HTTPException(
            status_code=502, detail="Provider did not return an access token"
        )
    connection_id = signed.get("connection_id")
    connection = (
        db.get(IntegrationConnectionTable, connection_id) if connection_id else None
    )
    if (
        not connection
        or connection.tenant_id != tenant_id
        or connection.provider != provider.lower()
    ):
        raise HTTPException(
            status_code=400, detail="OAuth state is not bound to a provider connection"
        )
    credentials = open_credentials(connection.encrypted_secret_ref)
    credentials.update(
        {
            key: token[key]
            for key in ("access_token", "refresh_token", "expires_in", "token_type")
            if key in token
        }
    )
    connection.encrypted_secret_ref = seal_credentials(credentials)
    transaction.consumed_at = datetime.utcnow()
    db.add(connection)
    db.add(transaction)
    db.commit()
    return {
        "connected": True,
        "provider": provider.lower(),
        "connection_id": str(connection.id),
    }
