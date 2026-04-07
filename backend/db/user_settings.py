"""Store and load per-user spaced-repetition settings.

Edit this file when user setting fields or user setting query behavior changes.
Copy this file as a starting point when you add queries for another per-user settings table.
"""

from __future__ import annotations

from typing import Any

import aiosqlite

from backend.db.connection import utc_now_text


def row_to_user_settings(row: aiosqlite.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    return {
        "desired_retention": row["desired_retention"],
        "new_cards_per_day": row["new_cards_per_day"],
        "reviews_per_day": row["reviews_per_day"],
    }


async def get_user_settings(db: aiosqlite.Connection, user_id: int) -> dict[str, Any] | None:
    cursor = await db.execute(
        """
        SELECT desired_retention, new_cards_per_day, reviews_per_day
        FROM user_settings
        WHERE user_id = ?
        """,
        (user_id,),
    )
    row = await cursor.fetchone()
    return row_to_user_settings(row)


async def ensure_user_settings(db: aiosqlite.Connection, user_id: int) -> dict[str, Any]:
    now = utc_now_text()
    await db.execute(
        """
        INSERT OR IGNORE INTO user_settings (
            user_id,
            desired_retention,
            new_cards_per_day,
            reviews_per_day,
            updated_at
        )
        VALUES (?, 0.90, 10, NULL, ?)
        """,
        (user_id, now),
    )
    await db.commit()
    settings = await get_user_settings(db, user_id)
    if settings is None:
        raise ValueError("User settings were not created.")
    return settings


async def save_user_settings(
    db: aiosqlite.Connection,
    user_id: int,
    desired_retention: float,
    new_cards_per_day: int,
    reviews_per_day: int | None,
) -> dict[str, Any]:
    now = utc_now_text()
    await db.execute(
        """
        INSERT INTO user_settings (
            user_id,
            desired_retention,
            new_cards_per_day,
            reviews_per_day,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            desired_retention = excluded.desired_retention,
            new_cards_per_day = excluded.new_cards_per_day,
            reviews_per_day = excluded.reviews_per_day,
            updated_at = excluded.updated_at
        """,
        (user_id, desired_retention, new_cards_per_day, reviews_per_day, now),
    )
    await db.commit()
    settings = await get_user_settings(db, user_id)
    if settings is None:
        raise ValueError("User settings were not saved.")
    return settings
