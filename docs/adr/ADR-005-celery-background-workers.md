# ADR-005: Celery for Background Workers

**Status**: Accepted  
**Date**: 2026-08-23  
**Deciders**: @ravindersingh  
**Technical Story**: Initial architecture decision

## Context

Need a distributed task queue for background processing in Aurelinx. Requirements:
- Async task execution (screening, connector syncs, analytics, notifications)
- Scheduled/periodic tasks (daily syncs, hourly analytics)
- Retry with exponential backoff
- Priority queues
- Horizontal scaling
- Monitoring and observability
- Python-native (integrates with FastAPI)

Options considered:
1. **Celery** (Mature, Redis/RabbitMQ brokers)
2. **RQ** (Redis Queue, simpler)
3. **Arq** (Async Redis Queue, modern)
4. **Dramatiq** (Actor-based, Redis/RabbitMQ)
5. **FastAPI BackgroundTasks** (Built-in, limited)
6. **Custom** (asyncio + Redis streams)

## Decision

**Choose Celery** with Redis broker for background task processing.

## Consequences

### Positive
- **Most mature** Python task queue (15+ years, battle-tested)
- **Rich feature set**: retries, priorities, rate limiting, chords, groups, canvas
- **Celery Beat** for reliable periodic scheduling
- **Multiple brokers**: Redis (dev/staging), RabbitMQ (prod HA)
- **Monitoring**: Flower, Prometheus exporter, Datadog integration
- **Scaling**: Prefork, gevent, eventlet, solo pools
- **KEDA integration** for Kubernetes autoscaling
- **Django/Flask/FastAPI** integration patterns well-documented

### Negative
- **Complexity**: Many configuration options, steep learning curve
- **Broker dependency**: Redis/RabbitMQ required
- **Serialization**: Default pickle (security risk) — must use JSON
- **Worker memory**: Prefork can leak (mitigated: `max_tasks_per_child`)

### Risks
- Redis as broker: not as durable as RabbitMQ (mitigated: Redis persistence + replica)
- Version 5.x breaking changes (mitigated: pin version, test upgrades)

## Alternatives Considered

| Alternative | Pros | Cons | Why Not Chosen |
|-------------|------|------|----------------|
| RQ | Simple, Redis-only, Pythonic | No periodic tasks, no priorities, limited scaling | Need Beat + priorities |
| Arq | Async-native, modern, Redis Streams | Smaller community, no periodic scheduler | Celery Beat is critical |
| Dramatiq | Actor model, good defaults | No built-in scheduler, smaller ecosystem | Celery more mature |
| BackgroundTasks | Zero deps, built-in | No persistence, no retries, no scaling | Production needs |
| Custom | Full control | Reinventing wheel, maintenance burden | Not core competency |

## Implementation Notes

- **Broker**: Redis (dev: single, prod: cluster/sentinel)
- **Result Backend**: Redis (separate DB)
- **Serialization**: JSON only (`task_serializer=json`, `accept_content=['json']`)
- **Queues**: `screening`, `sync`, `analytics`, `notifications`, `default`
- **Workers**: Per-queue scaling (`-Q screening,sync -c 4`)
- **Beat**: Single instance (HA via Redis lock)
- **Monitoring**: Flower on port 5555 (dev), Prometheus exporter (prod)
- **Retry Policy**: Exponential backoff, max 3 retries, dead letter queue

## Related ADRs

- ADR-001: FastAPI + SQLModel for Backend
- ADR-004: Qdrant for Vector Search
