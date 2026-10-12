"""Offline ranking metrics for reviewer-labeled skill search results."""

from __future__ import annotations

import math
from collections.abc import Iterable
from typing import Any


def evaluate_rankings(
    queries: Iterable[dict[str, Any]], k_values: tuple[int, ...] = (5, 10, 20)
) -> dict[str, Any]:
    """Compute macro precision/recall@K, reciprocal rank, and binary NDCG@K.

    Each query has `relevant_profile_ids` and `ranked_profile_ids`. These
    judgments must be created by reviewers and kept separate from tuning data.
    """
    rows = list(queries)
    if not rows:
        raise ValueError("At least one labeled query is required")
    if not k_values or any(k < 1 for k in k_values):
        raise ValueError("K values must be positive integers")

    totals: dict[int, dict[str, float]] = {
        k: {"precision": 0.0, "recall": 0.0, "ndcg": 0.0} for k in k_values
    }
    reciprocal_rank_sum = 0.0
    for index, row in enumerate(rows):
        relevant = set(row.get("relevant_profile_ids") or [])
        ranked_list = row.get("ranked_profile_ids") or []
        if not isinstance(ranked_list, list):
            raise ValueError(f"Query {index}: ranked_profile_ids must be a list")
        ranked = list(dict.fromkeys(ranked_list))
        if not relevant:
            raise ValueError(
                f"Query {index}: at least one relevant judgment is required"
            )
        reciprocal_rank_sum += next(
            (
                1.0 / rank
                for rank, profile_id in enumerate(ranked, start=1)
                if profile_id in relevant
            ),
            0.0,
        )

        for k in k_values:
            top = ranked[:k]
            hits = sum(profile_id in relevant for profile_id in top)
            precision = hits / k
            recall = hits / len(relevant)
            dcg = sum(
                1.0 / math.log2(rank + 1)
                for rank, profile_id in enumerate(top, start=1)
                if profile_id in relevant
            )
            ideal_hits = min(len(relevant), k)
            ideal_dcg = sum(
                1.0 / math.log2(rank + 1) for rank in range(1, ideal_hits + 1)
            )
            totals[k]["precision"] += precision
            totals[k]["recall"] += recall
            totals[k]["ndcg"] += dcg / ideal_dcg if ideal_dcg else 0.0

    count = len(rows)
    return {
        "query_count": count,
        "metrics": {
            f"@{k}": {name: round(value / count, 4) for name, value in values.items()}
            for k, values in totals.items()
        },
        "mean_reciprocal_rank": round(reciprocal_rank_sum / count, 4),
        "judgment_source": "supplied_labels_unverified",
    }
