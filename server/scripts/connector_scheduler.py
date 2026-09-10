# Copyright 2026 Ravinder Singh
# Licensed under the Apache License, Version 2.0

"""Enqueue due outbound connector syncs into the durable RQ worker queue."""

import logging
import os
import time
from datetime import datetime, timedelta

from redis import Redis
from retry_scheduler import enqueue_due_events
from rq import Queue
from sqlmodel import Session, select

from app.models.database import IntegrationConnectionTable, engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("connector_scheduler")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
POLL_SECONDS = int(os.getenv("CONNECTOR_SCHEDULER_POLL_SECONDS", "30"))


def enqueue_due_connections() -> int:
    queue = Queue("integrations", connection=Redis.from_url(REDIS_URL))
    now = datetime.utcnow()
    count = 0
    with Session(engine) as session:
        rows = session.exec(
            select(IntegrationConnectionTable)
            .where(IntegrationConnectionTable.status == "active")
            .where(
                (IntegrationConnectionTable.next_sync_at.is_(None))
                | (IntegrationConnectionTable.next_sync_at <= now)
            )
        ).all()
        for row in rows:
            job_id = f"connector-sync:{row.id}:{int(now.timestamp())}"
            queue.enqueue(
                "worker.tasks.sync_connection_by_id",
                str(row.id),
                row.tenant_id,
                job_id=job_id,
                result_ttl=86400,
                failure_ttl=86400,
            )
            # Claim this schedule slot before the worker starts, preventing
            # duplicate enqueueing during the next scheduler poll.
            row.last_sync_status = "queued"
            row.last_sync_summary = "Sync queued for background worker"
            row.next_sync_at = now + timedelta(minutes=max(5, row.sync_interval_minutes))
            row.updated_at = now
            session.add(row)
            count += 1
        session.commit()
    return count


if __name__ == "__main__":
    while True:
        try:
            count = enqueue_due_connections()
            enqueue_due_events()
            if count:
                logger.info("Enqueued %s connector sync(s)", count)
        except Exception:
            logger.exception("Connector scheduler cycle failed")
        time.sleep(POLL_SECONDS)
