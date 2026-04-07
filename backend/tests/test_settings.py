"""Test per-user spaced-repetition settings endpoints.

Edit this file when settings endpoint behavior or settings validation changes.
Copy a test pattern here when you add another per-user settings endpoint.
"""

from __future__ import annotations

import pytest

from backend.tests.conftest import login


@pytest.mark.asyncio
async def test_settings_get_creates_defaults(client, create_user, auth_headers) -> None:
    await create_user("user", "user")
    await login(client, "user", "user", auth_headers)

    response = await client.post("/settings/get", json={})

    assert response.status == 200
    assert (await response.json())["data"] == {
        "desired_retention": 0.9,
        "new_cards_per_day": 10,
        "reviews_per_day": None,
    }


@pytest.mark.asyncio
async def test_settings_save_updates_values(client, create_user, auth_headers) -> None:
    await create_user("user", "user")
    await login(client, "user", "user", auth_headers)

    response = await client.post(
        "/settings/save",
        json={"desired_retention": 0.83, "new_cards_per_day": 12, "reviews_per_day": 55},
        headers=auth_headers,
    )

    assert response.status == 200
    assert (await response.json())["data"] == {
        "desired_retention": 0.83,
        "new_cards_per_day": 12,
        "reviews_per_day": 55,
    }


@pytest.mark.asyncio
async def test_settings_validate_input(client, create_user, auth_headers) -> None:
    await create_user("user", "user")
    await login(client, "user", "user", auth_headers)

    response = await client.post(
        "/settings/save",
        json={"desired_retention": 0.69, "new_cards_per_day": -1, "reviews_per_day": "oops"},
        headers=auth_headers,
    )

    assert response.status == 400
