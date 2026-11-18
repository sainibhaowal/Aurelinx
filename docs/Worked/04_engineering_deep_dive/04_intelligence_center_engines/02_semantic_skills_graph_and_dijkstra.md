# 02. Semantic Skills Graph and Dijkstra Matching

01. **Ontology Graph & Alias Resolution (`server/app/api/v1/intelligence.py`):**
    - `FULL_SKILL_GRAPH` models skills as a weighted undirected graph $G_S = (V_S, E_S, w)$ where edge weights $w(u, v) > 0$ represent semantic skill distance.
    - Tenant-specific overrides are loaded from `SkillAliasTable` (`_tenant_skill_aliases()`).

02. **Shortest-Path Distance (Dijkstra):**
    - `_distances_from(start)` computes shortest-path distances using a min-heap priority queue (`@functools.lru_cache(maxsize=256)`):
    $$d(u, v) = \min_{P: u \to v} \sum_{(x, y) \in P} w(x, y)$$
    - Identical normalized skills yield $d(u, u) = 0.0$; disconnected skills return the fallback penalty $99.0$.

03. **Optimal Skill-to-Requirement Assignment:**
    - `_maximum_weight_assignment(weights)` solves a bipartite matching problem between required skills $R = \{r_1, \dots, r_m\}$ and a person's possessed skills $P = \{p_1, \dots, p_n\}$ so each possessed skill is credited optimally against required skills.
    - Endpoints: `POST /api/v1/intelligence/skill-match` and SSE `POST /api/v1/intelligence/skill-match/stream`.
