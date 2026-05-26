"""Background tasks for processing webhook events using RQ."""
import json
from datetime import datetime, timedelta
import logging
import httpx

from app.models.database import get_session, IntegrationWebhookEventTable

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
            resp = httpx.post(event.endpoint, content=event.payload.encode('utf-8'), headers=headers, timeout=10.0)
            if 200 <= resp.status_code < 300:
                event.status = 'success'
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
            event.next_retry_at = datetime.utcnow() + timedelta(seconds=min(backoff, 3600))
            if event.attempts >= 5:
                event.status = 'failed'
            session.add(event)
            session.commit()
            logger.warning(f"Delivery failed for event {event.id}: {exc}")
            return False
