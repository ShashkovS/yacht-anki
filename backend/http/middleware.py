from __future__ import annotations

from aiohttp import web

from backend.config import Settings
from backend.http.json_api import AppError, fail


def add_cors_headers(request: web.Request, response: web.StreamResponse) -> web.StreamResponse:
    settings: Settings = request.app["settings"]
    origin = request.headers.get("Origin", "").rstrip("/")
    if settings.mode != "prod" and origin in settings.allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    return response


@web.middleware
async def error_middleware(request: web.Request, handler):
    try:
        return await handler(request)
    except AppError as error:
        return add_cors_headers(request, fail(error.status, error.code, error.message))
    except web.HTTPException as error:
        if error.status >= 400:
            return add_cors_headers(request, fail(error.status, "http_error", error.reason or "Request failed."))
        raise


@web.middleware
async def cors_middleware(request: web.Request, handler):
    if request.method == "OPTIONS":
        response = web.Response(status=204)
    else:
        response = await handler(request)
    return add_cors_headers(request, response)


def require_allowed_origin(request: web.Request) -> None:
    settings: Settings = request.app["settings"]
    origin = request.headers.get("Origin")
    if origin is None:
        return
    if origin.rstrip("/") not in settings.allowed_origins:
        raise AppError(403, "forbidden_origin", "Origin is not allowed.")
