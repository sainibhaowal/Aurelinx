"""Unit tests for OpenCode Zen client signature, auth, session/request IDs, and error handling."""

import re

from app.api.v1.chat import (
    _OPENAI_COMPATIBLE_PROVIDER_URLS,
    _OPENCODE_SESSION_RE,
    _openai_compatible_base,
    _openai_compatible_model_list,
    _opencode_api_mode,
    _opencode_google_payload,
    _opencode_headers,
    _opencode_request_id,
    _opencode_route,
    _opencode_session_id,
    _provider_error_detail,
)


def test_opencode_session_id_format():
    # Fresh session generation
    for _ in range(10):
        sid = _opencode_session_id()
        assert _OPENCODE_SESSION_RE.match(sid), f"Invalid session id: {sid}"
        assert len(sid) == 30

    # Deterministic translation of foreign/arbitrary session ids
    translated1 = _opencode_session_id("conv-uuid-1234")
    translated2 = _opencode_session_id("conv-uuid-1234")
    assert translated1 == translated2
    assert _OPENCODE_SESSION_RE.match(translated1)

    # Preservation of valid OpenCode session
    valid = "ses_f534dfae8ffeCy4Ee4tLWNygDc"
    assert _opencode_session_id(valid) == valid


def test_opencode_request_id_format():
    for _ in range(10):
        rid = _opencode_request_id()
        assert rid.startswith("msg_")
        assert len(rid) == 30
        assert re.match(r"^msg_[0-9a-f]{12}[0-9A-Za-z]{14}$", rid)


def test_opencode_headers_defaults_and_signature():
    headers = _opencode_headers()
    assert headers["Content-Type"] == "application/json"
    assert headers["User-Agent"].startswith("opencode/1.18.31")
    assert "ai-sdk/provider-utils" in headers["User-Agent"]
    assert headers["x-opencode-client"] == "cli"
    assert headers["x-opencode-project"] == "global"
    assert headers["Authorization"] == "Bearer public"
    assert _OPENCODE_SESSION_RE.match(headers["x-opencode-session"])
    assert headers["x-opencode-request"].startswith("msg_")


def test_opencode_headers_with_api_key_and_anthropic_mode():
    headers = _opencode_headers(api_key="zen_sec_key_123", mode="messages")
    assert headers["Authorization"] == "Bearer zen_sec_key_123"
    assert headers["x-api-key"] == "zen_sec_key_123"
    assert headers["anthropic-version"] == "2023-06-01"


def test_opencode_route_and_mode_mapping():
    assert _opencode_api_mode("gpt-5.5") == "responses"
    assert _opencode_api_mode("grok-4.5") == "responses"
    assert _opencode_api_mode("muse-spark-1.2-contributor-free") == "responses"
    assert _opencode_api_mode("claude-sonnet-4") == "messages"
    assert _opencode_api_mode("qwen3.6-plus") == "messages"
    assert _opencode_api_mode("qwen3.8-max") == "chat_completions"
    assert _opencode_api_mode("qwen3.8-flash") == "messages"
    assert _opencode_api_mode("gemini-3.8-flash") == "google"
    assert _opencode_api_mode("deepseek-v4-flash-free") == "chat_completions"
    assert _opencode_api_mode("mimo-v2.5-free") == "chat_completions"

    assert _opencode_route("responses") == "responses"
    assert _opencode_route("messages") == "messages"
    assert _opencode_route("chat_completions") == "chat/completions"


def test_opencode_google_transport_and_history_payload():
    headers = _opencode_headers(api_key="zen-key", mode="google")
    assert headers["x-goog-api-key"] == "zen-key"
    payload = _opencode_google_payload(
        "gemini-3.8-flash",
        "system rules",
        [{"role": "assistant", "content": "previous"}],
        "current question",
        0.2,
    )
    assert payload["model"] == "gemini-3.8-flash"
    assert payload["systemInstruction"]["parts"][0]["text"] == "system rules"
    assert payload["contents"] == [
        {"role": "model", "parts": [{"text": "previous"}]},
        {"role": "user", "parts": [{"text": "current question"}]},
    ]


def test_added_provider_urls_and_model_catalog_shapes():
    assert set(_OPENAI_COMPATIBLE_PROVIDER_URLS) == {
        "moonshot",
        "zai",
        "nvidia",
        "deepseek",
        "mistral",
        "cline",
    }
    assert (
        _openai_compatible_base("deepseek", "https://proxy.example/v1/")
        == "https://proxy.example/v1"
    )
    assert _openai_compatible_model_list({"data": [{"id": "model-a"}]}) == ["model-a"]
    assert _openai_compatible_model_list([{"id": "model-b"}]) == ["model-b"]


def test_provider_error_detail_free_tier():
    err = 'HTTP 403 provider response: {"type":"error","error":{"type":"FreeTierError","message":"Error from provider (Console): OpenCode\'s free tier can only be used from within OpenCode"}}'
    detail = _provider_error_detail(err)
    assert "OpenCode" in detail
    assert "settings" in detail
    assert "\u2014" not in detail  # Strict rule: no em dashes
