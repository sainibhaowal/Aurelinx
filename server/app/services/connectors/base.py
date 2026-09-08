
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

from typing import Any

import time

import httpx


class BaseConnector:
    provider = "base"
    source_type = "unknown"

    def verify(self, connection: dict) -> dict[str, Any]:
        raise NotImplementedError

    def discover(self, connection: dict) -> dict[str, Any]:
        return {"provider": self.provider, "source_type": self.source_type}

    def fetch_records(self, connection: dict) -> list[dict]:
        raise NotImplementedError

    @staticmethod
    def request(client: httpx.Client, method: str, path: str, **kwargs: Any) -> httpx.Response:
        """Issue a bounded, provider-friendly request for sync workers.

        Retries transient throttling and upstream failures, while leaving
        authentication and validation errors immediately visible to the
        pipeline so they can be audited and quarantined rather than hidden.
        """
        for attempt in range(3):
            response = client.request(method, path, **kwargs)
            if response.status_code not in {429, 500, 502, 503, 504} or attempt == 2:
                return response
            retry_after = response.headers.get("Retry-After")
            try:
                delay = min(30.0, max(0.5, float(retry_after))) if retry_after else 2 ** attempt
            except ValueError:
                delay = 2 ** attempt
            time.sleep(delay)
        raise RuntimeError("Connector request retry budget exhausted")
