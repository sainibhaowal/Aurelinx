# ADR-004: Qdrant for Vector Search

**Status**: Accepted  
**Date**: 2026-08-23  
**Deciders**: @ravindersingh  
**Technical Story**: Initial architecture decision

## Context

Need a vector database for semantic search in Aurelinx (candidate matching, employee expertise finder, job-candidate matching, RAG for chat agent). Requirements:
- High-performance vector similarity search (HNSW)
- Filtering by payload (metadata) + vector search combined
- Horizontal scaling
- Production-ready with good observability
- Language-agnostic (Python backend, potentially Rust)
- Self-hostable + managed cloud option

Options considered:
1. **Qdrant** (Rust, purpose-built vector DB)
2. **pgvector** (PostgreSQL extension)
3. **Weaviate** (Go, GraphQL/REST, built-in modules)
4. **Pinecone** (Managed only, closed source)
5. **Milvus** (C++, Kubernetes-native)
6. **Chroma** (Python, embedded + client/server)

## Decision

**Choose Qdrant** as the vector search engine.

## Consequences

### Positive
- Purpose-built for vectors (Rust, SIMD-optimized HNSW)
- Excellent filtering: payload indexes + vector search in single query
- Horizontal scaling via sharding + replication
- REST + gRPC APIs (Python, Rust, TypeScript clients)
- Self-hosted (Docker, K8s) + Qdrant Cloud (managed)
- Payload indexing (keyword, numeric, geo, text)
- Sparse + dense vectors, multi-vector support
- Snapshots, WAL, replication for durability
- Prometheus metrics built-in
- Apache-2.0 license

### Negative
- Additional infrastructure component (mitigated: single binary, simple ops)
- Less mature than pgvector for simple use cases
- JavaScript client less feature-complete than Python (mitigated: use Python backend)

### Risks
- Scaling beyond single node requires planning (mitigated: start single, shard later)
- Memory usage grows with vectors (mitigated: quantization, on-disk storage)

## Alternatives Considered

| Alternative | Pros | Cons | Why Not Chosen |
|-------------|------|------|----------------|
| pgvector | Single DB, SQL, simple | No horizontal scaling, slower HNSW, limited filtering | Scale requirements |
| Weaviate | GraphQL, modules (embeddings), hybrid search | Go runtime, heavier, GraphQL complexity | Simpler REST/gRPC preferred |
| Pinecone | Fully managed, serverless | Vendor lock-in, cost at scale, no self-host | Need self-host option |
| Milvus | Massive scale, K8s-native | Complex ops, heavier resource usage | Overkill for current scale |
| Chroma | Simple, Python-first | No horizontal scaling, limited filtering | Production requirements |

## Implementation Notes

- Collections per entity: `candidates`, `employees`, `jobs`, `messages`
- Vector size: 1536 (OpenAI `text-embedding-3-small`) or 384 (local models)
- Payload: filterable fields (skills, location, department, seniority)
- HNSW config: `m=16`, `ef_construct=100` (tune for recall/latency)
- Quantization: Scalar quantization for memory efficiency
- Python client: `qdrant-client` with async support

## Related ADRs

- ADR-001: FastAPI + SQLModel for Backend
- ADR-005: Celery for Background Workers
