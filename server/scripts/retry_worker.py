"""Simple retry worker for integration webhook delivery events.

Run: python server/scripts/retry_worker.py
This script polls the `integration_webhook_events` table for failed events
with `next_retry_at <= now` and attempts re-delivery, updating `attempts`,
`last_error`, `next_retry_at`, and `status` accordingly.
"""

import asyncio
import json
from datetime import datetime, timedelta
import logging

import httpx

from app.models.database import get_session
from app.models.database import IntegrationWebhookEventTable

logger = logging.getLogger("retry_worker")
logging.basicConfig(level=logging.INFO)


MAX_ATTEMPTS = 5
BASE_BACKOFF_SECONDS = 60
POLL_INTERVAL = 15


async def deliver_event(event, session):
    headers = {}
    try:
        if event.headers:
            headers = json.loads(event.headers)
    except Exception:
        headers = {}

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.post(
                event.endpoint, content=event.payload.encode("utf-8"), headers=headers
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
            # Exponential-ish backoff
            backoff = BASE_BACKOFF_SECONDS * (2 ** (event.attempts - 1))
            event.next_retry_at = datetime.utcnow() + timedelta(
                seconds=min(backoff, 3600)
            )
            if event.attempts >= MAX_ATTEMPTS:
                event.status = "failed"
            session.add(event)
            session.commit()
            logger.warning(f"Delivery failed for event {event.id}: {exc}")
            return False


async def poll_loop():
    logger.info("Starting retry worker loop")
    while True:
        try:
            with next(get_session()) as session:
                now = datetime.utcnow()
                q = (
                    session.query(IntegrationWebhookEventTable)
                    .filter(
                        IntegrationWebhookEventTable.status != "success",
                        IntegrationWebhookEventTable.next_retry_at is not None,
                        IntegrationWebhookEventTable.next_retry_at <= now,
                        IntegrationWebhookEventTable.attempts < MAX_ATTEMPTS,
                    )
                    .order_by(IntegrationWebhookEventTable.next_retry_at)
                )

                events = q.all()
                if events:
                    logger.info(f"Found {len(events)} events to retry")
                for ev in events:
                    await deliver_event(ev, session)

        except Exception as e:
            logger.exception(f"Retry worker encountered an error: {e}")

        await asyncio.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    try:
        asyncio.run(poll_loop())
    except KeyboardInterrupt:
        logger.info("Retry worker stopped by user")
