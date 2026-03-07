from __future__ import annotations

import pytest

from backend.auth.passwords import hash_password, verify_password
from backend.config import Settings
from backend.db.refresh_sessions import count_sessions
from backend.db.seed import seed_dev_data
from backend.db.users import list_users
from backend.main import create_app, on_cleanup, on_startup
from backend.tests.conftest import login


def test_password_hashing() -> None:
    password_hash = hash_password("secret")
    assert password_hash != "secret"
    assert verify_password(password_hash, "secret") is True
    assert verify_password(password_hash, "wrong") is False


@pytest.mark.asyncio
async def test_login_success_and_me(client, create_user, auth_headers) -> None:
    await create_user("user", "user")
    response = await client.post("/auth/login", json={"username": "user", "password": "user"}, headers=auth_headers)
    assert response.status == 200
    payload = await response.json()
    assert payload["ok"] is True
    assert payload["data"]["user"]["username"] == "user"

    me_response = await client.post("/auth/me", json={})
    assert me_response.status == 200


@pytest.mark.asyncio
async def test_login_invalid_credentials(client, create_user, auth_headers) -> None:
    await create_user("user", "user")
    response = await client.post("/auth/login", json={"username": "user", "password": "wrong"}, headers=auth_headers)
    assert response.status == 401


@pytest.mark.asyncio
async def test_requires_auth(client) -> None:
    response = await client.post("/notes/list", json={})
    assert response.status == 401


@pytest.mark.asyncio
async def test_auth_error_keeps_cors_headers_for_localhost_origin(client) -> None:
    response = await client.post("/auth/me", json={}, headers={"Origin": "http://localhost:5173"})
    assert response.status == 401
    assert response.headers["Access-Control-Allow-Origin"] == "http://localhost:5173"
    assert response.headers["Access-Control-Allow-Credentials"] == "true"


@pytest.mark.asyncio
async def test_admin_forbidden_for_normal_user(client, create_user, auth_headers) -> None:
    await create_user("user", "user")
    await login(client, "user", "user", auth_headers)
    response = await client.post("/admin/users/list", json={})
    assert response.status == 403


@pytest.mark.asyncio
async def test_refresh_rotates_token(client, create_user, auth_headers, extract_cookie) -> None:
    await create_user("user", "user")
    await login(client, "user", "user", auth_headers)
    first_refresh = extract_cookie(client, "template_refresh")

    refresh_response = await client.post("/auth/refresh", json={}, headers=auth_headers)
    assert refresh_response.status == 200
    second_refresh = extract_cookie(client, "template_refresh")
    assert second_refresh != first_refresh

    invalid_response = await client.post(
        "/auth/refresh",
        json={},
        headers=auth_headers,
        cookies={"template_refresh": first_refresh},
    )
    assert invalid_response.status == 401


@pytest.mark.asyncio
async def test_logout_removes_refresh_session(client, create_user, auth_headers, db) -> None:
    await create_user("user", "user")
    await login(client, "user", "user", auth_headers)
    assert await count_sessions(db) == 1

    response = await client.post("/auth/logout", json={}, headers=auth_headers)
    assert response.status == 200
    assert await count_sessions(db) == 0


@pytest.mark.asyncio
async def test_dev_seed_only_creates_missing_users(tmp_path) -> None:
    settings = Settings(
        mode="dev",
        host="127.0.0.1",
        port=8081,
        db_path=tmp_path / "seed.sqlite3",
        cookie_secret="test-secret",
        frontend_origin="http://127.0.0.1:5173",
    )
    app = create_app(settings)
    try:
        await on_startup(app)
        await seed_dev_data(app["db"], settings)
        users = await list_users(app["db"])
        assert [user["username"] for user in users] == ["user", "admin"]
    finally:
        await on_cleanup(app)
