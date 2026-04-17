"""Handle small admin-only endpoints such as creating basic user accounts.

Edit this file when admin JSON endpoints change.
Copy the route pattern here when you add another small admin-only route group.
"""

from __future__ import annotations

import sqlite3

from aiohttp import web

from backend.auth.access import require_admin
from backend.auth.passwords import hash_password
from backend.db.users import create_user
from backend.http.json_api import AppError, ok, read_json
from backend.http.middleware import require_allowed_origin


async def admin_users_create(request: web.Request) -> web.Response:
    require_allowed_origin(request)
    require_admin(request)
    payload = await read_json(request)
    username = str(payload.get("username", "")).strip()
    password = str(payload.get("password", ""))
    if not username or not password:
        raise AppError(400, "bad_request", "Username and password are required.")

    try:
        user = await create_user(request.app["db"], username, hash_password(password), False)
    except sqlite3.IntegrityError:
        raise AppError(409, "username_taken", "This username is already taken.") from None
    return ok({"user": user})


def setup_admin_routes(app: web.Application) -> None:
    app.router.add_post("/admin/users/create", admin_users_create)
