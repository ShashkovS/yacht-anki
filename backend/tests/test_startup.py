"""Test startup migrations and builtin training content.

Edit this file when startup schema creation or dev bootstrap behavior changes.
Copy a test pattern here when you add another startup or migration smoke test.
"""

from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_startup_creates_yacht_training_tables(client) -> None:
    db = client.app["db"]
    cursor = await db.execute(
        """
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
        ORDER BY name
        """
    )
    table_names = {row["name"] for row in await cursor.fetchall()}

    assert "notes" not in table_names
    assert {"users", "refresh_sessions", "decks", "cards", "card_states", "review_log", "user_settings"} <= table_names


@pytest.mark.asyncio
async def test_startup_seeds_builtin_decks_and_cards(client) -> None:
    db = client.app["db"]
    expected_counts = {
        "decks": 3,
        "cards": 74,
        "card_states": 0,
        "review_log": 0,
        "user_settings": 0,
    }

    for table_name, expected_count in expected_counts.items():
        cursor = await db.execute(f"SELECT COUNT(*) AS count FROM {table_name}")
        row = await cursor.fetchone()
        assert row["count"] == expected_count


@pytest.mark.asyncio
async def test_startup_seeds_concept_cards(client) -> None:
    db = client.app["db"]
    cursor = await db.execute("SELECT COUNT(*) AS count FROM cards WHERE template_type = 'concept'")
    row = await cursor.fetchone()

    assert row["count"] >= 1
