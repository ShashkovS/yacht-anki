from __future__ import annotations

from aiohttp import WSMsgType, web

from backend.auth.access import require_user
from backend.http.json_api import AppError


async def websocket_handler(request: web.Request) -> web.WebSocketResponse:
    user = require_user(request)
    ws = web.WebSocketResponse(heartbeat=30.0)
    await ws.prepare(request)

    hub = request.app["ws_hub"]
    hub.add(user["id"], ws)
    await ws.send_json({"type": "ws.ready", "user_id": user["id"], "connections": hub.count_for_user(user["id"])})

    try:
        async for message in ws:
            if message.type != WSMsgType.TEXT:
                continue
            data = message.json()
            if not isinstance(data, dict):
                raise AppError(400, "bad_request", "WebSocket message must be an object.")
            message_type = data.get("type")
            if message_type == "ping":
                await ws.send_json({"type": "pong"})
    finally:
        hub.remove(user["id"], ws)

    return ws


def setup_ws_routes(app: web.Application) -> None:
    app.router.add_get("/ws", websocket_handler)
