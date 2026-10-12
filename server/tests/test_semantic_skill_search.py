from typing import Any

import pytest
from pydantic import SecretStr

from app.core.config import settings
from app.services import semantic_skill_search as search


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


class FakeEmbeddingClient:
    calls: list[tuple[Any, Any, Any]] = []

    def __init__(self, *args, **kwargs):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return None

    def post(self, url, *, headers, json):
        self.calls.append((url, headers, json))
        vectors = {
            "data analysis": [1.0, 0.0],
            "analytics": [0.9, 0.1],
        }
        return FakeResponse(
            {
                "data": [
                    {"index": index, "embedding": vectors[text.casefold()]}
                    for index, text in enumerate(json["input"])
                ]
            }
        )


def test_skill_similarity_cache_is_tenant_scoped_and_batches_embeddings(monkeypatch):
    monkeypatch.setattr(settings, "SEMANTIC_SKILL_EMBEDDINGS_ENABLED", True)
    monkeypatch.setattr(
        settings, "SEMANTIC_SKILL_EMBEDDING_API_KEY", SecretStr("test-secret")
    )
    monkeypatch.setattr(
        settings, "SEMANTIC_SKILL_EMBEDDING_API_BASE_URL", "https://embed.test/v1"
    )
    monkeypatch.setattr(settings, "EMBEDDING_MODEL", "test-embedding-model")
    monkeypatch.setattr(search.httpx, "Client", FakeEmbeddingClient)
    FakeEmbeddingClient.calls.clear()
    with search._cache_lock:
        search._embedding_cache.clear()

    first = search.build_skill_similarity_index(
        ["Data Analysis"], ["Analytics"], tenant_id="tenant-a"
    )
    repeated = search.build_skill_similarity_index(
        ["Data Analysis"], ["Analytics"], tenant_id="tenant-a"
    )
    isolated = search.build_skill_similarity_index(
        ["Data Analysis"], ["Analytics"], tenant_id="tenant-b"
    )

    assert first is not None
    assert first["similarities"][("data analysis", "analytics")] > 0.99
    assert repeated["similarities"] == first["similarities"]
    assert isolated["similarities"] == first["similarities"]
    assert len(FakeEmbeddingClient.calls) == 2
    assert FakeEmbeddingClient.calls[0][0] == "https://embed.test/v1/embeddings"
    assert FakeEmbeddingClient.calls[0][1]["Authorization"] == "Bearer test-secret"


def test_skill_similarity_is_disabled_without_explicit_opt_in(monkeypatch):
    monkeypatch.setattr(settings, "SEMANTIC_SKILL_EMBEDDINGS_ENABLED", False)
    monkeypatch.setattr(
        settings, "SEMANTIC_SKILL_EMBEDDING_API_KEY", SecretStr("test-secret")
    )
    assert not search.semantic_embeddings_configured()
    assert (
        search.build_skill_similarity_index(
            ["Data Analysis"], ["Analytics"], tenant_id="tenant-a"
        )
        is None
    )


def test_skill_similarity_treats_blank_api_key_as_unconfigured(monkeypatch):
    monkeypatch.setattr(settings, "SEMANTIC_SKILL_EMBEDDINGS_ENABLED", True)
    monkeypatch.setattr(settings, "SEMANTIC_SKILL_EMBEDDING_API_KEY", SecretStr("   "))
    assert not search.semantic_embeddings_configured()


def test_production_embedding_endpoint_requires_https(monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    with pytest.raises(search.SemanticEmbeddingError, match="HTTPS"):
        search._embed_missing(
            ["Analytics"],
            model="test-model",
            api_key="test-secret",
            base_url="http://embedding.test/v1",
        )
