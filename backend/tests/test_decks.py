"""Test public deck list and deck detail endpoints.

Edit this file when deck endpoint behavior or deck progress payloads change.
Copy a test pattern here when you add another read-only content endpoint.
"""

from __future__ import annotations

import pytest

from backend.tests.conftest import login


@pytest.mark.asyncio
async def test_decks_list_is_public(client) -> None:
    response = await client.post("/decks/list", json={})

    assert response.status == 200
    payload = await response.json()
    assert [deck["slug"] for deck in payload["data"]["decks"]] == ["terms", "manoeuvres", "right-of-way"]
    assert [deck["card_count"] for deck in payload["data"]["decks"]] == [31, 16, 23]
    assert "progress" not in payload["data"]["decks"][0]


@pytest.mark.asyncio
async def test_decks_list_adds_progress_for_logged_in_user(
    client,
    create_user,
    auth_headers,
    create_deck_row,
    create_card_row,
    create_card_state_row,
    get_user_id,
) -> None:
    await create_user("user", "user")
    deck = await create_deck_row("custom-progress", "Кастомная колода", "Для теста прогресса")
    first_card = await create_card_row(deck["id"], slug="progress-1", sort_order=1)
    await create_card_row(deck["id"], slug="progress-2", prompt="Второй вопрос", answer="Второй ответ", sort_order=2)
    await create_card_state_row(await get_user_id("user"), first_card["id"], phase="review")
    await login(client, "user", "user", auth_headers)

    response = await client.post("/decks/list", json={})

    assert response.status == 200
    decks = (await response.json())["data"]["decks"]
    progress = next(deck_row["progress"] for deck_row in decks if deck_row["slug"] == "custom-progress")
    assert progress == {
        "total_cards": 2,
        "new_cards": 1,
        "learning_cards": 0,
        "review_cards": 1,
    }


@pytest.mark.asyncio
async def test_decks_get_returns_one_deck_and_404_for_unknown_slug(client) -> None:
    ok_response = await client.post("/decks/get", json={"slug": "terms"})
    missing_response = await client.post("/decks/get", json={"slug": "missing"})

    assert ok_response.status == 200
    payload = await ok_response.json()
    assert payload["data"]["deck"]["slug"] == "terms"
    assert payload["data"]["deck"]["card_count"] == 31
    assert missing_response.status == 404
