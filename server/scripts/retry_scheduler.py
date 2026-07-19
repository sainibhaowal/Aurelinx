"""Scheduler to enqueue due webhook events into RQ for delivery."""

import time
from datetime import datetime
import logging
import os

from redis import Redis
from rq import Queue

from app.models.database import get_session, IntegrationWebhookEventTable

logger = logging.getLogger("retry_scheduler")
logging.basicConfig(level=logging.INFO)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")


def enqueue_due_events():
    redis_conn = Redis.from_url(REDIS_URL)
    q = Queue("integrations", connection=redis_conn)

    with next(get_session()) as session:
        now = datetime.utcnow()
        rows = (
            session.query(IntegrationWebhookEventTable)
            .filter(
                IntegrationWebhookEventTable.status != "success",
                IntegrationWebhookEventTable.next_retry_at is not None,
                IntegrationWebhookEventTable.next_retry_at <= now,
            )
            .order_by(IntegrationWebhookEventTable.next_retry_at)
            .all()
        )

        for ev in rows:
            logger.info(f"Enqueuing event {ev.id} for retry")
            q.enqueue("worker.tasks.deliver_event_by_id", str(ev.id))


if __name__ == "__main__":
    try:
        while True:
            enqueue_due_events()
            time.sleep(15)
    except KeyboardInterrupt:
        logger.info("Retry scheduler stopped")
