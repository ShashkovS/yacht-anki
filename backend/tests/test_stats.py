"""Test study statistics endpoint aggregation and validation behavior.

Edit this file when stats endpoint behavior or aggregation rules change.
Copy a test pattern here when you add another analytics endpoint.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from backend.db.connection import utc_now
from backend.tests.conftest import login


@pytest.mark.asyncio
async def test_stats_get_requires_login_and_valid_json_object(client, create_user, auth_headers) -> None:
    unauthorized = await client.post("/stats/get", json={})
    assert unauthorized.status == 401

    await create_user("user", "user")
    await login(client, "user", "user", auth_headers)
    bad_payload = await client.post("/stats/get", json=[])

    assert bad_payload.status == 400


@pytest.mark.asyncio
async def test_stats_get_returns_zero_filled_empty_history(client, create_user, auth_headers) -> None:
    await create_user("user", "user")
    await login(client, "user", "user", auth_headers)

    response = await client.post("/stats/get", json={})

    assert response.status == 200
    payload = (await response.json())["data"]
    assert payload["today"] == {"review_count": 0, "average_rating": None}
    assert len(payload["activity_30d"]) == 30
    assert all(point["review_count"] == 0 for point in payload["activity_30d"])
    assert payload["rating_distribution_30d"] == [
        {"rating": 1, "count": 0},
        {"rating": 2, "count": 0},
        {"rating": 3, "count": 0},
        {"rating": 4, "count": 0},
    ]
    assert payload["hardest_cards"] == []
    assert payload["streak_days"] == 0
    assert payload["studied_cards_count"] == 0
    assert payload["overall_progress"]["review_cards"] == 0
    assert payload["overall_progress"]["total_cards"] == 74
    assert payload["overall_progress"]["percent_review"] == 0.0


@pytest.mark.asyncio
async def test_stats_get_returns_mixed_history_and_progress(
    client,
    create_user,
    auth_headers,
    create_deck_row,
    create_card_row,
    create_card_state_row,
    create_review_log_row,
    get_user_id,
) -> None:
    await create_user("user", "user")
    user_id = await get_user_id("user")
    deck = await create_deck_row("stats-deck", "Статистика", "Колода для статистики")
    hard_card = await create_card_row(deck["id"], slug="hard-card", prompt="Hard card", sort_order=1)
    second_card = await create_card_row(deck["id"], slug="second-card", prompt="Second card", sort_order=2)
    third_card = await create_card_row(deck["id"], slug="third-card", prompt="Third card", sort_order=3)
    await create_card_state_row(user_id, hard_card["id"], phase="review")
    await create_card_state_row(user_id, second_card["id"], phase="learning")

    now = utc_now()
    today_reviewed_at = now.isoformat(timespec="seconds")
    yesterday_reviewed_at = (now - timedelta(days=1)).isoformat(timespec="seconds")
    week_reviewed_at = (now - timedelta(days=7)).isoformat(timespec="seconds")
    await create_review_log_row(user_id, hard_card["id"], rating=1, reviewed_at=today_reviewed_at)
    await create_review_log_row(user_id, hard_card["id"], rating=1, reviewed_at=yesterday_reviewed_at)
    await create_review_log_row(user_id, hard_card["id"], rating=3, reviewed_at=week_reviewed_at)
    await create_review_log_row(user_id, second_card["id"], rating=2, reviewed_at=today_reviewed_at)

    await login(client, "user", "user", auth_headers)
    response = await client.post("/stats/get", json={})

    assert response.status == 200
    payload = (await response.json())["data"]
    today = datetime.now(tz=UTC).date().isoformat()
    yesterday = (datetime.now(tz=UTC).date() - timedelta(days=1)).isoformat()

    assert payload["today"] == {"review_count": 2, "average_rating": 1.5}
    assert payload["activity_30d"][-1] == {"day": today, "review_count": 2}
    assert payload["activity_30d"][-2] == {"day": yesterday, "review_count": 1}
    assert payload["rating_distribution_30d"] == [
        {"rating": 1, "count": 2},
        {"rating": 2, "count": 1},
        {"rating": 3, "count": 1},
        {"rating": 4, "count": 0},
    ]
    assert payload["streak_days"] == 2
    assert payload["studied_cards_count"] == 2
    assert payload["overall_progress"] == {
        "review_cards": 1,
        "total_cards": 77,
        "percent_review": 1.3,
    }
    custom_deck = next(deck_row for deck_row in payload["deck_progress"] if deck_row["deck_slug"] == "stats-deck")
    assert custom_deck == {
        "deck_slug": "stats-deck",
        "title": "Статистика",
        "total_cards": 3,
        "new_cards": 1,
        "learning_cards": 1,
        "review_cards": 1,
    }
    assert payload["hardest_cards"][0] == {
        "card_id": hard_card["id"],
        "deck_slug": "stats-deck",
        "deck_title": "Статистика",
        "prompt": "Hard card",
        "again_count": 2,
        "review_count": 3,
    }
    assert third_card["id"] != payload["hardest_cards"][0]["card_id"]


@pytest.mark.asyncio
async def test_stats_get_sorts_hardest_cards_by_again_then_reviews_then_card_id(
    client,
    create_user,
    auth_headers,
    create_deck_row,
    create_card_row,
    create_review_log_row,
    get_user_id,
) -> None:
    await create_user("user", "user")
    user_id = await get_user_id("user")
    deck = await create_deck_row("hardest-deck", "Hardest", "Tie-break checks")
    card_a = await create_card_row(deck["id"], slug="a", prompt="A", sort_order=1)
    card_b = await create_card_row(deck["id"], slug="b", prompt="B", sort_order=2)
    card_c = await create_card_row(deck["id"], slug="c", prompt="C", sort_order=3)
    reviewed_at = utc_now().isoformat(timespec="seconds")

    await create_review_log_row(user_id, card_a["id"], rating=1, reviewed_at=reviewed_at)
    await create_review_log_row(user_id, card_a["id"], rating=1, reviewed_at=reviewed_at)
    await create_review_log_row(user_id, card_b["id"], rating=1, reviewed_at=reviewed_at)
    await create_review_log_row(user_id, card_b["id"], rating=1, reviewed_at=reviewed_at)
    await create_review_log_row(user_id, card_b["id"], rating=4, reviewed_at=reviewed_at)
    await create_review_log_row(user_id, card_c["id"], rating=1, reviewed_at=reviewed_at)

    await login(client, "user", "user", auth_headers)
    response = await client.post("/stats/get", json={})

    assert response.status == 200
    hardest_cards = (await response.json())["data"]["hardest_cards"]
    assert [card["prompt"] for card in hardest_cards[:3]] == ["B", "A", "C"]
