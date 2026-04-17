"""Test the minimal admin-only user creation endpoint.

Edit this file when admin user creation rules or payload validation change.
Copy a test pattern here when you add another admin-only endpoint.
"""

from __future__ import annotations

import pytest

from backend.tests.conftest import login


@pytest.mark.asyncio
async def test_admin_can_create_user_and_new_user_can_log_in(client, create_user, auth_headers) -> None:
    await create_user("admin", "admin", is_admin=True)
    await login(client, "admin", "admin", auth_headers)

    response = await client.post("/admin/users/create", json={"username": "crew", "password": "crew-pass"}, headers=auth_headers)
    assert response.status == 200
    payload = await response.json()
    assert payload["ok"] is True
    assert payload["data"]["user"]["username"] == "crew"
    assert payload["data"]["user"]["is_admin"] is False

    logout_response = await client.post("/auth/logout", json={}, headers=auth_headers)
    assert logout_response.status == 200

    login_response = await client.post("/auth/login", json={"username": "crew", "password": "crew-pass"}, headers=auth_headers)
    assert login_response.status == 200


@pytest.mark.asyncio
async def test_admin_users_create_requires_admin(client, create_user, auth_headers) -> None:
    await create_user("user", "user")
    await login(client, "user", "user", auth_headers)

    response = await client.post("/admin/users/create", json={"username": "crew", "password": "crew-pass"}, headers=auth_headers)
    assert response.status == 403


@pytest.mark.asyncio
async def test_admin_users_create_requires_login(client, auth_headers) -> None:
    response = await client.post("/admin/users/create", json={"username": "crew", "password": "crew-pass"}, headers=auth_headers)
    assert response.status == 401


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("payload", "expected_message"),
    [
        ({"username": "", "password": "crew-pass"}, "Username and password are required."),
        ({"username": "crew", "password": ""}, "Username and password are required."),
        ({"username": "   ", "password": "crew-pass"}, "Username and password are required."),
    ],
)
async def test_admin_users_create_rejects_empty_fields(client, create_user, auth_headers, payload, expected_message) -> None:
    await create_user("admin", "admin", is_admin=True)
    await login(client, "admin", "admin", auth_headers)

    response = await client.post("/admin/users/create", json=payload, headers=auth_headers)
    assert response.status == 400
    body = await response.json()
    assert body["error"]["message"] == expected_message


@pytest.mark.asyncio
async def test_admin_users_create_rejects_duplicate_username(client, create_user, auth_headers) -> None:
    await create_user("admin", "admin", is_admin=True)
    await create_user("crew", "crew-pass")
    await login(client, "admin", "admin", auth_headers)

    response = await client.post("/admin/users/create", json={"username": "crew", "password": "new-pass"}, headers=auth_headers)
    assert response.status == 409
    body = await response.json()
    assert body["error"]["code"] == "username_taken"
