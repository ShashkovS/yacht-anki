"""Handle public JSON endpoints such as the health check.

Edit this file when non-auth app endpoints change.
Copy the route pattern here when you add another small public endpoint group.
"""

from __future__ import annotations

from aiohttp import web

from backend.http.json_api import ok


async def health(request: web.Request) -> web.Response:
    return ok({"status": "ok"})


def setup_api_routes(app: web.Application) -> None:
    app.router.add_get("/health", health)
