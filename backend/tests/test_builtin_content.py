"""Test builtin content loading and idempotent repo-backed seed behavior.

Edit this file when builtin deck catalog rules or startup content seed logic change.
Copy a test pattern here when you add another repo-backed content source.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from backend.db.builtin_content import load_builtin_catalog, seed_builtin_content


def _write_catalog_file(root: Path, slug: str, title: str, cards: list[dict[str, object]]) -> None:
    payload = {
        "slug": slug,
        "title": title,
        "description": f"{title} description",
        "builtin": True,
        "cards": cards,
    }
    (root / f"{slug}.json").write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


def _make_card(slug: str, prompt: str, sort_order: int) -> dict[str, object]:
    return {
        "slug": slug,
        "template_type": "term_definition",
        "prompt": prompt,
        "answer": f"{prompt} answer",
        "explanation": f"{prompt} explanation",
        "diagram_spec": {
            "version": 1,
            "wind": {"direction_deg": 0},
            "boats": [
                {
                    "id": "alpha",
                    "x": 500,
                    "y": 350,
                    "heading_deg": 45,
                    "sails": {"main": {"state": "trimmed"}},
                }
            ],
        },
        "tags": ["test"],
        "sort_order": sort_order,
    }


def _write_full_catalog(root: Path, *, duplicate_slug: bool = False, updated_prompt: str = "Alpha prompt") -> None:
    root.mkdir(parents=True, exist_ok=True)
    manoeuvre_cards = [_make_card("maneuver-alpha", "Maneuver prompt", 1)]
    right_of_way_cards = [_make_card("rules-alpha", "Rules prompt", 1)]
    term_cards = [
        _make_card("term-alpha", updated_prompt, 1),
        _make_card("term-alpha" if duplicate_slug else "term-bravo", "Bravo prompt", 2),
    ]
    _write_catalog_file(root, "terms", "Terms", term_cards)
    _write_catalog_file(root, "manoeuvres", "Manoeuvres", manoeuvre_cards)
    _write_catalog_file(root, "right-of-way", "Right Of Way", right_of_way_cards)


def test_load_builtin_catalog_contains_expected_real_counts() -> None:
    catalog = load_builtin_catalog()

    assert [deck["slug"] for deck in catalog] == ["terms", "manoeuvres", "right-of-way"]
    assert [len(deck["cards"]) for deck in catalog] == [35, 16, 23]


@pytest.mark.asyncio
async def test_seed_builtin_content_is_idempotent(client) -> None:
    db = client.app["db"]
    await seed_builtin_content(db)
    await seed_builtin_content(db)

    deck_count = await (await db.execute("SELECT COUNT(*) AS count FROM decks")).fetchone()
    card_count = await (await db.execute("SELECT COUNT(*) AS count FROM cards")).fetchone()

    assert deck_count is not None
    assert card_count is not None
    assert deck_count["count"] == 3
    assert card_count["count"] == 74


@pytest.mark.asyncio
async def test_seed_builtin_content_updates_existing_card_by_slug(client, tmp_path: Path) -> None:
    db = client.app["db"]
    content_root = tmp_path / "content"
    _write_full_catalog(content_root, updated_prompt="Alpha prompt")
    await seed_builtin_content(db, content_root)

    _write_full_catalog(content_root, updated_prompt="Updated alpha prompt")
    await seed_builtin_content(db, content_root)

    row = await (
        await db.execute(
            """
            SELECT c.prompt
            FROM cards AS c
            JOIN decks AS d ON d.id = c.deck_id
            WHERE d.slug = ? AND c.slug = ?
            """,
            ("terms", "term-alpha"),
        )
    ).fetchone()
    card_count = await (
        await db.execute(
            """
            SELECT COUNT(*) AS count
            FROM cards AS c
            JOIN decks AS d ON d.id = c.deck_id
            WHERE d.slug = ?
            """,
            ("terms",),
        )
    ).fetchone()

    assert row is not None
    assert row["prompt"] == "Updated alpha prompt"
    assert card_count is not None
    assert card_count["count"] == 37


@pytest.mark.asyncio
async def test_seed_builtin_content_rejects_duplicate_card_slug_within_deck(client, tmp_path: Path) -> None:
    db = client.app["db"]
    content_root = tmp_path / "content"
    _write_full_catalog(content_root, duplicate_slug=True)

    with pytest.raises(ValueError, match="duplicate card slugs"):
        await seed_builtin_content(db, content_root)
