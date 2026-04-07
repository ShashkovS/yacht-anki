"""Handle review queue, submit, and summary endpoints.

Edit this file when review API behavior or review payload validation changes.
Copy the route pattern here when you add another small review-related route group.
"""

from __future__ import annotations

from datetime import datetime

from aiohttp import web

from backend.auth.access import require_user
from backend.db.card_states import (
    compute_elapsed_days,
    count_due_review_cards,
    count_new_cards,
    count_studied_cards,
    get_card_state,
    list_deck_progress,
    list_due_review_cards,
    list_new_cards,
    upsert_card_state,
)
from backend.db.cards import get_card_by_id
from backend.db.decks import get_deck_by_slug
from backend.db.review_log import count_streak_days, create_review_log, get_review_log_by_client_event_id
from backend.db.user_settings import ensure_user_settings
from backend.db.connection import parse_utc_text, utc_now_text
from backend.http.json_api import AppError, ok, read_json
from backend.http.middleware import require_allowed_origin


VALID_PHASES = {"new", "learning", "review", "relearning"}


def _read_optional_deck_slug(payload: dict[str, object]) -> str | None:
    value = payload.get("deck_slug")
    if value is None:
        return None
    if not isinstance(value, str) or not value.strip():
        raise AppError(400, "bad_request", "deck_slug must be a non-empty string.")
    return value.strip()


def _read_rating(payload: dict[str, object]) -> int:
    value = payload.get("rating")
    if not isinstance(value, int) or value < 1 or value > 4:
        raise AppError(400, "bad_request", "rating must be an integer from 1 to 4.")
    return value


def _read_card_id(payload: dict[str, object]) -> int:
    value = payload.get("card_id")
    if not isinstance(value, int) or value <= 0:
        raise AppError(400, "bad_request", "card_id must be a positive integer.")
    return value


def _read_phase(payload: dict[str, object]) -> str:
    value = payload.get("phase")
    if not isinstance(value, str) or value not in VALID_PHASES:
        raise AppError(400, "bad_request", "phase must be one of new, learning, review, relearning.")
    return value


def _read_due_at(payload: dict[str, object]) -> str:
    value = payload.get("due_at")
    if not isinstance(value, str):
        raise AppError(400, "bad_request", "due_at must be an ISO datetime string.")
    try:
        datetime.fromisoformat(value)
    except ValueError as error:
        raise AppError(400, "bad_request", "due_at must be an ISO datetime string.") from error
    return value


def _read_reviewed_at(payload: dict[str, object]) -> str:
    value = payload.get("reviewed_at")
    if not isinstance(value, str):
        raise AppError(400, "bad_request", "reviewed_at must be an ISO datetime string.")
    try:
        datetime.fromisoformat(value)
    except ValueError as error:
        raise AppError(400, "bad_request", "reviewed_at must be an ISO datetime string.") from error
    return value


def _read_client_event_id(payload: dict[str, object]) -> str:
    value = payload.get("client_event_id")
    if not isinstance(value, str) or not value.strip():
        raise AppError(400, "bad_request", "client_event_id must be a non-empty string.")
    return value.strip()


def _read_elapsed_ms(payload: dict[str, object]) -> int:
    value = payload.get("elapsed_ms")
    if not isinstance(value, int) or value < 0:
        raise AppError(400, "bad_request", "elapsed_ms must be a non-negative integer.")
    return value


def _read_fsrs_state(payload: dict[str, object]) -> dict[str, object]:
    value = payload.get("fsrs_state")
    if not isinstance(value, dict):
        raise AppError(400, "bad_request", "fsrs_state must be a JSON object.")
    return value


async def _get_known_deck_or_404(request: web.Request, deck_slug: str | None) -> str | None:
    if deck_slug is None:
        return None
    deck = await get_deck_by_slug(request.app["db"], deck_slug)
    if deck is None:
        raise AppError(404, "not_found", "Deck does not exist.")
    return deck_slug


def _apply_limit(count: int, limit: int | None) -> int:
    if limit is None:
        return count
    return min(count, limit)


async def review_queue(request: web.Request) -> web.Response:
    user = require_user(request)
    payload = await read_json(request)
    deck_slug = await _get_known_deck_or_404(request, _read_optional_deck_slug(payload))
    db = request.app["db"]
    settings = await ensure_user_settings(db, user["id"])
    now_text = utc_now_text()

    due_cards = await list_due_review_cards(db, user["id"], now_text, deck_slug, settings["reviews_per_day"])
    new_cards = await list_new_cards(db, user["id"], deck_slug, settings["new_cards_per_day"])

    return ok(
        {
            "cards": due_cards + new_cards,
            "summary": {
                "due_count": len(due_cards),
                "new_count": len(new_cards),
                "deck_slug": deck_slug,
            },
        }
    )


async def review_submit(request: web.Request) -> web.Response:
    require_allowed_origin(request)
    user = require_user(request)
    payload = await read_json(request)
    card_id = _read_card_id(payload)
    rating = _read_rating(payload)
    fsrs_state = _read_fsrs_state(payload)
    phase = _read_phase(payload)
    due_at = _read_due_at(payload)
    reviewed_at = _read_reviewed_at(payload)
    client_event_id = _read_client_event_id(payload)
    elapsed_ms = _read_elapsed_ms(payload)

    db = request.app["db"]
    card = await get_card_by_id(db, card_id)
    if card is None:
        raise AppError(404, "not_found", "Card does not exist.")

    existing_log = await get_review_log_by_client_event_id(db, user["id"], client_event_id)
    if existing_log is not None:
        card_state = await get_card_state(db, user["id"], card_id)
        if card_state is None:
            raise AppError(409, "conflict", "Review event already exists but card state is missing.")
        return ok(
            {
                "card_state": {
                    "card_id": card["id"],
                    "phase": card_state["phase"],
                    "due_at": card_state["due_at"],
                    "last_reviewed_at": card_state["last_reviewed_at"],
                }
            }
        )

    previous_state = await get_card_state(db, user["id"], card_id)
    scheduled_days = (parse_utc_text(due_at) - parse_utc_text(reviewed_at)).total_seconds() / 86400
    elapsed_days = compute_elapsed_days(previous_state["last_reviewed_at"] if previous_state else None, reviewed_at)

    card_state = await upsert_card_state(
        db,
        user["id"],
        card_id,
        fsrs_state,
        phase,
        due_at,
        reviewed_at,
        commit=False,
    )
    await create_review_log(
        db,
        user["id"],
        card_id,
        rating,
        scheduled_days,
        elapsed_days,
        elapsed_ms,
        reviewed_at,
        client_event_id,
        commit=False,
    )
    await db.commit()

    return ok(
        {
            "card_state": {
                "card_id": card["id"],
                "phase": card_state["phase"],
                "due_at": card_state["due_at"],
                "last_reviewed_at": card_state["last_reviewed_at"],
            }
        }
    )


async def review_summary(request: web.Request) -> web.Response:
    user = require_user(request)
    payload = await read_json(request)
    deck_slug = await _get_known_deck_or_404(request, _read_optional_deck_slug(payload))
    db = request.app["db"]
    settings = await ensure_user_settings(db, user["id"])
    now_text = utc_now_text()

    due_count = _apply_limit(
        await count_due_review_cards(db, user["id"], now_text, deck_slug),
        settings["reviews_per_day"],
    )
    new_count = _apply_limit(
        await count_new_cards(db, user["id"], deck_slug),
        settings["new_cards_per_day"],
    )
    studied_cards_count = await count_studied_cards(db, user["id"], deck_slug)
    streak_days = await count_streak_days(db, user["id"], deck_slug)
    deck_progress = await list_deck_progress(db, user["id"], deck_slug)

    return ok(
        {
            "due_count": due_count,
            "new_count": new_count,
            "studied_cards_count": studied_cards_count,
            "streak_days": streak_days,
            "deck_progress": deck_progress,
        }
    )


def setup_review_routes(app: web.Application) -> None:
    app.router.add_post("/review/queue", review_queue)
    app.router.add_post("/review/submit", review_submit)
    app.router.add_post("/review/summary", review_summary)
