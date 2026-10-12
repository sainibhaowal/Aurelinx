import pytest

from app.services.semantic_skill_evaluation import evaluate_rankings


def test_reviewer_metrics_reflects_rank_order_and_relevance():
    report = evaluate_rankings(
        [
            {
                "relevant_profile_ids": ["p1", "p3"],
                "ranked_profile_ids": ["p1", "p2", "p3"],
            }
        ],
        (1, 3),
    )
    assert report["query_count"] == 1
    assert report["metrics"]["@1"]["precision"] == 1.0
    assert report["metrics"]["@3"]["recall"] == 1.0
    assert report["metrics"]["@3"]["ndcg"] < 1.0
    assert report["mean_reciprocal_rank"] == 1.0


@pytest.mark.parametrize(
    "queries",
    [
        [],
        [{"relevant_profile_ids": [], "ranked_profile_ids": []}],
        [{"relevant_profile_ids": ["p1"], "ranked_profile_ids": "p1"}],
    ],
)
def test_reviewer_metrics_rejects_invalid_evaluation_input(queries):
    with pytest.raises(ValueError):
        evaluate_rankings(queries)
