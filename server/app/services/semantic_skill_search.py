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

"""Optional, tenant-scoped vector similarity for uploaded skill labels.

Only skill names are sent to the configured embedding endpoint. Profile names,
emails, salaries, departments, IDs, and full employee/candidate records never
leave the application through this module. Vector matches are discovery hints,
not calibrated job-fit or equivalence probabilities.
"""

from __future__ import annotations

import hashlib
import math
import threading
from collections import OrderedDict
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx

from app.core.config import settings

_CACHE_MAX_ENTRIES = 512
_embedding_cache: OrderedDict[tuple[str, str, str, str, str], tuple[float, ...]] = (
    OrderedDict()
)
_cache_lock = threading.RLock()


class SemanticEmbeddingError(RuntimeError):
    """Raised when the configured embedding service returns unusable vectors."""


def semantic_embeddings_configured() -> bool:
    api_key = settings.SEMANTIC_SKILL_EMBEDDING_API_KEY
    return bool(
        settings.SEMANTIC_SKILL_EMBEDDINGS_ENABLED
        and api_key
        and api_key.get_secret_value().strip()
        and settings.EMBEDDING_MODEL
    )


def _cache_get(key: tuple[str, str, str, str, str]) -> tuple[float, ...] | None:
    with _cache_lock:
        value = _embedding_cache.get(key)
        if value is not None:
            _embedding_cache.move_to_end(key)
        return value


def _cache_put(key: tuple[str, str, str, str, str], value: tuple[float, ...]) -> None:
    with _cache_lock:
        _embedding_cache[key] = value
        _embedding_cache.move_to_end(key)
        while len(_embedding_cache) > _CACHE_MAX_ENTRIES:
            _embedding_cache.popitem(last=False)


def _embed_missing(
    texts: list[str], *, model: str, api_key: str, base_url: str
) -> dict[str, tuple[float, ...]]:
    """Request one bounded batch and validate its indexes and vector dimensions."""
    if not texts:
        return {}
    endpoint = urljoin(base_url.rstrip("/") + "/", "embeddings")
    parsed_endpoint = urlparse(endpoint)
    if (
        parsed_endpoint.scheme != "https"
        and settings.ENVIRONMENT.casefold() == "production"
    ):
        raise SemanticEmbeddingError("Production embedding endpoints must use HTTPS")
    if not parsed_endpoint.hostname or parsed_endpoint.username:
        raise SemanticEmbeddingError("Embedding endpoint URL is invalid")
    vectors: dict[str, tuple[float, ...]] = {}
    # Keep requests bounded for compatible providers with smaller batch limits.
    with httpx.Client(timeout=httpx.Timeout(20.0, connect=5.0)) as client:
        for start in range(0, len(texts), 128):
            batch = texts[start : start + 128]
            response = client.post(
                endpoint,
                headers={"Authorization": f"Bearer {api_key}"},
                json={"model": model, "input": batch},
            )
            response.raise_for_status()
            data = response.json().get("data")
            if not isinstance(data, list) or len(data) != len(batch):
                raise SemanticEmbeddingError("Embedding response count is invalid")
            by_index: dict[int, tuple[float, ...]] = {}
            expected_dimensions: int | None = None
            for row in data:
                if not isinstance(row, dict) or not isinstance(row.get("index"), int):
                    raise SemanticEmbeddingError("Embedding response index is invalid")
                raw_vector = row.get("embedding")
                if not isinstance(raw_vector, list) or not raw_vector:
                    raise SemanticEmbeddingError("Embedding vector is empty")
                vector = tuple(float(value) for value in raw_vector)
                if not all(math.isfinite(value) for value in vector):
                    raise SemanticEmbeddingError(
                        "Embedding vector contains invalid values"
                    )
                if expected_dimensions is None:
                    expected_dimensions = len(vector)
                elif len(vector) != expected_dimensions:
                    raise SemanticEmbeddingError("Embedding vector dimensions differ")
                by_index[row["index"]] = vector
            if set(by_index) != set(range(len(batch))):
                raise SemanticEmbeddingError(
                    "Embedding response indexes are incomplete"
                )
            vectors.update({text: by_index[index] for index, text in enumerate(batch)})
    return vectors


def build_skill_similarity_index(
    target_names: list[str],
    catalog_names: list[str],
    *,
    tenant_id: str,
) -> dict[str, Any] | None:
    """Return target-to-catalog cosine similarities, or None when not enabled.

    Cache entries are tenant/model/text scoped and contain only vectors for
    skill labels. A catalog update naturally requests vectors for new labels.
    """
    if not semantic_embeddings_configured():
        return None

    model = settings.EMBEDDING_MODEL
    api_key_secret = settings.SEMANTIC_SKILL_EMBEDDING_API_KEY
    api_key = api_key_secret.get_secret_value() if api_key_secret else None
    base_url = settings.SEMANTIC_SKILL_EMBEDDING_API_BASE_URL
    if not api_key or not api_key.strip() or not base_url:
        return None
    credential_fingerprint = hashlib.sha256(api_key.encode()).hexdigest()[:16]

    targets = list(dict.fromkeys(name.strip() for name in target_names if name.strip()))
    catalog = list(
        dict.fromkeys(name.strip() for name in catalog_names if name.strip())
    )
    if not targets or not catalog:
        return {
            "similarities": {},
            "model": model,
            "catalog_skills_embedded": len(catalog),
            "target_skills_embedded": len(targets),
        }
    all_names = list(dict.fromkeys([*targets, *catalog]))
    cache_keys = {
        name: (
            tenant_id,
            base_url,
            model,
            credential_fingerprint,
            name.casefold(),
        )
        for name in all_names
    }
    vectors = {
        name: cached
        for name, key in cache_keys.items()
        if (cached := _cache_get(key)) is not None
    }
    missing = [name for name in all_names if name not in vectors]
    if missing:
        created = _embed_missing(
            missing, model=model, api_key=api_key, base_url=base_url
        )
        for name, vector in created.items():
            vectors[name] = vector
            _cache_put(cache_keys[name], vector)

    dimensions = {len(vectors[name]) for name in all_names}
    if len(dimensions) != 1:
        raise SemanticEmbeddingError("Embedding model returned inconsistent dimensions")

    normalized_targets = {}
    for name in targets:
        vector = vectors[name]
        norm = math.sqrt(math.fsum(value * value for value in vector))
        normalized_targets[name] = (
            tuple(value / norm for value in vector) if norm else ()
        )
    normalized_catalog = {}
    for name in catalog:
        vector = vectors[name]
        norm = math.sqrt(math.fsum(value * value for value in vector))
        normalized_catalog[name] = (
            tuple(value / norm for value in vector) if norm else ()
        )
    result = {}
    for target, target_vector in normalized_targets.items():
        for candidate, candidate_vector in normalized_catalog.items():
            similarity = (
                math.fsum(
                    left * right
                    for left, right in zip(target_vector, candidate_vector, strict=True)
                )
                if target_vector and candidate_vector
                else 0.0
            )
            result[(target.casefold(), candidate.casefold())] = similarity
    return {
        "similarities": result,
        "model": model,
        "catalog_skills_embedded": len(catalog),
        "target_skills_embedded": len(targets),
    }
