
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

"""Background tasks for processing webhook events using RQ."""

import json
import logging
from datetime import datetime, timedelta

import httpx

from app.models.database import IntegrationWebhookEventTable, get_session

logger = logging.getLogger("worker.tasks")


def deliver_event_by_id(event_id: str):
    """Synchronous task entrypoint for RQ to deliver a webhook event by id."""
    with next(get_session()) as session:
        event = session.get(IntegrationWebhookEventTable, event_id)
        if not event:
            logger.warning(f"Event {event_id} not found")
            return False

        headers = {}
        try:
            if event.headers:
                headers = json.loads(event.headers)
        except Exception:
            headers = {}

        try:
            resp = httpx.post(
                event.endpoint,
                content=event.payload.encode("utf-8"),
                headers=headers,
                timeout=10.0,
            )
            if 200 <= resp.status_code < 300:
                event.status = "success"
                event.attempts = event.attempts + 1
                event.last_error = None
                event.next_retry_at = None
                session.add(event)
                session.commit()
                logger.info(f"Delivered event {event.id} successfully")
                return True
            else:
                raise RuntimeError(f"Status {resp.status_code}: {resp.text[:200]}")
        except Exception as exc:
            event.attempts = event.attempts + 1
            event.last_error = str(exc)
            backoff = 60 * (2 ** (event.attempts - 1))
            event.next_retry_at = datetime.utcnow() + timedelta(
                seconds=min(backoff, 3600)
            )
            if event.attempts >= 5:
                event.status = "failed"
            session.add(event)
            session.commit()
            logger.warning(f"Delivery failed for event {event.id}: {exc}")
            return False
