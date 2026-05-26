from __future__ import annotations

import os
from urllib.parse import urlparse, urlunparse

LOCAL_LOOPBACK_HOSTS = {"localhost", "127.0.0.1"}
DOCKER_HOST_ALIAS = "host.docker.internal"
DEFAULT_LMSTUDIO_BASE = "http://127.0.0.1:1234/v1"


def is_docker_runtime() -> bool:
    return os.path.exists("/.dockerenv") or os.getenv(
        "RUNNING_IN_DOCKER", ""
    ).strip().lower() in {"1", "true", "yes"}


def _replace_host(url: str, host: str) -> str:
    parsed = urlparse(url)
    if (
        not parsed.scheme
        or not parsed.netloc
        or parsed.hostname not in LOCAL_LOOPBACK_HOSTS
    ):
        return url
    if parsed.hostname == host:
        return url

    netloc = host
    if parsed.port:
        netloc = f"{netloc}:{parsed.port}"
    return urlunparse(parsed._replace(netloc=netloc))


def normalize_local_provider_base(
    base_url: str | None, default_base: str = DEFAULT_LMSTUDIO_BASE
) -> str:
    base = (base_url or default_base).strip()
    if not base:
        return default_base

    parsed = urlparse(base)
    if parsed.hostname in LOCAL_LOOPBACK_HOSTS and is_docker_runtime():
        return _replace_host(base, DOCKER_HOST_ALIAS)
    return base


def build_local_provider_base_candidates(
    base_url: str | None, default_base: str = DEFAULT_LMSTUDIO_BASE
) -> list[str]:
    base = (base_url or default_base).strip()
    if not base:
        return [default_base]

    parsed = urlparse(base)
    if parsed.hostname not in LOCAL_LOOPBACK_HOSTS:
        return [base]

    candidates: list[str] = []
    if is_docker_runtime():
        for host in (
            DOCKER_HOST_ALIAS,
            parsed.hostname,
            "127.0.0.1" if parsed.hostname == "localhost" else "localhost",
        ):
            candidate = _replace_host(base, host)
            if candidate not in candidates:
                candidates.append(candidate)
        return candidates

    return [base]
