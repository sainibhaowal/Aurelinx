"""Evidence-backed organizational network metrics from imported interactions."""

from __future__ import annotations

import math
from collections import deque
from datetime import datetime
from typing import Any


def build_ona_graph(
    employees: list[Any], events: list[dict[str, Any]], *, window_days: int
) -> dict[str, Any]:
    employee_by_id = {str(employee.id): employee for employee in employees}
    ids = list(employee_by_id)
    adjacency: dict[str, dict[str, int]] = {employee_id: {} for employee_id in ids}
    valid_records = 0
    excluded_records = 0
    latest_event: datetime | None = None

    for event in events:
        source = str(event.get("reporter_id") or "")
        target = str(event.get("assignee_id") or "")
        if (
            source not in employee_by_id
            or target not in employee_by_id
            or source == target
        ):
            excluded_records += 1
            continue
        record_count = max(1, int(event.get("record_count") or 1))
        adjacency[source][target] = adjacency[source].get(target, 0) + record_count
        adjacency[target][source] = adjacency[target].get(source, 0) + record_count
        valid_records += record_count
        occurred_at = event.get("occurred_at")
        if isinstance(occurred_at, datetime) and (
            latest_event is None or occurred_at > latest_event
        ):
            latest_event = occurred_at

    n = len(ids)
    degree = {node: len(adjacency[node]) for node in ids}
    # PageRank over the undirected observed co-participation graph. Dangling
    # probability is redistributed uniformly; stop on convergence.
    pagerank = dict.fromkeys(ids, 1 / n if n else 0.0)
    iterations = 0
    for iteration in range(1, 501):
        iterations = iteration
        dangling_mass = sum(pagerank[node] for node in ids if not degree[node])
        updated = dict.fromkeys(
            ids, (1 - 0.85) / n + 0.85 * dangling_mass / n if n else 0.0
        )
        for source in ids:
            if degree[source]:
                share = 0.85 * pagerank[source] / degree[source]
                for target in adjacency[source]:
                    updated[target] += share
        error = sum(abs(updated[node] - pagerank[node]) for node in ids)
        pagerank = updated
        if error < 1e-12:
            break

    # Unweighted Brandes centrality on the observed tie topology. Event count is
    # exposed as tie strength but is not treated as proof of closeness or quality.
    betweenness = dict.fromkeys(ids, 0.0)
    closeness = dict.fromkeys(ids, 0.0)
    for root in ids:
        predecessors: dict[str, list[str]] = {node: [] for node in ids}
        path_count = dict.fromkeys(ids, 0.0)
        path_count[root] = 1.0
        distance = dict.fromkeys(ids, math.inf)
        distance[root] = 0.0
        stack: list[str] = []
        queue = deque([root])
        while queue:
            v = queue.popleft()
            stack.append(v)
            for w in adjacency[v]:
                candidate = distance[v] + 1
                if math.isinf(distance[w]):
                    distance[w] = candidate
                    queue.append(w)
                    path_count[w] = path_count[v]
                    predecessors[w] = [v]
                elif candidate == distance[w]:
                    path_count[w] += path_count[v]
                    predecessors[w].append(v)
        reachable = [
            distance[node]
            for node in ids
            if node != root and math.isfinite(distance[node])
        ]
        if n > 1 and reachable:
            closeness[root] = (len(reachable) / (n - 1)) * (
                len(reachable) / sum(reachable)
            )
        dependency = dict.fromkeys(ids, 0.0)
        while stack:
            w = stack.pop()
            if path_count[w]:
                for v in predecessors[w]:
                    dependency[v] += (path_count[v] / path_count[w]) * (
                        1 + dependency[w]
                    )
            if w != root:
                betweenness[w] += dependency[w]
    if n > 2:
        betweenness = {node: value / 2 for node, value in betweenness.items()}
        normalization = (n - 1) * (n - 2) / 2
        betweenness = {
            node: value / normalization for node, value in betweenness.items()
        }

    departments = {
        node: str(
            getattr(employee_by_id[node], "department", None) or "General"
        ).strip()
        for node in ids
    }
    clustering: dict[str, float] = {}
    ei_index: dict[str, float | None] = {}
    for node in ids:
        neighbors = set(adjacency[node])
        k = len(neighbors)
        triangles = sum(
            1
            for index, left in enumerate(neighbors)
            for right in list(neighbors)[index + 1 :]
            if right in adjacency[left]
        )
        clustering[node] = (2 * triangles / (k * (k - 1))) if k > 1 else 0.0
        internal = sum(
            departments[other].casefold() == departments[node].casefold()
            for other in neighbors
        )
        external = k - internal
        ei_index[node] = (external - internal) / k if k else None

    max_pr = max((pagerank[node] for node in ids if degree[node]), default=0.0)
    max_betweenness = max(betweenness.values(), default=0.0)
    max_closeness = max(closeness.values(), default=0.0)
    palette = {
        "engineering": "#06b6d4",
        "product": "#818cf8",
        "sales": "#fbbf24",
        "marketing": "#f43f5e",
        "finance": "#10b981",
        "operations": "#a855f7",
        "support": "#14b8a6",
        "legal": "#3b82f6",
        "human resources": "#ec4899",
    }
    nodes = []
    for node in ids:
        employee = employee_by_id[node]
        nodes.append(
            {
                "id": node,
                "name": employee.full_name,
                "department": departments[node],
                "role": employee.role or "Team Member",
                "department_color": palette.get(
                    departments[node].casefold(), "#10b981"
                ),
                "degree": degree[node],
                "pagerank": pagerank[node],
                "pagerank_relative": (
                    pagerank[node] / max_pr if degree[node] and max_pr else 0.0
                ),
                "betweenness": betweenness[node],
                "closeness": closeness[node],
                # Compatibility fields are max-normalized relative scores.
                "influence_pagerank": (
                    pagerank[node] / max_pr if degree[node] and max_pr else 0.0
                ),
                "bridge_betweenness": (
                    betweenness[node] / max_betweenness if max_betweenness else 0.0
                ),
                "closeness_centrality": (
                    closeness[node] / max_closeness if max_closeness else 0.0
                ),
                "clustering_coefficient": clustering[node],
                "ei_silo_index": ei_index[node],
            }
        )

    links: list[dict[str, Any]] = []
    max_record_count = max(
        (adjacency[source][target] for source in ids for target in adjacency[source]),
        default=0,
    )
    for index, source in enumerate(ids):
        for target in ids[index + 1 :]:
            count = adjacency[source].get(target, 0)
            if count:
                links.append(
                    {
                        "source": source,
                        "target": target,
                        "record_count": count,
                        "weight": count / max_record_count if max_record_count else 0.0,
                        "channel": "uploaded_collaboration_event",
                        "is_cross_dept": departments[source].casefold()
                        != departments[target].casefold(),
                    }
                )

    cross_dept_links = sum(link["is_cross_dept"] for link in links)
    possible_edges = n * (n - 1) / 2
    return {
        "nodes": nodes,
        "links": links,
        "metrics": {
            "node_count": n,
            "link_count": len(links),
            "represented_record_count": valid_records,
            "excluded_record_count": excluded_records,
            "graph_density": len(links) / possible_edges if possible_edges else 0.0,
            "cross_dept_ratio": cross_dept_links / len(links) if links else 0.0,
            "cross_dept_links": cross_dept_links,
            "internal_links": len(links) - cross_dept_links,
            "pagerank_iterations": iterations if n else 0,
            "pagerank_damping": 0.85,
            "pagerank_converged": n == 0 or error < 1e-12,
            "department_breakdown": {
                department: sum(value == department for value in departments.values())
                for department in sorted(set(departments.values()))
            },
            "source": "tenant_uploaded_collaboration_events",
            "edge_definition": "unique uploaded events pairing two tenant employees",
            "edge_weight_definition": "number of unique imported events in the selected event-time window",
            "visual_edge_weight_definition": "record count divided by the largest tie record count in this response; used only for graph rendering",
            "maximum_tie_record_count": max_record_count,
            "centrality_definition": "unweighted observed graph topology; relative UI scores are normalized to the highest node in this response",
            "pagerank_definition": "undirected PageRank with damping 0.85, uniform dangling-node redistribution, and L1 convergence tolerance 1e-12",
            "betweenness_definition": "Freeman normalized betweenness on the undirected unweighted graph",
            "closeness_definition": "Wasserman-Faust corrected closeness using reachable-node fraction and unweighted shortest paths",
            "clustering_definition": "fraction of possible neighbor-neighbor ties that are observed",
            "ei_index_definition": "(external department ties - internal department ties) / all observed ties; null when degree is zero",
            "window_days": window_days,
            "latest_represented_record_at": (
                f"{latest_event.isoformat()}Z" if latest_event else None
            ),
            "time_basis": "collaboration_events.occurred_at (source event time)",
            "status": "available" if links else "insufficient_evidence",
        },
    }
