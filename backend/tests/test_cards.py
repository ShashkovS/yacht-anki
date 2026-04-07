"""Test card list endpoints for deck content.

Edit this file when card list endpoint behavior or card payloads change.
Copy a test pattern here when you add another content listing endpoint.
"""

from __future__ import annotations

import pytest

from backend.tests.conftest import login


@pytest.mark.asyncio
async def test_cards_list_returns_cards_with_pagination(client, create_deck_row, create_card_row) -> None:
    deck = await create_deck_row("custom-cards", "Кастомные карточки", "Тестовый deck")
    await create_card_row(deck["id"], slug="q1", prompt="Q1", answer="A1", sort_order=1)
    await create_card_row(
        deck["id"],
        slug="q2",
        prompt="Q2",
        answer="A2",
        sort_order=2,
        tags=["wind"],
        diagram_spec={
            "version": 1,
            "wind": {"direction_deg": 45},
            "boats": [{"id": "alpha", "x": 500, "y": 350, "heading_deg": 90, "sails": {"main": {"state": "trimmed"}}}],
        },
    )

    response = await client.post("/cards/list", json={"deck_slug": "custom-cards", "limit": 1, "offset": 1})

    assert response.status == 200
    payload = await response.json()
    assert payload["data"]["total_count"] == 2
    assert payload["data"]["limit"] == 1
    assert payload["data"]["offset"] == 1
    assert len(payload["data"]["cards"]) == 1
    assert payload["data"]["cards"][0]["prompt"] == "Q2"
    assert payload["data"]["cards"][0]["diagram_spec"]["wind"] == {"direction_deg": 45}
    assert payload["data"]["cards"][0]["tags"] == ["wind"]


@pytest.mark.asyncio
async def test_cards_list_adds_state_for_logged_in_user(
    client,
    create_user,
    auth_headers,
    create_deck_row,
    create_card_row,
    create_card_state_row,
    get_user_id,
) -> None:
    await create_user("user", "user")
    deck = await create_deck_row("custom-cards", "Кастомные карточки", "Тестовый deck")
    due_card = await create_card_row(deck["id"], slug="q1", prompt="Q1", answer="A1", sort_order=1)
    new_card = await create_card_row(deck["id"], slug="q2", prompt="Q2", answer="A2", sort_order=2)
    await create_card_state_row(await get_user_id("user"), due_card["id"], phase="learning", due_at="2026-01-02T00:00:00+00:00")
    await login(client, "user", "user", auth_headers)

    response = await client.post("/cards/list", json={"deck_slug": "custom-cards"})

    assert response.status == 200
    cards = (await response.json())["data"]["cards"]
    assert cards[0]["state"] == {
        "phase": "learning",
        "due_at": "2026-01-02T00:00:00+00:00",
        "last_reviewed_at": "2025-12-31T00:00:00+00:00",
        "fsrs_state": {"difficulty": 5, "stability": 10, "retrievability": 0.9},
    }
    assert cards[1]["state"] is None
    assert new_card["id"] == cards[1]["id"]


@pytest.mark.asyncio
async def test_cards_list_validates_payload_and_unknown_deck(client) -> None:
    bad_limit = await client.post("/cards/list", json={"deck_slug": "custom-cards", "limit": -1})
    missing_deck = await client.post("/cards/list", json={"deck_slug": "missing"})

    assert bad_limit.status == 400
    assert missing_deck.status == 404
