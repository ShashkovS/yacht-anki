"""Handle per-user review setting endpoints.

Edit this file when settings API behavior or settings payload validation changes.
Copy the route pattern here when you add another small user-settings route group.
"""

from __future__ import annotations

from aiohttp import web

from backend.auth.access import require_user
from backend.db.user_settings import ensure_user_settings, save_user_settings
from backend.http.json_api import AppError, ok, read_json
from backend.http.middleware import require_allowed_origin


def _read_desired_retention(payload: dict[str, object]) -> float:
    value = payload.get("desired_retention")
    if not isinstance(value, (int, float)) or value <= 0 or value >= 1:
        raise AppError(400, "bad_request", "desired_retention must be a number between 0 and 1.")
    return float(value)


def _read_limit(payload: dict[str, object], field_name: str) -> int:
    value = payload.get(field_name)
    if not isinstance(value, int) or value < 0:
        raise AppError(400, "bad_request", f"{field_name} must be a non-negative integer.")
    return value


def _read_optional_limit(payload: dict[str, object], field_name: str) -> int | None:
    value = payload.get(field_name)
    if value is None:
        return None
    if not isinstance(value, int) or value < 0:
        raise AppError(400, "bad_request", f"{field_name} must be null or a non-negative integer.")
    return value


async def settings_get(request: web.Request) -> web.Response:
    require_user(request)
    await read_json(request)
    settings = await ensure_user_settings(request.app["db"], request["current_user"]["id"])
    return ok(settings)


async def settings_save(request: web.Request) -> web.Response:
    require_allowed_origin(request)
    user = require_user(request)
    payload = await read_json(request)
    settings = await save_user_settings(
        request.app["db"],
        user["id"],
        _read_desired_retention(payload),
        _read_limit(payload, "new_cards_per_day"),
        _read_optional_limit(payload, "reviews_per_day"),
    )
    return ok(settings)


def setup_settings_routes(app: web.Application) -> None:
    app.router.add_post("/settings/get", settings_get)
    app.router.add_post("/settings/save", settings_save)
