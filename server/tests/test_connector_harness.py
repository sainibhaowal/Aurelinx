"""Offline contract harness for production connector behavior.

These tests deliberately use HTTPX in-memory responses. They verify request
shape, pagination, normalization, transient retry handling, and secret
boundaries without contacting Jira, Slack, or Workday.
"""

import httpx

from app.services.connectors.bamboohr import BambooHRConnector
from app.services.connectors.greenhouse import GreenhouseConnector
from app.services.connectors.hibob import HiBobConnector
from app.services.connectors.jira import JiraConnector
from app.services.connectors.lever import LeverConnector
from app.services.connectors.secrets import open_credentials, seal_credentials
from app.services.connectors.slack import SlackConnector
from app.services.connectors.teams import TeamsConnector
from app.services.connectors.workday import WorkdayConnector


class FakeClient:
    def __init__(self, handler):
        self.handler = handler
        self.calls = []

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def request(self, method, path, **kwargs):
        self.calls.append((method, path, kwargs))
        return self.handler(method, path, kwargs, len(self.calls))


def response(status, payload):
    return httpx.Response(
        status,
        json=payload,
        request=httpx.Request("GET", "https://provider.test"),
    )


def test_jira_auth_normalization_and_pagination(monkeypatch):
    client = FakeClient(
        lambda _method, path, kwargs, _call: (
            response(200, {"displayName": "Admin"})
            if path.endswith("/myself")
            else response(
                200,
                {
                    "issues": (
                        [
                            {
                                "id": "1",
                                "key": "HR-1",
                                "fields": {
                                    "summary": "Hiring",
                                    "assignee": {
                                        "displayName": "A",
                                        "emailAddress": "a@example.com",
                                    },
                                    "reporter": {
                                        "displayName": "B",
                                        "emailAddress": "b@example.com",
                                    },
                                    "project": {"name": "HR"},
                                    "status": {"name": "Open"},
                                    "updated": "2026-01-02T03:04:05.000+0000",
                                },
                            }
                        ]
                        if kwargs["params"]["startAt"] == 0
                        else []
                    ),
                },
            )
        )
    )
    monkeypatch.setattr(httpx, "Client", lambda **_kwargs: client)
    connector = JiraConnector()
    assert connector.verify(
        {
            "base_url": "https://jira.test",
            "credentials": {"email": "a", "api_token": "secret"},
        }
    )["connected"]
    rows = connector.fetch_records(
        {
            "base_url": "https://jira.test",
            "credentials": {"email": "a", "api_token": "secret"},
            "options": {"page_size": 1},
        }
    )
    assert rows[0]["external_id"] == "1"
    assert rows[0]["assignee_email"] == "a@example.com"
    assert rows[0]["reporter_email"] == "b@example.com"
    assert rows[0]["occurred_at"] == "2026-01-02T03:04:05.000+0000"
    assert len([call for call in client.calls if call[1].endswith("/search")]) == 2


def test_greenhouse_harvest_v3_credentials_and_candidate_normalization(monkeypatch):
    client = FakeClient(
        lambda _method, _path, _kwargs, _call: response(
            200,
            {
                "data": [
                    {
                        "id": 42,
                        "name": "Candidate One",
                        "email_addresses": [{"value": "candidate@example.com"}],
                        "title": "Engineer",
                    }
                ]
            },
        )
    )
    monkeypatch.setattr(httpx, "Client", lambda **_kwargs: client)
    connector = GreenhouseConnector()
    assert connector.verify({"credentials": {"harvest_api_key": "secret"}})["connected"]
    rows = connector.fetch_records(
        {"credentials": {"harvest_api_key": "secret"}, "options": {"page_size": 100}}
    )
    assert rows == [
        {
            "external_id": "42",
            "full_name": "Candidate One",
            "email": "candidate@example.com",
            "department": "General",
            "role": "Engineer",
        }
    ]


def test_greenhouse_stage_action_validates_and_posts_v3_payload(monkeypatch):
    client = FakeClient(
        lambda method, path, kwargs, _call: (
            response(204, {})
            if method == "POST" and path.endswith("/move")
            else response(200, {})
        )
    )
    monkeypatch.setattr(httpx, "Client", lambda **_kwargs: client)
    result = GreenhouseConnector().execute_action(
        {"credentials": {"api_key": "secret"}},
        "move_candidate_stage",
        {"application_id": 17, "from_stage_id": 3, "to_stage_id": 4},
    )
    assert result["status_code"] == 204
    assert client.calls[0][1] == "/v3/applications/17/move"
    assert client.calls[0][2]["json"] == {"from_stage_id": 3, "to_stage_id": 4}


def test_slack_oauth_cursor_pagination(monkeypatch):
    def handler(_method, path, kwargs, _call):
        if path.endswith("auth.test"):
            return response(200, {"ok": True, "team": "Acme"})
        cursor = kwargs["params"].get("cursor")
        return response(
            200,
            {
                "ok": True,
                "messages": [{"ts": "1", "text": "hello"}],
                "response_metadata": (
                    {"next_cursor": "next"} if not cursor else {"next_cursor": ""}
                ),
            },
        )

    client = FakeClient(handler)
    monkeypatch.setattr(httpx, "Client", lambda **_kwargs: client)
    connector = SlackConnector()
    assert connector.verify({"credentials": {"access_token": "oauth-token"}})[
        "connected"
    ]
    rows = connector.fetch_records(
        {
            "credentials": {"access_token": "oauth-token"},
            "options": {"channel_ids": ["C1"]},
        }
    )
    assert len(rows) == 2
    assert client.calls[-1][2]["params"]["cursor"] == "next"


def test_slack_manager_notification_posts_only_explicit_channel_and_message(
    monkeypatch,
):
    client = FakeClient(
        lambda _method, _path, _kwargs, _call: response(
            200, {"ok": True, "ts": "123.456"}
        )
    )
    monkeypatch.setattr(httpx, "Client", lambda **_kwargs: client)
    result = SlackConnector().execute_action(
        {"credentials": {"access_token": "oauth-token"}},
        "send_manager_notification",
        {"channel_id": "C1", "message": "Retention review requested"},
    )
    assert result["message_ts"] == "123.456"
    assert client.calls[0][1] == "/chat.postMessage"
    assert client.calls[0][2]["json"] == {
        "channel": "C1",
        "text": "Retention review requested",
    }


def test_workday_offset_pagination_and_normalization(monkeypatch):
    client = FakeClient(
        lambda _method, _path, kwargs, _call: response(
            200,
            (
                {
                    "data": [
                        {
                            "worker_id": "W1",
                            "name": "Person",
                            "work_email": "p@example.com",
                            "job_title": "Engineer",
                            "salary": 90000,
                            "salary_currency": "EUR",
                            "salary_period": "annual",
                            "employment_start_date": "2020-01-01",
                            "employment_status": "active",
                        }
                    ]
                }
                if kwargs["params"]["offset"] == 0
                else {"data": []}
            ),
        )
    )
    monkeypatch.setattr(httpx, "Client", lambda **_kwargs: client)
    rows = WorkdayConnector().fetch_records(
        {
            "base_url": "https://workday.test",
            "credentials": {"access_token": "token"},
            "options": {"page_size": 1},
        }
    )
    assert rows == [
        {
            "external_id": "W1",
            "full_name": "Person",
            "email": "p@example.com",
            "department": "General",
            "role": "Engineer",
            "salary": 90000,
            "salary_currency": "EUR",
            "salary_period": "annual",
            "employment_start_date": "2020-01-01",
            "employment_end_date": None,
            "employment_censor_date": None,
            "employment_status": "active",
            "departure_event": None,
        }
    ]
    assert client.calls[1][2]["params"]["offset"] == 1


def test_transient_retry_and_secret_boundary(monkeypatch):
    attempts = []

    class RetryClient:
        def request(self, *_args, **_kwargs):
            attempts.append(1)
            return (
                response(503, {}) if len(attempts) < 2 else response(200, {"ok": True})
            )

    monkeypatch.setattr(
        "app.services.connectors.base.time.sleep", lambda _seconds: None
    )
    result = JiraConnector.request(RetryClient(), "GET", "/health")
    assert result.status_code == 200
    assert len(attempts) == 2
    sealed = seal_credentials({"api_token": "secret"})
    assert "secret" not in sealed
    assert open_credentials(sealed)["api_token"] == "secret"


def test_lever_opportunity_normalization_and_stage_action(monkeypatch):
    client = FakeClient(
        lambda method, path, kwargs, _call: response(
            200,
            (
                {"data": {"id": "opp-1"}}
                if method == "PUT"
                else {
                    "data": [
                        {
                            "id": "opp-1",
                            "contact": {
                                "name": "Candidate",
                                "emails": ["c@example.com"],
                            },
                            "applications": [{"posting": "Engineer"}],
                        }
                    ]
                }
            ),
        )
    )
    monkeypatch.setattr(httpx, "Client", lambda **_kwargs: client)
    connector = LeverConnector()
    rows = connector.fetch_records({"credentials": {"api_key": "secret"}})
    assert rows[0]["external_id"] == "opp-1"
    result = connector.execute_action(
        {"credentials": {"api_key": "secret"}},
        "move_candidate_stage",
        {"opportunity_id": "opp-1", "stage": "screen"},
    )
    assert result["provider_request_id"] == "opp-1"
    assert client.calls[-1][1] == "/opportunities/opp-1/stage"


def test_lever_schedule_interview_requires_panel_and_posts_to_interviews(monkeypatch):
    client = FakeClient(
        lambda _method, _path, _kwargs, _call: response(201, {"data": {"id": "int-1"}})
    )
    monkeypatch.setattr(httpx, "Client", lambda **_kwargs: client)
    result = LeverConnector().execute_action(
        {"credentials": {"api_key": "secret"}},
        "schedule_interview",
        {
            "opportunity_id": "opp-1",
            "panel": "panel-1",
            "interviewers": [{"id": "user-1"}],
            "date": 1700000000000,
            "duration": 30,
        },
    )
    assert result["provider_request_id"] == "int-1"
    assert client.calls[0][1] == "/opportunities/opp-1/interviews"


def test_teams_graph_notification_uses_v1_endpoint(monkeypatch):
    client = FakeClient(
        lambda _method, _path, _kwargs, _call: response(201, {"id": "message-1"})
    )
    monkeypatch.setattr(httpx, "Client", lambda **_kwargs: client)
    result = TeamsConnector().execute_action(
        {"credentials": {"access_token": "token"}},
        "send_manager_notification",
        {"team_id": "team-1", "channel_id": "channel-1", "message": "Review requested"},
    )
    assert result["provider_request_id"] == "message-1"
    assert client.calls[0][1] == "/teams/team-1/channels/channel-1/messages"


def test_hris_employee_updates_use_explicit_external_identifier(monkeypatch):
    client = FakeClient(lambda _method, _path, _kwargs, _call: response(200, {}))
    monkeypatch.setattr(httpx, "Client", lambda **_kwargs: client)
    result = BambooHRConnector().execute_action(
        {"credentials": {"api_key": "secret", "company_domain": "acme"}},
        "update_employee",
        {"id": "42", "jobTitle": "Manager"},
    )
    assert result["provider_request_id"] == "42"
    assert client.calls[0][1] == "/employees/42"
    assert client.calls[0][2]["json"] == {"jobTitle": "Manager"}

    client = FakeClient(lambda _method, _path, _kwargs, _call: response(200, {}))
    monkeypatch.setattr(httpx, "Client", lambda **_kwargs: client)
    HiBobConnector().execute_action(
        {"credentials": {"access_token": "token"}},
        "update_employee",
        {"id": "p-1", "work": {"title": "Manager"}},
    )
    assert client.calls[0][1] == "/people/p-1"


def test_connector_capability_contract_exposes_only_implemented_mutations():
    assert GreenhouseConnector().supports_action("create_requisition")
    assert GreenhouseConnector().supports_action("schedule_interview")
    assert SlackConnector().supports_action("send_manager_notification")
    assert TeamsConnector().supports_action("send_manager_notification")
    assert not WorkdayConnector().supports_action("start_onboarding")
    assert not GreenhouseConnector().supports_action("start_offboarding")
