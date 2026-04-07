"""Handle read-only study statistics endpoints for authenticated users.

Edit this file when stats API behavior or stats payload shape changes.
Copy the route pattern here when you add another small analytics route group.
"""

from __future__ import annotations

from aiohttp import web

from backend.auth.access import require_user
from backend.db.card_states import count_studied_cards, list_deck_progress
from backend.db.review_log import count_streak_days
from backend.db.stats import (
    get_overall_progress,
    get_today_stats,
    list_activity_30d,
    list_hardest_cards,
    list_rating_distribution_30d,
)
from backend.http.json_api import ok, read_json


async def stats_get(request: web.Request) -> web.Response:
    await read_json(request)
    user = require_user(request)
    db = request.app["db"]
    return ok(
        {
            "today": await get_today_stats(db, user["id"]),
            "activity_30d": await list_activity_30d(db, user["id"]),
            "rating_distribution_30d": await list_rating_distribution_30d(db, user["id"]),
            "deck_progress": await list_deck_progress(db, user["id"]),
            "hardest_cards": await list_hardest_cards(db, user["id"]),
            "overall_progress": await get_overall_progress(db, user["id"]),
            "streak_days": await count_streak_days(db, user["id"]),
            "studied_cards_count": await count_studied_cards(db, user["id"], None),
        }
    )


def setup_stats_routes(app: web.Application) -> None:
    app.router.add_post("/stats/get", stats_get)
