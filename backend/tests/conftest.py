"""Provide shared backend test fixtures for the aiohttp test app and test database.

Edit this file when many backend tests need the same fixture or helper.
Copy fixture patterns here when you add another shared backend test helper.
"""

from __future__ import annotations

from collections.abc import AsyncIterator, Awaitable, Callable
from pathlib import Path
from typing import Any

import pytest
from aiohttp.test_utils import TestClient
from yarl import URL

from backend.auth.passwords import hash_password
from backend.config import Settings
from backend.db.cards import create_card
from backend.db.card_states import create_card_state
from backend.db.decks import create_deck
from backend.db.review_log import create_review_log
from backend.db.user_settings import save_user_settings
from backend.db.users import create_user_if_missing
from backend.main import create_app


@pytest.fixture
def test_settings(tmp_path: Path) -> Settings:
    return Settings(
        mode="test",
        host="127.0.0.1",
        port=8081,
        db_path=tmp_path / "test.sqlite3",
        cookie_secret="test-secret",
        frontend_origin="http://127.0.0.1:5173",
    )


@pytest.fixture
async def app(test_settings: Settings):
    return create_app(test_settings)


@pytest.fixture
async def client(aiohttp_client, app) -> TestClient:
    return await aiohttp_client(app)


@pytest.fixture
async def db(app):
    return app["db"]


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {"Origin": "http://127.0.0.1:5173"}


@pytest.fixture
def create_user(db) -> Callable[[str, str, bool], Awaitable[None]]:
    async def _create_user(username: str, password: str, is_admin: bool = False) -> None:
        await create_user_if_missing(db, username, hash_password(password), is_admin)

    return _create_user


@pytest.fixture
def create_deck_row(db) -> Callable[[str, str, str, bool], Awaitable[dict[str, Any]]]:
    async def _create_deck_row(
        slug: str,
        title: str | None = None,
        description: str | None = None,
        builtin: bool = True,
    ) -> dict[str, Any]:
        return await create_deck(
            db,
            slug,
            title or slug.replace("-", " ").title(),
            description or f"{slug} description",
            builtin,
        )

    return _create_deck_row


@pytest.fixture
def create_card_row(db) -> Callable[..., Awaitable[dict[str, Any]]]:
    async def _create_card_row(
        deck_id: int,
        slug: str | None = None,
        template_type: str = "term_definition",
        prompt: str = "Что это за курс?",
        answer: str = "Бейдевинд",
        explanation: str = "Короткое объяснение.",
        diagram_spec: dict[str, Any] | None = None,
        tags: list[str] | None = None,
        sort_order: int = 0,
    ) -> dict[str, Any]:
        return await create_card(
            db,
            deck_id,
            slug or f"card-{sort_order}-{prompt.lower().replace(' ', '-')}",
            template_type,
            prompt,
            answer,
            explanation,
            diagram_spec
            or {
                "version": 1,
                "wind": {"direction_deg": 0},
                "boats": [
                    {
                        "id": "alpha",
                        "x": 500,
                        "y": 350,
                        "heading_deg": 45,
                        "sails": {
                            "main": {"state": "trimmed"},
                            "jib": {"state": "trimmed"},
                        },
                    }
                ],
            },
            tags,
            sort_order,
        )

    return _create_card_row


@pytest.fixture
def create_card_state_row(db) -> Callable[..., Awaitable[dict[str, Any]]]:
    async def _create_card_state_row(
        user_id: int,
        card_id: int,
        fsrs_state: dict[str, Any] | None = None,
        phase: str = "review",
        due_at: str = "2026-01-01T00:00:00+00:00",
        last_reviewed_at: str | None = "2025-12-31T00:00:00+00:00",
    ) -> dict[str, Any]:
        return await create_card_state(
            db,
            user_id,
            card_id,
            fsrs_state or {"difficulty": 5, "stability": 10, "retrievability": 0.9},
            phase,
            due_at,
            last_reviewed_at,
        )

    return _create_card_state_row


@pytest.fixture
def create_review_log_row(db) -> Callable[..., Awaitable[None]]:
    async def _create_review_log_row(
        user_id: int,
        card_id: int,
        rating: int = 3,
        scheduled_days: float | None = 2.0,
        elapsed_days: float | None = 1.0,
        elapsed_ms: int = 4500,
        reviewed_at: str | None = "2026-01-01T12:00:00+00:00",
    ) -> None:
        await create_review_log(db, user_id, card_id, rating, scheduled_days, elapsed_days, elapsed_ms, reviewed_at)

    return _create_review_log_row


@pytest.fixture
def save_user_settings_row(db) -> Callable[[int, float, int, int | None], Awaitable[dict[str, Any]]]:
    async def _save_user_settings_row(
        user_id: int,
        desired_retention: float = 0.90,
        new_cards_per_day: int = 10,
        reviews_per_day: int | None = None,
    ) -> dict[str, Any]:
        return await save_user_settings(db, user_id, desired_retention, new_cards_per_day, reviews_per_day)

    return _save_user_settings_row


@pytest.fixture
def get_user_id(db) -> Callable[[str], Awaitable[int]]:
    async def _get_user_id(username: str) -> int:
        cursor = await db.execute("SELECT id FROM users WHERE username = ?", (username,))
        row = await cursor.fetchone()
        assert row is not None
        return int(row["id"])

    return _get_user_id


@pytest.fixture
def extract_cookie() -> Callable[[TestClient, str, str], str]:
    def _extract_cookie(client: TestClient, name: str, path: str = "/auth/refresh") -> str:
        cookie = client.session.cookie_jar.filter_cookies(URL(f"http://127.0.0.1:8081{path}")).get(name)
        assert cookie is not None
        return cookie.value

    return _extract_cookie


async def login(client: TestClient, username: str, password: str, headers: dict[str, str]) -> None:
    response = await client.post("/auth/login", json={"username": username, "password": password}, headers=headers)
    assert response.status == 200
