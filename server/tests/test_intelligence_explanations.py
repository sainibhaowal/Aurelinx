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
    assert (
        '"stage": "working", "message": "Preparing your explanation from the selected analysis…"'
        in response.text
    )
    assert (
        '"stage": "connecting", "message": "Connecting to openrouter…"' in response.text
    )
    assert (
        '"stage": "thinking", "message": "The model is thinking through the analysis…"'
        in response.text
    )
    assert '"stage": "writing", "message": "Writing your explanation…"' in response.text
    assert (
        '"stage": "finishing", "message": "Finishing the explanation…"' in response.text
    )
    assert 'event: chunk\ndata: {"text": "## Current result\\n"}' in response.text
    assert "private reasoning" not in response.text
    assert "event: done" in response.text
    assert captured["provider"] == "openrouter"
    assert captured["api_key"] == "test-key"
    assert captured["model"] == "test-model"
    assert captured.get("reasoning_effort_override") is None
    assert "cohort_descriptive" in captured["user_content_override"]
    assert "explanationExecution" in captured["user_content_override"]
    assert '"provider": "openrouter"' in captured["user_content_override"]
    assert '"model": "test-model"' in captured["user_content_override"]
    assert "Generate the entire report yourself" in captured["system_override"]
    assert "pre-rendered header exists" in captured["system_override"]
    assert "not an individual forecast" in captured["system_override"]
    assert "run identity" in captured["system_override"]
    assert "Reasoning questions" in captured["system_override"]
    assert "Strongest supported findings" in captured["system_override"]
    assert "own headings" in captured["system_override"]
    assert "Selected record in focus" in captured["system_override"]
    assert "selectedEmployee" in captured["system_override"]


def test_intelligence_explanation_stream_times_out_before_first_visible_text(
    monkeypatch,
):
    import asyncio

    import app.api.v1.chat as chat_api
    import app.api.v1.intelligence as intelligence_api

    async def slow_model_stream(**kwargs):
        await asyncio.sleep(2.1)
        yield "This text arrives too late."

    monkeypatch.setattr(chat_api, "_llm_stream_response", slow_model_stream)
    monkeypatch.setattr(intelligence_api, "EXPLANATION_FIRST_TEXT_TIMEOUT_SECONDS", 2.0)
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
        json={"subtab": "career-path", "provider": "openrouter", "context": {}},
    )

    assert response.status_code == 200
    assert "did not produce answer text within 2 seconds" in response.text
    assert "event: error" in response.text
    assert "This text arrives too late" not in response.text


def test_team_deterministic_explanation_covers_roster_budget_and_stale():
    from app.api.v1.intelligence import _generate_deterministic_explanation

    context = {
        "stale": True,
        "currentForm": {
            "budget_cap": 314000,
            "max_team_size": 6,
            "target_skills": [{"name": "Python", "level": 3}] * 14,
        },
        "optimizedTeam": {
            "run_inputs": {
                "target_skills": [{"name": "Python", "level": 3}],
                "budget_cap": 500000,
                "max_team_size": 6,
            },
            "compensation_unit": "EUR per annual",
            "compensation_provenance": "Employee record values; source provenance is not stored per employee.",
            "optimality_proven": True,
            "search_status": "optimal",
            "budget_cap": 500000,
            "source_scope": {"eligible_employee_count": 1233},
            "optimized_team": [
                {
                    "full_name": "Ada Lovelace",
                    "role": "Software Engineer",
                    "department": "Engineering & IT",
                    "estimated_cost": 52000,
                }
            ],
            "metrics": {
                "optimization_coverage_percentage": 100,
                "ontology_adjusted_coverage_percentage": 100,
                "total_cost": 314000,
                "budget_usage_percentage": 62.8,
                "skills_coverage": [
                    {
                        "skill": "Python",
                        "target_level": 3,
                        "coverage_percentage": 100,
                        "exact_match_coverage_percentage": 100,
                        "match_basis": "exact_skill_name",
                        "contributed_by_skill": "Python",
                        "exact_match_skill": "Python",
                        "ontology_path": [],
                        "achieved_effective_level": 4,
                    }
                ],
            },
        },
    }
    text = _generate_deterministic_explanation("team-builder", context)
    assert "SAVED run only" in text
    assert "Ada Lovelace" in text
    assert "314000" in text
    assert "62.8% used" in text
    assert "### Roster" in text
    assert "### Per-skill evidence" in text


def test_attrition_deterministic_explanation_reports_run_identity():
    from app.api.v1.intelligence import _generate_deterministic_explanation

    text = _generate_deterministic_explanation(
        "attrition",
        {
            "model": {
                "status": "cohort_descriptive",
                "eligible_observation_count": 42,
                "observed_departure_count": 8,
                "right_censored_count": 34,
                "estimator": "kaplan-meier",
                "validation": {"status": "not_applicable_to_descriptive_estimator"},
            },
            "runIdentity": {
                "scenarioId": "AT-20261010-1234abcd",
                "generatedAt": "2026-10-10T12:00:00",
            },
        },
    )
    assert "AT-20261010-1234abcd" in text
    assert "42 valid durations" in text


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


def test_team_explanation_uses_saved_inputs_and_per_skill_ontology_evidence(
    monkeypatch,
):
    captured = {}

    async def fake_model_stream(**kwargs):
        captured.update(kwargs)
        yield "## Evidence-based team result"

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
    response = TestClient(app).post(
        "/api/v1/intelligence/explain/stream",
        json={
            "subtab": "team-builder",
            "provider": "openrouter",
            "api_key": "test-key",
            "context": {
                "optimizedTeam": {
                    "run_inputs": {
                        "target_skills": [{"name": "Python", "level": 3}],
                        "budget_cap": 300000,
                        "max_team_size": 3,
                    },
                    "compensation_unit": "EUR per annual",
                    "compensation_provenance": "Employee record values; source provenance is not stored per employee.",
                    "optimality_proven": True,
                    "source_scope": {"eligible_employee_count": 1233},
                    "metrics": {
                        "coverage_percentage": 80,
                        "exact_skill_coverage_percentage": 0,
                        "skills_coverage": [
                            {
                                "skill": "Python",
                                "target_level": 3,
                                "coverage_percentage": 80,
                                "match_basis": "ontology_bridge",
                                "contributed_by_skill": "Data Analysis",
                                "ontology_path": [
                                    "Data Analysis",
                                    "Data Science",
                                    "Python",
                                ],
                                "achieved_effective_level": 2.4,
                            }
                        ],
                    },
                }
            },
        },
    )

    assert response.status_code == 200
    assert "Separate exact skill-name" in captured["system_override"]
    assert "proficiency" in captured["system_override"]
    assert "own headings and flow" in captured["system_override"]
    assert "skill-by-skill evidence" in captured["system_override"]
    assert "workforce analytics consultant" in captured["system_override"]
    assert "customer-ready professional report" in captured["system_override"]
    assert "WHAT the data" in captured["system_override"]
    assert "`stale` is true" in captured["system_override"]
    assert '"budget_cap": 300000' in captured["user_content_override"]
    assert "ontology_bridge" in captured["user_content_override"]
    assert (
        '"ontology_path": ["Data Analysis", "Data Science", "Python"]'
        in captured["user_content_override"]
    )
    assert (
        "source provenance is not stored per employee"
        in captured["user_content_override"]
    )


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


def test_skill_explanation_labels_vector_matches_as_unvalidated(monkeypatch):
    captured = {}

    async def fake_model_stream(**kwargs):
        captured.update(kwargs)
        yield "## Reviewed skill evidence"

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
    response = TestClient(app).post(
        "/api/v1/intelligence/explain/stream",
        json={
            "subtab": "skill-match",
            "provider": "openrouter",
            "api_key": "test-key",
            "context": {
                "targetSkills": [{"name": "Analytics", "level": 3}],
                "matchResults": [
                    {
                        "profile_key": "candidate:profile-1",
                        "entity_type": "candidate",
                        "full_name": "Example Candidate",
                        "match_details": {
                            "overall_compatibility": 0.91,
                            "detailed_matches": [
                                {
                                    "target_skill": "Analytics",
                                    "matched_by_skill": "Data Analysis",
                                    "evidence_type": "embedding_semantic_candidate",
                                    "semantic_similarity": 0.91,
                                    "match_confidence": 0.91,
                                }
                            ],
                        },
                    }
                ],
                "skillMatchMetadata": {
                    "embedding_status": "ready",
                    "embedding_model": "test-embedding-model",
                },
            },
        },
    )

    assert response.status_code == 200
    assert "unvalidated retrieval hint" in captured["system_override"]
    assert "test-embedding-model" in captured["user_content_override"]
    assert "0.91" in captured["user_content_override"]
    assert "Reasoning questions" in captured["system_override"]
    assert "What the Result Cannot Establish" in captured["system_override"]
    assert "own headings and flow" in captured["system_override"]
    assert "Selected profile in focus" in captured["system_override"]
    assert "activeMatchEmployeeId" in captured["system_override"]


def test_skill_deterministic_explanation_reports_run_identity():
    from app.api.v1.intelligence import _generate_deterministic_explanation

    text = _generate_deterministic_explanation(
        "skill-match",
        {
            "targetSkills": [{"name": "React", "level": 4}],
            "matchResults": [
                {
                    "profile_key": "employee:1",
                    "full_name": "Ada Lovelace",
                    "entity_type": "employee",
                    "match_details": {
                        "overall_compatibility": 0.944,
                        "detailed_matches": [
                            {
                                "target_skill": "React",
                                "matched_by_skill": "React",
                                "evidence_type": "exact",
                                "semantic_distance": 0.0,
                                "match_confidence": 1.0,
                            }
                        ],
                    },
                }
            ],
            "runIdentity": {
                "scenarioId": "SM-20261010-abcdef12",
                "generatedAt": "2026-10-10T12:00:00",
            },
            "uploadedDataReadiness": {
                "unique_uploaded_skill_names": 170,
                "names_mapped_to_graph_or_approved_alias": 25,
                "coverage_ratio": 0.1471,
                "vector_search_status": "not_configured",
            },
        },
    )
    assert "SM-20261010-abcdef12" in text
    assert "Ada Lovelace" in text
    assert "0.1471" in text


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
        "career_history_provenance": "synthetic_demo",
        "synthetic_demo_role_record_count": 12,
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
    assert "simulated demo histories" in captured["system_override"]
    assert "observed_transition_count" in captured["user_content_override"]
