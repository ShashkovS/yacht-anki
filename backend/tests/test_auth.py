"""Test backend auth flows, cookies, and auth-related CORS behavior.

Edit this file when login, refresh, logout, or current-user auth rules change.
Copy a test pattern here when you add another auth endpoint or auth edge case.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from yarl import URL

from backend.auth.passwords import hash_password, verify_password
from backend.auth.tokens import build_access_token
from backend.config import DEFAULT_COOKIE_SECRET, Settings
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
async def test_login_success_and_me(client, create_user, auth_headers, extract_cookie) -> None:
    await create_user("user", "user")
    response = await client.post("/auth/login", json={"username": "user", "password": "user"}, headers=auth_headers)
    assert response.status == 200
    payload = await response.json()
    assert payload["ok"] is True
    assert payload["data"]["user"]["username"] == "user"
    assert extract_cookie(client, "template_session", "/") == "1"

    me_response = await client.post("/auth/me", json={})
    assert me_response.status == 200
    me_payload = await me_response.json()
    assert me_payload["data"]["user"]["username"] == "user"


@pytest.mark.asyncio
async def test_login_invalid_credentials(client, create_user, auth_headers) -> None:
    await create_user("user", "user")
    response = await client.post("/auth/login", json={"username": "user", "password": "wrong"}, headers=auth_headers)
    assert response.status == 401


@pytest.mark.asyncio
async def test_auth_me_requires_login(client) -> None:
    response = await client.post("/auth/me", json={})
    assert response.status == 401


@pytest.mark.asyncio
async def test_tampered_access_cookie_returns_401(client, create_user, auth_headers, extract_cookie) -> None:
    await create_user("user", "user")
    await login(client, "user", "user", auth_headers)
    access_cookie = extract_cookie(client, "template_access", "/")

    response = await client.post("/auth/me", json={}, cookies={"template_access": f"{access_cookie}tampered"})
    assert response.status == 401


@pytest.mark.asyncio
async def test_expired_access_cookie_returns_401(client, create_user) -> None:
    await create_user("user", "user")
    expired_settings = Settings(
        mode="test",
        host="127.0.0.1",
        port=8081,
        db_path=client.app["settings"].db_path,
        cookie_secret=client.app["settings"].cookie_secret,
        frontend_origin=client.app["settings"].frontend_origin,
        access_ttl_seconds=-1,
    )
    expired_token = build_access_token(
        expired_settings,
        {
            "id": 1,
            "username": "user",
            "is_admin": False,
        },
    )

    response = await client.post("/auth/me", json={}, cookies={"template_access": expired_token})
    assert response.status == 401


@pytest.mark.asyncio
async def test_auth_error_keeps_cors_headers_for_localhost_origin(client) -> None:
    response = await client.post("/auth/me", json={}, headers={"Origin": "http://localhost:5173"})
    assert response.status == 401
    assert response.headers["Access-Control-Allow-Origin"] == "http://localhost:5173"
    assert response.headers["Access-Control-Allow-Credentials"] == "true"


@pytest.mark.asyncio
async def test_non_json_login_request_returns_400(client, create_user, auth_headers) -> None:
    await create_user("user", "user")

    response = await client.post(
        "/auth/login",
        data="username=user&password=user",
        headers={"Origin": "http://127.0.0.1:5173", "Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status == 400


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
async def test_refresh_reuse_revokes_session(client, create_user, auth_headers, extract_cookie, db) -> None:
    await create_user("user", "user")
    await login(client, "user", "user", auth_headers)
    first_refresh = extract_cookie(client, "template_refresh")

    refresh_response = await client.post("/auth/refresh", json={}, headers=auth_headers)
    assert refresh_response.status == 200
    assert await count_sessions(db) == 1

    invalid_response = await client.post(
        "/auth/refresh",
        json={},
        headers=auth_headers,
        cookies={"template_refresh": first_refresh},
    )
    assert invalid_response.status == 401
    assert await count_sessions(db) == 0


@pytest.mark.asyncio
async def test_expired_refresh_session_returns_401_and_deletes_session(client, create_user, auth_headers, db) -> None:
    await create_user("user", "user")
    await login(client, "user", "user", auth_headers)
    assert await count_sessions(db) == 1

    expired_at = (datetime.now(tz=UTC) - timedelta(minutes=1)).isoformat(timespec="seconds")
    await db.execute("UPDATE refresh_sessions SET expires_at = ? WHERE id IS NOT NULL", (expired_at,))
    await db.commit()

    response = await client.post("/auth/refresh", json={}, headers=auth_headers)
    assert response.status == 401
    assert await count_sessions(db) == 0


@pytest.mark.asyncio
async def test_logout_removes_refresh_session(client, create_user, auth_headers, db) -> None:
    await create_user("user", "user")
    await login(client, "user", "user", auth_headers)
    assert await count_sessions(db) == 1

    response = await client.post("/auth/logout", json={}, headers=auth_headers)
    assert response.status == 200
    assert await count_sessions(db) == 0
    cookies = client.session.cookie_jar.filter_cookies(URL("http://127.0.0.1:8081/"))
    assert "template_session" not in cookies


@pytest.mark.asyncio
async def test_dev_seed_only_creates_missing_users(tmp_path, monkeypatch) -> None:
    settings = Settings(
        mode="dev",
        host="127.0.0.1",
        port=8081,
        db_path=tmp_path / "seed.sqlite3",
        cookie_secret="test-secret",
        frontend_origin="http://127.0.0.1:5173",
    )
    app = create_app(settings)
    calls: list[str] = []

    def fake_hash_password(password: str) -> str:
        calls.append(password)
        return f"hashed:{password}"

    monkeypatch.setattr("backend.db.seed.hash_password", fake_hash_password)

    try:
        await on_startup(app)
        assert calls == ["user", "admin"]
        await seed_dev_data(app["db"], settings)
        users = await list_users(app["db"])
        assert [user["username"] for user in users] == ["user", "admin"]
        assert calls == ["user", "admin"]
    finally:
        await on_cleanup(app)


def test_create_app_refuses_default_secret_in_prod(tmp_path) -> None:
    settings = Settings(
        mode="prod",
        host="127.0.0.1",
        port=8081,
        db_path=tmp_path / "prod.sqlite3",
        cookie_secret=DEFAULT_COOKIE_SECRET,
        frontend_origin="http://127.0.0.1:5173",
    )

    with pytest.raises(ValueError, match="default COOKIE_SECRET"):
        create_app(settings)
