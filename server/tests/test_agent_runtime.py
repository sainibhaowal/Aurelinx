from app.api.v1.chat import (
    _TOOL_ENTITIES,
    AGENT_TOOL_CATALOG,
    _agent_controller_prompt,
    _agent_tenant_guard,
    _native_controller_prompt,
    _parse_agent_decision,
    _request_plan,
    _workspace_snapshot,
)
from app.core.config import settings
from app.core.security import TokenData
from app.services.actions.dispatcher import dispatch_approved_action
from app.services.actions.policy import contains_secret_key, validate_action
from app.workflows.agent_runtime import TOOL_SCHEMAS, AgentExecutionState


def test_runtime_exposes_all_authorized_agent_tools():
    names = {schema["function"]["name"] for schema in TOOL_SCHEMAS}
    assert {
        "search",
        "read",
        "analyse",
        "observe",
        "modify",
        "write",
        "delete",
        "employee_directory",
        "candidate_pipeline",
        "workforce_analytics",
        "workforce_risk",
        "skills_intelligence",
        "integration_health",
        "check_connector_health",
        "request_data_export",
        "data_quality_review",
        "governance_review",
        "forecast_planning",
        "intervention_review",
        "sync_hris_connection",
    } <= names


def test_sync_tool_schema_requires_connection_id():
    schema = next(
        item["function"]
        for item in TOOL_SCHEMAS
        if item["function"]["name"] == "sync_hris_connection"
    )
    assert schema["parameters"]["required"] == ["connection_id"]


def test_export_tool_is_approval_only_and_requires_action_payload():
    schema = next(
        item["function"]
        for item in TOOL_SCHEMAS
        if item["function"]["name"] == "request_data_export"
    )
    assert "approval" in schema["description"].lower()
    assert schema["parameters"]["required"] == ["scope", "region", "purpose"]


def test_runtime_records_evidence_and_requires_mutation_verification():
    state = AgentExecutionState(request="update an employee", role="admin")
    step = state.add_step("tool", "search", "running")
    state.complete_tool(step, {"returned": 1})
    assert state.needs_verification("modify", {"result": {"updated": True}})
    assert not state.needs_verification("search", {"returned": 1})
    trace = state.public_trace()
    assert trace["evaluation"]["evidence_items"] == 1
    assert trace["task_graph"][0]["name"] == "search"


def test_conversational_run_without_tools_is_not_marked_failed():
    state = AgentExecutionState(request="hi", role="member")
    state.add_step("thought", "controller", "completed")
    evaluation = state.evaluate()
    assert evaluation["complete"] is True
    assert evaluation["tool_calls"] == 0
    assert evaluation["errors"] == []


def test_candidate_count_typo_still_requires_live_workspace_evidence():
    plan = _request_plan("how many canncdiate we have")
    assert plan["needs_live_data"] is True
    assert "search_candidates" in plan["capabilities"]

    second_plan = _request_plan("check uploaded canndiate in our system")
    assert second_plan["needs_live_data"] is True


def test_plain_controller_text_never_forces_a_keyword_default_tool():
    decision = _parse_agent_decision(
        "I will inspect the employee database.", "show employees"
    )
    assert decision["action"] == "respond"
    assert "tool" not in decision


def test_native_hr_specialist_function_name_is_preserved():
    decision = _parse_agent_decision(
        '{"action":"tool","tool":"workforce_risk","arguments":{"query":"retention"}}'
    )
    assert decision["tool"] == "workforce_risk"


def test_directory_and_analytics_tools_have_distinct_semantic_boundaries():
    assert "directory" in AGENT_TOOL_CATALOG["employee_directory"].lower()
    assert "aggregate" in AGENT_TOOL_CATALOG["analyse"].lower()
    assert "Do not use it as a substitute" in AGENT_TOOL_CATALOG["analyse"]


def test_native_controller_prompt_is_compact_and_keeps_recent_evidence():
    prompt = _native_controller_prompt(
        "show the employee directory",
        [{"role": "user", "content": "previous question"}],
        [{"tool": "search", "result": {"returned": 1}}],
    )
    assert "show the employee directory" in prompt
    assert "previous question" in prompt
    assert "Observed tool results" in prompt
    assert "Allowed JSON shapes" not in prompt


def test_controller_prompt_prevents_broad_empty_directory_retry_loops():
    prompt = _agent_controller_prompt(
        "show employees",
        [],
        [],
        TokenData(
            user_id="u1", email="user@example.com", is_admin=False, tenant_id="tenant-a"
        ),
        False,
    )
    assert "do not retry it with another broad wording" in prompt


def test_action_policy_rejects_secrets_and_non_admins():
    assert contains_secret_key({"nested": [{"access_token": "never"}]})
    assert validate_action("send_manager_notification", {"message": "x"}, False)
    assert validate_action("send_manager_notification", {"token": "secret"}, True)
    assert validate_action("send_manager_notification", {"message": "x"}, True) is None


def test_dispatcher_never_executes_unregistered_provider_action():
    try:
        dispatch_approved_action(
            "unknown-provider", "move_candidate_stage", {"id": "1"}, object()
        )
    except NotImplementedError as exc:
        assert "safely unexecuted" in str(exc)
    else:
        raise AssertionError("unregistered provider action unexpectedly executed")


def test_production_agent_guard_is_tenant_scoped_and_fail_closed(monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    user = TokenData(
        user_id="u1", email="admin@example.com", is_admin=True, tenant_id="tenant-a"
    )
    assert _agent_tenant_guard(user) is None
    original = _TOOL_ENTITIES["employee"]["model"]
    monkeypatch.setitem(_TOOL_ENTITIES["employee"], "model", type("Unscoped", (), {}))
    try:
        assert "tenant scope" in (_agent_tenant_guard(user) or "")
    finally:
        monkeypatch.setitem(_TOOL_ENTITIES["employee"], "model", original)


def test_workspace_snapshot_requires_tenant_context():
    assert _workspace_snapshot(object(), "show employee risk") == {}
