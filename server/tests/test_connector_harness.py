"""Offline contract harness for production connector behavior.

These tests deliberately use HTTPX in-memory responses. They verify request
shape, pagination, normalization, transient retry handling, and secret
boundaries without contacting Jira, Slack, or Workday.
"""

import httpx

from app.services.connectors.jira import JiraConnector
from app.services.connectors.secrets import open_credentials, seal_credentials
from app.services.connectors.slack import SlackConnector
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
                    "issues": [
                        {
                            "id": "1",
                            "key": "HR-1",
                            "fields": {
                                "summary": "Hiring",
                                "assignee": {"displayName": "A", "emailAddress": "a@example.com"},
                                "project": {"name": "HR"},
                                "status": {"name": "Open"},
                            },
                        }
                    ]
                    if kwargs["params"]["startAt"] == 0
                    else [],
                },
            )
        )
    )
    monkeypatch.setattr(httpx, "Client", lambda **_kwargs: client)
    connector = JiraConnector()
    assert connector.verify({"base_url": "https://jira.test", "credentials": {"email": "a", "api_token": "secret"}})["connected"]
    rows = connector.fetch_records({"base_url": "https://jira.test", "credentials": {"email": "a", "api_token": "secret"}, "options": {"page_size": 1}})
    assert rows[0]["external_id"] == "1"
    assert len([call for call in client.calls if call[1].endswith("/search")]) == 2


def test_slack_oauth_cursor_pagination(monkeypatch):
    def handler(_method, path, kwargs, _call):
        if path.endswith("auth.test"):
            return response(200, {"ok": True, "team": "Acme"})
        cursor = kwargs["params"].get("cursor")
        return response(200, {"ok": True, "messages": [{"ts": "1", "text": "hello"}], "response_metadata": {"next_cursor": "next"} if not cursor else {"next_cursor": ""}})

    client = FakeClient(handler)
    monkeypatch.setattr(httpx, "Client", lambda **_kwargs: client)
    connector = SlackConnector()
    assert connector.verify({"credentials": {"access_token": "oauth-token"}})["connected"]
    rows = connector.fetch_records({"credentials": {"access_token": "oauth-token"}, "options": {"channel_ids": ["C1"]}})
    assert len(rows) == 2
    assert client.calls[-1][2]["params"]["cursor"] == "next"


def test_workday_offset_pagination_and_normalization(monkeypatch):
    client = FakeClient(
        lambda _method, _path, kwargs, _call: response(
            200,
            {"data": [{"worker_id": "W1", "name": "Person", "work_email": "p@example.com", "job_title": "Engineer"}]}
            if kwargs["params"]["offset"] == 0
            else {"data": []},
        )
    )
    monkeypatch.setattr(httpx, "Client", lambda **_kwargs: client)
    rows = WorkdayConnector().fetch_records({"base_url": "https://workday.test", "credentials": {"access_token": "token"}, "options": {"page_size": 1}})
    assert rows == [{"external_id": "W1", "full_name": "Person", "email": "p@example.com", "department": "General", "role": "Engineer", "salary": None}]
    assert client.calls[1][2]["params"]["offset"] == 1


def test_transient_retry_and_secret_boundary(monkeypatch):
    attempts = []

    class RetryClient:
        def request(self, *_args, **_kwargs):
            attempts.append(1)
            return response(503, {}) if len(attempts) < 2 else response(200, {"ok": True})

    monkeypatch.setattr("app.services.connectors.base.time.sleep", lambda _seconds: None)
    result = JiraConnector.request(RetryClient(), "GET", "/health")
    assert result.status_code == 200
    assert len(attempts) == 2
    sealed = seal_credentials({"api_token": "secret"})
    assert "secret" not in sealed
    assert open_credentials(sealed)["api_token"] == "secret"
