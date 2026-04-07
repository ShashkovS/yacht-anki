"""Load and seed builtin deck content from repo JSON files.

Edit this file when builtin content loading, validation, or upsert rules change.
Copy this file when you add another repo-backed content catalog.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import aiosqlite

from backend.db.cards import upsert_card
from backend.db.decks import upsert_deck


CONTENT_DECK_ORDER = ("terms", "manoeuvres", "right-of-way")


def get_builtin_content_root(content_root: Path | None = None) -> Path:
    if content_root is not None:
        return content_root
    return Path(__file__).resolve().parents[2] / "content"


def _read_json_file(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _read_string(value: object, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} must be a non-empty string.")
    return value


def _read_bool(value: object, label: str) -> bool:
    if not isinstance(value, bool):
        raise ValueError(f"{label} must be a boolean.")
    return value


def _read_string_list(value: object, label: str) -> list[str]:
    if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
        raise ValueError(f"{label} must be a list of strings.")
    return list(value)


def _read_card(card: object, label: str) -> dict[str, Any]:
    if not isinstance(card, dict):
        raise ValueError(f"{label} must be an object.")
    if not isinstance(card.get("diagram_spec"), dict):
        raise ValueError(f"{label}.diagram_spec must be an object.")
    sort_order = card.get("sort_order")
    if not isinstance(sort_order, int) or sort_order <= 0:
        raise ValueError(f"{label}.sort_order must be a positive integer.")
    return {
        "slug": _read_string(card.get("slug"), f"{label}.slug"),
        "template_type": _read_string(card.get("template_type"), f"{label}.template_type"),
        "prompt": _read_string(card.get("prompt"), f"{label}.prompt"),
        "answer": _read_string(card.get("answer"), f"{label}.answer"),
        "explanation": _read_string(card.get("explanation"), f"{label}.explanation"),
        "diagram_spec": card["diagram_spec"],
        "tags": _read_string_list(card.get("tags"), f"{label}.tags"),
        "sort_order": sort_order,
    }


def _read_deck_file(path: Path) -> dict[str, Any]:
    payload = _read_json_file(path)
    if not isinstance(payload, dict):
        raise ValueError(f"{path.name} must contain an object.")
    cards = payload.get("cards")
    if not isinstance(cards, list):
        raise ValueError(f"{path.name}.cards must be an array.")
    parsed_cards = [_read_card(card, f"{path.name}.cards[{index}]") for index, card in enumerate(cards)]
    card_slugs = [card["slug"] for card in parsed_cards]
    if len(card_slugs) != len(set(card_slugs)):
        raise ValueError(f"{path.name} contains duplicate card slugs.")
    return {
        "slug": _read_string(payload.get("slug"), f"{path.name}.slug"),
        "title": _read_string(payload.get("title"), f"{path.name}.title"),
        "description": _read_string(payload.get("description"), f"{path.name}.description"),
        "builtin": _read_bool(payload.get("builtin"), f"{path.name}.builtin"),
        "cards": parsed_cards,
    }


def load_builtin_catalog(content_root: Path | None = None) -> list[dict[str, Any]]:
    root = get_builtin_content_root(content_root)
    catalog = []
    for deck_slug in CONTENT_DECK_ORDER:
        path = root / f"{deck_slug}.json"
        if not path.exists():
            raise ValueError(f"Builtin content file does not exist: {path}")
        deck = _read_deck_file(path)
        if deck["slug"] != deck_slug:
            raise ValueError(f"{path.name} slug must be {deck_slug}.")
        catalog.append(deck)
    return catalog


async def seed_builtin_content(db: aiosqlite.Connection, content_root: Path | None = None) -> None:
    for deck_payload in load_builtin_catalog(content_root):
        deck = await upsert_deck(
            db,
            deck_payload["slug"],
            deck_payload["title"],
            deck_payload["description"],
            deck_payload["builtin"],
        )
        for card_payload in deck_payload["cards"]:
            await upsert_card(
                db,
                deck["id"],
                card_payload["slug"],
                card_payload["template_type"],
                card_payload["prompt"],
                card_payload["answer"],
                card_payload["explanation"],
                card_payload["diagram_spec"],
                card_payload["tags"],
                card_payload["sort_order"],
            )
