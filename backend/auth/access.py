from __future__ import annotations

from typing import Any

from aiohttp import web

from backend.auth.tokens import read_access_token
from backend.config import Settings
from backend.http.json_api import AppError


def current_user(request: web.Request) -> dict[str, Any] | None:
    cached_user = request.get("current_user")
    if cached_user is not None:
        return cached_user
    settings: Settings = request.app["settings"]
    token = request.cookies.get(settings.access_cookie_name)
    if not token:
        return None
    user = read_access_token(settings, token)
    request["current_user"] = user
    return user


def require_user(request: web.Request) -> dict[str, Any]:
    user = current_user(request)
    if user is None:
        raise AppError(401, "not_authenticated", "Login is required.")
    return user


def require_admin(request: web.Request) -> dict[str, Any]:
    user = require_user(request)
    if not user["is_admin"]:
        raise AppError(403, "not_allowed", "Admin access is required.")
    return user
