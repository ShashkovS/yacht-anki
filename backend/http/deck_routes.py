"""Handle public deck and card read endpoints.

Edit this file when deck or card API behavior changes.
Copy the route pattern here when you add another small content-read route group.
"""

from __future__ import annotations

from aiohttp import web

from backend.auth.access import current_user
from backend.db.card_states import list_deck_progress
from backend.db.cards import list_cards_for_deck
from backend.db.decks import get_deck_by_slug, list_decks
from backend.http.json_api import AppError, ok, read_json


def _read_required_slug(payload: dict[str, object], field_name: str) -> str:
    value = payload.get(field_name)
    if not isinstance(value, str) or not value.strip():
        raise AppError(400, "bad_request", f"{field_name} is required.")
    return value.strip()


def _read_non_negative_int(payload: dict[str, object], field_name: str, default_value: int) -> int:
    value = payload.get(field_name, default_value)
    if not isinstance(value, int) or value < 0:
        raise AppError(400, "bad_request", f"{field_name} must be a non-negative integer.")
    return value


async def decks_list(request: web.Request) -> web.Response:
    await read_json(request)
    db = request.app["db"]
    decks = await list_decks(db)
    user = current_user(request)
    if user is not None:
        progress_rows = await list_deck_progress(db, user["id"])
        progress_by_slug = {row["deck_slug"]: row for row in progress_rows}
        for deck in decks:
            progress = progress_by_slug.get(deck["slug"])
            if progress is not None:
                deck["progress"] = {
                    "total_cards": progress["total_cards"],
                    "new_cards": progress["new_cards"],
                    "learning_cards": progress["learning_cards"],
                    "review_cards": progress["review_cards"],
                }
    return ok({"decks": decks})


async def decks_get(request: web.Request) -> web.Response:
    payload = await read_json(request)
    slug = _read_required_slug(payload, "slug")
    db = request.app["db"]
    deck = await get_deck_by_slug(db, slug)
    if deck is None:
        raise AppError(404, "not_found", "Deck does not exist.")
    user = current_user(request)
    if user is not None:
        progress_rows = await list_deck_progress(db, user["id"], slug)
        if progress_rows:
            progress = progress_rows[0]
            deck["progress"] = {
                "total_cards": progress["total_cards"],
                "new_cards": progress["new_cards"],
                "learning_cards": progress["learning_cards"],
                "review_cards": progress["review_cards"],
            }
    return ok({"deck": deck})


async def cards_list(request: web.Request) -> web.Response:
    payload = await read_json(request)
    deck_slug = _read_required_slug(payload, "deck_slug")
    limit = _read_non_negative_int(payload, "limit", 50)
    offset = _read_non_negative_int(payload, "offset", 0)
    db = request.app["db"]
    deck = await get_deck_by_slug(db, deck_slug)
    if deck is None:
        raise AppError(404, "not_found", "Deck does not exist.")
    user = current_user(request)
    cards = await list_cards_for_deck(db, deck_slug, limit, offset, user["id"] if user is not None else None)
    return ok(
        {
            "deck": deck,
            "cards": cards,
            "total_count": deck["card_count"],
            "limit": limit,
            "offset": offset,
        }
    )


def setup_deck_routes(app: web.Application) -> None:
    app.router.add_post("/decks/list", decks_list)
    app.router.add_post("/decks/get", decks_get)
    app.router.add_post("/cards/list", cards_list)
