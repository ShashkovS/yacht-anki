"""Handle public JSON endpoints such as the health check.

Edit this file when non-auth app endpoints change.
Copy the route pattern here when you add another small public endpoint group.
"""

from __future__ import annotations

from aiohttp import web

from backend.http.admin_routes import setup_admin_routes
from backend.http.deck_routes import setup_deck_routes
from backend.http.json_api import ok
from backend.http.review_routes import setup_review_routes
from backend.http.settings_routes import setup_settings_routes
from backend.http.stats_routes import setup_stats_routes


async def health(request: web.Request) -> web.Response:
    return ok({"status": "ok"})


def setup_api_routes(app: web.Application) -> None:
    app.router.add_get("/health", health)
    setup_admin_routes(app)
    setup_deck_routes(app)
    setup_review_routes(app)
    setup_settings_routes(app)
    setup_stats_routes(app)
