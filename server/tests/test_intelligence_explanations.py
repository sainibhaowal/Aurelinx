# Copyright 2026 Ravinder Singh
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.

from fastapi.testclient import TestClient

from app.core.security import TokenData, get_current_user
from app.main import app


def test_intelligence_explanation_stream_uses_workflow_model_stream(monkeypatch):
    captured = {}

    async def fake_model_stream(**kwargs):
        captured.update(kwargs)
        yield "<think>"
        yield "private reasoning"
        yield "</think>"
        yield "## Current result\n"
        yield "The supplied model status is insufficient_outcome_data."

    import app.api.v1.chat as chat_api

    monkeypatch.setattr(chat_api, "_llm_stream_response", fake_model_stream)
    monkeypatch.setitem(
        app.dependency_overrides,
        get_current_user,
        lambda: TokenData(
            user_id="00000000-0000-0000-0000-000000000001",
            email="explain@example.test",
            tenant_id="explain-tenant",
        ),
    )

    payload = {
        "subtab": "attrition",
        "provider": "openrouter",
        "api_key": "test-key",
        "model": "test-model",
        "context": {
            "model": {
                "status": "cohort_descriptive",
                "eligible_observation_count": 42,
                "observed_departure_count": 8,
                "right_censored_count": 34,
                "individual_forecasts_available": False,
            },
            "survivalCurve": [],
        },
    }
    response = TestClient(app).post("/api/v1/intelligence/explain/stream", json=payload)

    assert response.status_code == 200
    assert 'event: chunk\ndata: {"text": "## Current result\\n"}' in response.text
    assert "private reasoning" not in response.text
    assert "event: done" in response.text
    assert captured["provider"] == "openrouter"
    assert captured["api_key"] == "test-key"
    assert captured["model"] == "test-model"
    assert "cohort_descriptive" in captured["user_content_override"]
    assert "not an individual forecast" in captured["system_override"]


def test_intelligence_explanation_stream_rejects_unknown_subtab(monkeypatch):
    monkeypatch.setitem(
        app.dependency_overrides,
        get_current_user,
        lambda: TokenData(
            user_id="00000000-0000-0000-0000-000000000001",
            email="explain@example.test",
            tenant_id="explain-tenant",
        ),
    )
    response = TestClient(app).post(
        "/api/v1/intelligence/explain/stream",
        json={"subtab": "missing", "context": {}},
    )

    assert response.status_code == 400


def test_ona_explanation_uses_record_scope_and_retry_caveat(monkeypatch):
    captured = {}

    async def fake_model_stream(**kwargs):
        captured.update(kwargs)
        yield "## Evidence-based network summary"

    import app.api.v1.chat as chat_api

    monkeypatch.setattr(chat_api, "_llm_stream_response", fake_model_stream)
    monkeypatch.setitem(
        app.dependency_overrides,
        get_current_user,
        lambda: TokenData(
            user_id="00000000-0000-0000-0000-000000000001",
            email="explain@example.test",
            tenant_id="explain-tenant",
        ),
    )
    context = {
        "graphMetrics": {
            "source": "tenant_uploaded_collaboration_events",
            "window_days": 90,
            "represented_record_count": 4,
            "status": "available",
        },
        "nodeCount": 5,
        "linkCount": 3,
        "selectedNode": {"name": "A. Employee", "degree": 2},
        "selectedNodeNeighbors": [],
    }
    response = TestClient(app).post(
        "/api/v1/intelligence/explain/stream",
        json={
            "subtab": "ona",
            "provider": "openrouter",
            "api_key": "test-key",
            "context": context,
        },
    )

    assert response.status_code == 200
    assert (
        "unique, tenant-scoped uploaded collaboration records"
        in captured["system_override"]
    )
    assert "do not prove direct" in captured["system_override"]
    assert "tenant_uploaded_collaboration_events" in captured["user_content_override"]


def test_career_path_explanation_labels_empirical_steps_and_nonforecast_status(
    monkeypatch,
):
    captured = {}

    async def fake_model_stream(**kwargs):
        captured.update(kwargs)
        yield "## Observed role transitions"

    import app.api.v1.chat as chat_api

    monkeypatch.setattr(chat_api, "_llm_stream_response", fake_model_stream)
    monkeypatch.setitem(
        app.dependency_overrides,
        get_current_user,
        lambda: TokenData(
            user_id="00000000-0000-0000-0000-000000000001",
            email="explain@example.test",
            tenant_id="explain-tenant",
        ),
    )
    result = {
        "model_status": "exploratory_observed_transitions",
        "validation_status": "not_validated_as_individual_forecast",
        "transition_unit": "next observed role change; no elapsed-time estimate",
        "observed_transition_count": 12,
        "career_progression_markov": [
            {
                "projected_time_horizon": "Next observed role change",
                "possibilities": [
                    {"role": "Senior Engineer", "transition_probability": 0.75}
                ],
                "unmodeled_probability_mass": 0.25,
            }
        ],
    }
    response = TestClient(app).post(
        "/api/v1/intelligence/explain/stream",
        json={
            "subtab": "career-path",
            "provider": "openrouter",
            "api_key": "test-key",
            "context": {"careerPathData": result},
        },
    )

    assert response.status_code == 200
    assert "empirical frequencies" in captured["system_override"]
    assert "not a year" in captured["system_override"]
    assert "not validated" in captured["system_override"]
    assert "unmodeled probability mass" in captured["system_override"]
    assert "observed_transition_count" in captured["user_content_override"]
