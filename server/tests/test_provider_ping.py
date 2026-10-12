# Copyright 2026 Ravinder Singh
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Tests for the provider ping: real model-reply verification, auth errors."""

import httpx

from app.api.v1.chat import (
    ProviderPingRequest,
    _extract_ping_reply,
    ping_provider,
)


class _FakeResp:
    def __init__(self, status_code, payload=None, text=""):
        self.status_code = status_code
        self._payload = payload if payload is not None else {}
        self.text = text or ""

    def json(self):
        return self._payload


class _FakeClient:
    responses: list[_FakeResp] = []

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def post(self, *args, **kwargs):
        return _FakeClient.responses.pop(0)


def _patch(monkeypatch, responses):
    _FakeClient.responses = list(responses)
    monkeypatch.setattr(httpx, "AsyncClient", _FakeClient)


async def test_ping_reports_healthy_only_with_model_text(monkeypatch):
    _patch(
        monkeypatch,
        [
            _FakeResp(
                200,
                {"choices": [{"message": {"content": "ok"}}]},
                text='{"choices": []}',
            )
        ],
    )
    result = await ping_provider(
        ProviderPingRequest(
            provider="openrouter",
            api_key="test-key",
            model="nvidia/nemotron-3.5-lightning:free",
        )
    )
    assert result["status"] == "healthy"
    assert result["reply"] == "ok"
    assert result["latency_ms"] >= 0


async def test_ping_reports_degraded_on_empty_choices(monkeypatch):
    _patch(monkeypatch, [_FakeResp(200, {"choices": []}, text="{}")])
    result = await ping_provider(
        ProviderPingRequest(provider="openai", api_key="test-key")
    )
    assert result["status"] == "degraded"
    assert "no text" in result["message"]


async def test_ping_translates_401_into_auth_error(monkeypatch):
    raw = '{"error":{"message":"User not found.","code":401}}'
    _patch(monkeypatch, [_FakeResp(401, {}, text=raw)])
    result = await ping_provider(
        ProviderPingRequest(provider="openrouter", api_key="bad-key")
    )
    assert result["status"] == "error"
    assert "Authentication failed for openrouter" in result["message"]
    assert "User not found" in result["message"]


async def test_ping_requires_key_before_calling_provider(monkeypatch):
    import app.api.v1.chat as chat_api

    called = []

    class _SpyClient(_FakeClient):
        async def post(self, *args, **kwargs):
            called.append(True)
            return _FakeResp(200, {"choices": []})

    monkeypatch.setattr(httpx, "AsyncClient", _SpyClient)
    monkeypatch.setattr(chat_api, "_resolve_api_key", lambda provider, key: None)
    result = await ping_provider(
        ProviderPingRequest(provider="openrouter", api_key=None)
    )
    assert result["status"] == "error"
    assert "requires an API key" in result["message"]
    assert called == []


def test_extract_ping_reply_supports_provider_shapes():
    assert (
        _extract_ping_reply("claude", {"content": [{"type": "text", "text": "ok"}]})
        == "ok"
    )
    assert (
        _extract_ping_reply(
            "gemini",
            {"candidates": [{"content": {"parts": [{"text": "ok"}]}}]},
        )
        == "ok"
    )
    assert _extract_ping_reply("openai", {"choices": [{"message": {}}]}) == ""
