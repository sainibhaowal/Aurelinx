"""Evidence-backed organizational network metrics from imported interactions."""

from __future__ import annotations

import math
from collections import deque
from datetime import datetime
from typing import Any


def _datetime_text(value: datetime | None) -> str | None:
    if value is None:
        return None
    return (
        value.isoformat() if value.utcoffset() is not None else f"{value.isoformat()}Z"
    )


def build_ona_graph(
    employees: list[Any], events: list[dict[str, Any]], *, window_days: int
) -> dict[str, Any]:
    employee_by_id = {str(employee.id): employee for employee in employees}
    ids = list(employee_by_id)
    adjacency: dict[str, dict[str, int]] = {employee_id: {} for employee_id in ids}
    valid_records = 0
    excluded_records = 0
    latest_event: datetime | None = None
    earliest_event: datetime | None = None
    event_type_totals: dict[str, int] = {}
    pair_event_types: dict[tuple[str, str], dict[str, int]] = {}
    pair_first_seen: dict[tuple[str, str], datetime] = {}
    pair_last_seen: dict[tuple[str, str], datetime] = {}

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
        event_type = (
            str(event.get("event_type") or "collaboration").strip() or "collaboration"
        )
        event_type_totals[event_type] = (
            event_type_totals.get(event_type, 0) + record_count
        )
        pair_key: tuple[str, str] = (
            (source, target) if source < target else (target, source)
        )
        types_for_pair = pair_event_types.setdefault(pair_key, {})
        types_for_pair[event_type] = types_for_pair.get(event_type, 0) + record_count
        occurred_at = event.get("occurred_at")
        first_occurred_at = event.get("first_occurred_at") or occurred_at
        last_occurred_at = event.get("last_occurred_at") or occurred_at
        if isinstance(first_occurred_at, datetime):
            earliest_event = (
                min(earliest_event, first_occurred_at)
                if earliest_event
                else first_occurred_at
            )
            pair_first_seen[pair_key] = min(
                pair_first_seen.get(pair_key, first_occurred_at), first_occurred_at
            )
        if isinstance(last_occurred_at, datetime):
            latest_event = (
                max(latest_event, last_occurred_at)
                if latest_event
                else last_occurred_at
            )
            pair_last_seen[pair_key] = max(
                pair_last_seen.get(pair_key, last_occurred_at), last_occurred_at
            )

    n = len(ids)
    degree = {node: len(adjacency[node]) for node in ids}
    component_sizes: list[int] = []
    visited: set[str] = set()
    for root in ids:
        if root in visited:
            continue
        visited.add(root)
        pending = [root]
        component_size = 0
        while pending:
            current = pending.pop()
            component_size += 1
            for neighbor in adjacency[current]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    pending.append(neighbor)
        component_sizes.append(component_size)
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
    extra_palette = (
        "#f97316",
        "#c084fc",
        "#84cc16",
        "#fb7185",
        "#38bdf8",
        "#facc15",
        "#2dd4bf",
        "#a3e635",
        "#e879f9",
        "#60a5fa",
        "#fb923c",
        "#4ade80",
    )

    def color_for_department(department: str) -> str:
        normalized = department.casefold()
        if normalized in palette:
            return palette[normalized]
        stable_hash = sum(
            (index + 1) * ord(character) for index, character in enumerate(normalized)
        )
        return extra_palette[stable_hash % len(extra_palette)]

    nodes = []
    for node in ids:
        employee = employee_by_id[node]
        nodes.append(
            {
                "id": node,
                "name": employee.full_name,
                "department": departments[node],
                "role": employee.role or "Team Member",
                "department_color": color_for_department(departments[node]),
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
                pair_key = (source, target) if source < target else (target, source)
                links.append(
                    {
                        "source": source,
                        "target": target,
                        "record_count": count,
                        "weight": count / max_record_count if max_record_count else 0.0,
                        "channel": "uploaded_collaboration_event",
                        "event_types": [
                            {"type": event_type, "count": type_count}
                            for event_type, type_count in sorted(
                                pair_event_types.get(pair_key, {}).items(),
                                key=lambda item: (-item[1], item[0].casefold()),
                            )
                        ],
                        "first_occurred_at": (
                            _datetime_text(pair_first_seen[pair_key])
                            if pair_key in pair_first_seen
                            else None
                        ),
                        "last_occurred_at": (
                            _datetime_text(pair_last_seen[pair_key])
                            if pair_key in pair_last_seen
                            else None
                        ),
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
            "isolated_node_count": sum(value == 0 for value in degree.values()),
            "component_count": len(component_sizes),
            "largest_component_size": max(component_sizes, default=0),
            "average_degree": (2 * len(links) / n) if n else 0.0,
            "represented_record_count": valid_records,
            "event_type_breakdown": dict(sorted(event_type_totals.items())),
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
            "latest_represented_record_at": (_datetime_text(latest_event)),
            "earliest_represented_record_at": (_datetime_text(earliest_event)),
            "time_basis": "collaboration_events.occurred_at (source event time)",
            "status": "available" if links else "insufficient_evidence",
        },
    }
