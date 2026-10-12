import asyncio

from app.api.v1.analysis import _call_openai_compatible_model
from app.schemas.schemas import AIAnalysisRequest


def test_talent_scout_accepts_configured_provider_ids_and_aliases():
    assert (
        AIAnalysisRequest(
            prompt="Find a senior analyst", provider=" OpenRouter "
        ).provider
        == "openrouter"
    )
    assert (
        AIAnalysisRequest(prompt="Find a senior analyst", provider="anthropic").provider
        == "claude"
    )
    assert (
        AIAnalysisRequest(prompt="Find a senior analyst", provider="google").provider
        == "gemini"
    )
    assert (
        AIAnalysisRequest(prompt="Find a senior analyst", provider="moonshot").provider
        == "moonshot"
    )


def test_talent_scout_calls_openrouter_with_selected_model_and_key(monkeypatch):
    captured = {}

    class FakeResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {"choices": [{"message": {"content": "AI-ranked report"}}]}

    class FakeAsyncClient:
        def __init__(self, timeout):
            captured["timeout"] = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        async def post(self, endpoint, *, json, headers):
            captured.update(endpoint=endpoint, payload=json, headers=headers)
            return FakeResponse()

    monkeypatch.setattr("app.api.v1.analysis.httpx.AsyncClient", FakeAsyncClient)

    result = asyncio.run(
        _call_openai_compatible_model(
            provider="openrouter",
            prompt="Find a senior analyst",
            ranked_profiles=[{"name": "Alex", "ranking_score": 0.91}],
            api_key="test-openrouter-key",
            base_url="https://openrouter.ai/api/v1",
            model="nvidia/nemotron-3.5-lightning:free",
        )
    )

    assert result == "AI-ranked report"
    assert captured["endpoint"] == "https://openrouter.ai/api/v1/chat/completions"
    assert captured["payload"]["model"] == "nvidia/nemotron-3.5-lightning:free"
    assert captured["headers"]["Authorization"] == "Bearer test-openrouter-key"
    assert captured["headers"]["X-Title"] == "Aurelinx Talent Scout"


def test_talent_scout_uses_anthropic_messages_protocol(monkeypatch):
    captured = {}

    class FakeResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {"content": [{"type": "text", "text": "Claude report"}]}

    class FakeAsyncClient:
        def __init__(self, timeout):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        async def post(self, endpoint, *, json, headers):
            captured.update(endpoint=endpoint, payload=json, headers=headers)
            return FakeResponse()

    monkeypatch.setattr("app.api.v1.analysis.httpx.AsyncClient", FakeAsyncClient)

    result = asyncio.run(
        _call_openai_compatible_model(
            provider="claude",
            prompt="Find a senior analyst",
            ranked_profiles=[],
            api_key="test-claude-key",
            model="claude-3-5-sonnet-20241022",
        )
    )

    assert result == "Claude report"
    assert captured["endpoint"] == "https://api.anthropic.com/v1/messages"
    assert captured["payload"]["model"] == "claude-3-5-sonnet-20241022"
    assert captured["headers"]["x-api-key"] == "test-claude-key"
