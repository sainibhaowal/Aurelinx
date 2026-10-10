import pytest

from app.services.oauth.state import (
    create_oauth_state,
    create_pkce,
    decode_oauth_state_claims,
    verify_oauth_state,
)


def test_pkce_round_trip_shape():
    verifier, challenge = create_pkce()
    assert len(verifier) > 40
    assert len(challenge) > 40


def test_signed_oauth_state_binds_user_tenant_and_provider():
    state = create_oauth_state(
        "user-1", "tenant-1", "hibob", "https://app.example.test/oauth/callback"
    )
    body = verify_oauth_state(state, "user-1", "tenant-1", "hibob")
    assert body["provider"] == "hibob"
    with pytest.raises(ValueError):
        verify_oauth_state(state, "user-2", "tenant-1", "hibob")


def test_oauth_state_rejects_tampering():
    state = create_oauth_state(
        "user-1", "tenant-1", "hibob", "https://app.example.test/oauth/callback"
    )
    encoded, signature = state.split(".", 1)
    with pytest.raises(ValueError):
        verify_oauth_state(encoded + "x." + signature, "user-1", "tenant-1", "hibob")


def test_oauth_state_claim_decoder_rejects_malformed_input():
    with pytest.raises(ValueError):
        decode_oauth_state_claims("not-a-valid-state")
