
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

from app.services.connectors.greenhouse import GreenhouseConnector
from app.services.connectors.workday import WorkdayConnector

CONNECTOR_MAP = {
    "workday": WorkdayConnector,
    "greenhouse": GreenhouseConnector,
}


def get_connector(provider: str):
    cls = CONNECTOR_MAP.get((provider or "").lower())
    return cls() if cls else None
