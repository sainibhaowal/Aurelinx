#!/usr/bin/env python3
"""Evaluate ranked skill-search outputs against expert relevance judgments.

Input JSON schema:
{
  "queries": [
    {"query_id": "q1", "relevant_profile_ids": ["p1"],
     "ranked_profile_ids": ["p1", "p2"]}
  ]
}
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.services.semantic_skill_evaluation import evaluate_rankings


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("judgments", type=Path, help="Reviewer-labeled ranking JSON")
    parser.add_argument(
        "--k", nargs="+", type=int, default=[5, 10, 20], help="Ranking cutoffs"
    )
    args = parser.parse_args()
    payload = json.loads(args.judgments.read_text(encoding="utf-8"))
    report = evaluate_rankings(payload.get("queries", []), tuple(args.k))
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
