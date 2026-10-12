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

from app.services.connectors.bamboohr import BambooHRConnector
from app.services.connectors.greenhouse import GreenhouseConnector
from app.services.connectors.hibob import HiBobConnector
from app.services.connectors.jira import JiraConnector
from app.services.connectors.lever import LeverConnector
from app.services.connectors.slack import SlackConnector
from app.services.connectors.successfactors import SuccessFactorsConnector
from app.services.connectors.teams import TeamsConnector
from app.services.connectors.workday import WorkdayConnector

CONNECTOR_MAP = {
    "jira": JiraConnector,
    "slack": SlackConnector,
    "workday": WorkdayConnector,
    "greenhouse": GreenhouseConnector,
    "lever": LeverConnector,
    "teams": TeamsConnector,
    "bamboohr": BambooHRConnector,
    "hibob": HiBobConnector,
    "successfactors": SuccessFactorsConnector,
}

PROVIDER_PRESETS: dict[str, dict[str, object]] = {
    "jira": {"source_type": "productivity", "auth_type": "basic", "base_url": None},
    "slack": {
        "source_type": "engagement",
        "auth_type": "oauth2",
        "base_url": "https://slack.com/api",
    },
    "workday": {
        "source_type": "hris",
        "auth_type": "oauth2",
        "base_url": None,
        "requires_tenant_url": True,
    },
    "greenhouse": {
        "source_type": "ats",
        "auth_type": "api_key",
        "base_url": "https://harvest.greenhouse.io",
    },
    "lever": {
        "source_type": "ats",
        "auth_type": "api_key",
        "base_url": "https://api.lever.co/v1",
    },
    "teams": {
        "source_type": "productivity",
        "auth_type": "oauth2",
        "base_url": "https://graph.microsoft.com/v1.0",
    },
    "bamboohr": {
        "source_type": "hris",
        "auth_type": "api_key",
        "base_url": None,
        "requires_tenant_url": True,
    },
    "hibob": {
        "source_type": "hris",
        "auth_type": "api_key",
        "base_url": "https://api.hibob.com/v1",
    },
    "successfactors": {
        "source_type": "hris",
        "auth_type": "oauth2",
        "base_url": None,
        "requires_tenant_url": True,
    },
}


def get_connector(provider: str):
    cls = CONNECTOR_MAP.get((provider or "").lower())
    return cls() if cls else None


def get_provider_preset(provider: str) -> dict[str, object]:
    return dict(PROVIDER_PRESETS.get((provider or "").lower(), {}))
