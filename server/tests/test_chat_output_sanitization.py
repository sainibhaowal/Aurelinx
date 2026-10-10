from app.api.v1.chat import _sanitize_llm_response


def test_strips_unmarked_planning_before_thus_final_answer():
    leaked = """? However the instruction says: "For a simple count question, answer once in one short sentence using the exact verified total; do not repeat the number or add a table. If deletion is requested, firmly state it requires human approval and cannot be automated."

This is not relevant. It's just a greeting. The system says "Keep greetings concise." Hello! How can I assist you today?
But the user also said "Request mode: agent_loop." Might imply we should treat this as part of an interactive loop? However, no further request.

Given the instruction to keep greetings concise, I'll answer briefly. Also note: "No live workspace retrieval was required." So no need to query tools.
Thus final answer: a short greeting.
Hello! How can I assist you today?"""

    assert _sanitize_llm_response(leaked, "hi") == "Hello! How can I assist you today?"


def test_removes_duplicate_unverified_count_planning_line():
    leaked = """: The total count is not verified; we would need to execute a live query on database.overview to retrieve it.
We should phrase concisely.
Let's produce answer.
The exact total count of candidate and employee records in the Aurelinx system is not verified by any live data source."""

    result = _sanitize_llm_response(
        leaked, "check ho wmany candistenad emplioyee data i ahev ]"
    )
    assert (
        result
        == "The exact total count of candidate and employee records in the Aurelinx system is not verified by any live data source."
    )
    assert "We should phrase" not in result
    assert "Let's produce answer" not in result
    assert not result.startswith(":")


def test_removes_greeting_monologue_with_leading_dot():
    leaked = """. Since it's just a greeting, maybe "Hi there!"

But let's check the workspace snapshot? It might contain something relevant? The user said no live workspace retrieval was required.

I'll stick to a simple greeting.

Hello! How can Aurelinx assist you today?"""

    result = _sanitize_llm_response(leaked, "hi")
    assert result == "Hello! How can Aurelinx assist you today?"
    assert not result.startswith(".")


def test_typo_tolerant_routing_for_candidates_and_employees():
    from app.api.v1.chat import _request_plan
    from app.workflows.instant.lane_router import route_lane
    from app.workflows.instant.prompt_assembly import (
        is_combined_count_request,
        is_simple_count_request,
    )

    typo_prompt = "check ho wmany candistenad emplioyee data i ahev ]"
    plan = _request_plan(typo_prompt)
    assert plan["needs_live_data"] is True
    assert "search_employees" in plan["capabilities"]
    assert "search_candidates" in plan["capabilities"]

    decision = route_lane(typo_prompt)
    assert decision.needs_live_data is True
    assert "employee_directory" in decision.tools
    assert "candidate_pipeline" in decision.tools

    assert is_simple_count_request(typo_prompt) is True
    assert is_combined_count_request(typo_prompt) is True
