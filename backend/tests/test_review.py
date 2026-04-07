"""Test review queue, submit, and summary endpoints.

Edit this file when review endpoint behavior or queue rules change.
Copy a test pattern here when you add another per-user study endpoint.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from backend.tests.conftest import login


@pytest.mark.asyncio
async def test_review_queue_requires_login(client) -> None:
    response = await client.post("/review/queue", json={})
    assert response.status == 401


@pytest.mark.asyncio
async def test_review_queue_returns_empty_summary_for_new_user(client, create_user, auth_headers) -> None:
    await create_user("user", "user")
    await login(client, "user", "user", auth_headers)

    response = await client.post("/review/queue", json={})

    assert response.status == 200
    payload = await response.json()
    assert payload["data"]["cards"] == []
    assert payload["data"]["summary"] == {"due_count": 0, "new_count": 0, "deck_slug": None}


@pytest.mark.asyncio
async def test_review_queue_orders_due_before_new_and_applies_limits(
    client,
    create_user,
    auth_headers,
    create_deck_row,
    create_card_row,
    create_card_state_row,
    save_user_settings_row,
    get_user_id,
) -> None:
    await create_user("user", "user")
    deck = await create_deck_row("terms", "Термины", "Основные термины")
    overdue_card = await create_card_row(deck["id"], prompt="due 1", answer="A1", sort_order=1)
    second_due_card = await create_card_row(deck["id"], prompt="due 2", answer="A2", sort_order=2)
    new_card = await create_card_row(deck["id"], prompt="new 1", answer="A3", sort_order=3)
    await create_card_row(deck["id"], prompt="new 2", answer="A4", sort_order=4)
    user_id = await get_user_id("user")
    await create_card_state_row(user_id, overdue_card["id"], phase="review", due_at="2000-01-01T00:00:00+00:00")
    await create_card_state_row(user_id, second_due_card["id"], phase="learning", due_at="2000-01-02T00:00:00+00:00")
    await save_user_settings_row(user_id, 0.9, 1, 1)
    await login(client, "user", "user", auth_headers)

    response = await client.post("/review/queue", json={})

    assert response.status == 200
    payload = await response.json()
    assert [card["prompt"] for card in payload["data"]["cards"]] == ["due 1", "new 1"]
    assert payload["data"]["summary"] == {"due_count": 1, "new_count": 1, "deck_slug": None}
    assert new_card["id"] == payload["data"]["cards"][1]["id"]


@pytest.mark.asyncio
async def test_review_queue_and_summary_filter_by_optional_deck_slug(
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
    terms = await create_deck_row("terms", "Термины", "Основные термины")
    rules = await create_deck_row("rules", "Правила", "Правила расхождения")
    terms_due = await create_card_row(terms["id"], prompt="terms due", answer="A1")
    rules_due = await create_card_row(rules["id"], prompt="rules due", answer="A2")
    rules_new = await create_card_row(rules["id"], prompt="rules new", answer="A3")
    user_id = await get_user_id("user")
    await create_card_state_row(user_id, terms_due["id"], phase="review", due_at="2000-01-01T00:00:00+00:00")
    await create_card_state_row(user_id, rules_due["id"], phase="review", due_at="2000-01-02T00:00:00+00:00")
    await create_review_log_row(user_id, rules_due["id"], reviewed_at=datetime.now(tz=UTC).isoformat(timespec="seconds"))
    await login(client, "user", "user", auth_headers)

    queue_response = await client.post("/review/queue", json={"deck_slug": "rules"})
    summary_response = await client.post("/review/summary", json={"deck_slug": "rules"})

    assert queue_response.status == 200
    queue_payload = await queue_response.json()
    assert [card["prompt"] for card in queue_payload["data"]["cards"]] == ["rules due", "rules new"]
    assert queue_payload["data"]["summary"] == {"due_count": 1, "new_count": 1, "deck_slug": "rules"}

    assert summary_response.status == 200
    summary = (await summary_response.json())["data"]
    assert summary["due_count"] == 1
    assert summary["new_count"] == 1
    assert summary["studied_cards_count"] == 1
    assert summary["streak_days"] == 1
    assert summary["deck_progress"] == [
        {
            "deck_slug": "rules",
            "title": "Правила",
            "total_cards": 2,
            "new_cards": 1,
            "learning_cards": 0,
            "review_cards": 1,
        }
    ]
    assert rules_new["id"] == queue_payload["data"]["cards"][1]["id"]


@pytest.mark.asyncio
async def test_review_submit_creates_state_and_log_then_updates_elapsed_days(
    client,
    create_user,
    auth_headers,
    create_deck_row,
    create_card_row,
    db,
    get_user_id,
) -> None:
    await create_user("user", "user")
    deck = await create_deck_row("terms", "Термины", "Основные термины")
    card = await create_card_row(deck["id"], prompt="card", answer="answer")
    user_id = await get_user_id("user")
    await login(client, "user", "user", auth_headers)

    first_due_at = (datetime.now(tz=UTC) + timedelta(days=3)).isoformat(timespec="seconds")
    first_response = await client.post(
        "/review/submit",
        json={
            "card_id": card["id"],
            "rating": 3,
            "fsrs_state": {"difficulty": 3, "stability": 5, "retrievability": 0.8},
            "phase": "learning",
            "due_at": first_due_at,
            "elapsed_ms": 1800,
        },
        headers=auth_headers,
    )
    assert first_response.status == 200
    first_payload = await first_response.json()
    assert first_payload["data"]["card_state"]["card_id"] == card["id"]
    assert first_payload["data"]["card_state"]["phase"] == "learning"

    state_cursor = await db.execute(
        "SELECT phase, fsrs_state_json, last_reviewed_at FROM card_states WHERE user_id = ? AND card_id = ?",
        (user_id, card["id"]),
    )
    state_row = await state_cursor.fetchone()
    assert state_row is not None
    assert state_row["phase"] == "learning"
    assert "difficulty" in state_row["fsrs_state_json"]
    first_reviewed_at = state_row["last_reviewed_at"]

    second_due_at = (datetime.now(tz=UTC) + timedelta(days=8)).isoformat(timespec="seconds")
    second_response = await client.post(
        "/review/submit",
        json={
            "card_id": card["id"],
            "rating": 4,
            "fsrs_state": {"difficulty": 2, "stability": 7, "retrievability": 0.9},
            "phase": "review",
            "due_at": second_due_at,
            "elapsed_ms": 900,
        },
        headers=auth_headers,
    )
    assert second_response.status == 200

    updated_state_cursor = await db.execute(
        "SELECT phase, fsrs_state_json, last_reviewed_at FROM card_states WHERE user_id = ? AND card_id = ?",
        (user_id, card["id"]),
    )
    updated_state_row = await updated_state_cursor.fetchone()
    assert updated_state_row is not None
    assert updated_state_row["phase"] == "review"
    assert updated_state_row["last_reviewed_at"] is not None

    log_rows = await (await db.execute(
        """
        SELECT rating, scheduled_days, elapsed_days, elapsed_ms
        FROM review_log
        WHERE user_id = ? AND card_id = ?
        ORDER BY id
        """,
        (user_id, card["id"]),
    )).fetchall()
    assert len(log_rows) == 2
    assert log_rows[0]["elapsed_days"] is None
    assert log_rows[1]["elapsed_days"] is not None
    assert log_rows[1]["elapsed_ms"] == 900


@pytest.mark.asyncio
async def test_review_submit_validates_payload_and_unknown_objects(client, create_user, auth_headers) -> None:
    await create_user("user", "user")
    await login(client, "user", "user", auth_headers)

    bad_payload = await client.post(
        "/review/submit",
        json={
            "card_id": 1,
            "rating": 5,
            "fsrs_state": [],
            "phase": "oops",
            "due_at": "bad-date",
            "elapsed_ms": -1,
        },
        headers=auth_headers,
    )
    missing_card = await client.post(
        "/review/submit",
        json={
            "card_id": 999,
            "rating": 3,
            "fsrs_state": {"difficulty": 1},
            "phase": "learning",
            "due_at": "2026-01-01T00:00:00+00:00",
            "elapsed_ms": 1000,
        },
        headers=auth_headers,
    )
    missing_deck = await client.post("/review/summary", json={"deck_slug": "missing"})

    assert bad_payload.status == 400
    assert missing_card.status == 404
    assert missing_deck.status == 404
