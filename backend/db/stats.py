"""Aggregate per-user study statistics from review and card state tables.

Edit this file when stats payload fields or SQL aggregation rules change.
Copy this file as a starting point when you add another small read-only analytics module.
"""

from __future__ import annotations

from datetime import timedelta
from typing import Any

import aiosqlite

from backend.db.connection import utc_now


def _utc_today_text() -> str:
    return utc_now().date().isoformat()


def _last_30_days_window() -> tuple[str, str]:
    today = utc_now().date()
    start_day = today - timedelta(days=29)
    return start_day.isoformat(), today.isoformat()


async def get_today_stats(db: aiosqlite.Connection, user_id: int) -> dict[str, Any]:
    today = _utc_today_text()
    row = await (
        await db.execute(
            """
            SELECT COUNT(*) AS review_count, AVG(rating) AS average_rating
            FROM review_log
            WHERE user_id = ? AND substr(reviewed_at, 1, 10) = ?
            """,
            (user_id, today),
        )
    ).fetchone()
    average_rating = None
    if row is not None and row["average_rating"] is not None:
        average_rating = round(float(row["average_rating"]), 2)
    return {
        "review_count": int(row["review_count"] or 0) if row is not None else 0,
        "average_rating": average_rating,
    }


async def list_activity_30d(db: aiosqlite.Connection, user_id: int) -> list[dict[str, Any]]:
    start_day, end_day = _last_30_days_window()
    rows = await (
        await db.execute(
            """
            SELECT substr(reviewed_at, 1, 10) AS review_day, COUNT(*) AS review_count
            FROM review_log
            WHERE user_id = ? AND substr(reviewed_at, 1, 10) >= ? AND substr(reviewed_at, 1, 10) <= ?
            GROUP BY review_day
            ORDER BY review_day
            """,
            (user_id, start_day, end_day),
        )
    ).fetchall()
    counts_by_day = {str(row["review_day"]): int(row["review_count"] or 0) for row in rows}
    start = utc_now().date() - timedelta(days=29)
    return [
        {
            "day": (start + timedelta(days=offset)).isoformat(),
            "review_count": counts_by_day.get((start + timedelta(days=offset)).isoformat(), 0),
        }
        for offset in range(30)
    ]


async def list_rating_distribution_30d(db: aiosqlite.Connection, user_id: int) -> list[dict[str, Any]]:
    start_day, end_day = _last_30_days_window()
    rows = await (
        await db.execute(
            """
            SELECT rating, COUNT(*) AS rating_count
            FROM review_log
            WHERE user_id = ? AND substr(reviewed_at, 1, 10) >= ? AND substr(reviewed_at, 1, 10) <= ?
            GROUP BY rating
            ORDER BY rating
            """,
            (user_id, start_day, end_day),
        )
    ).fetchall()
    counts_by_rating = {int(row["rating"]): int(row["rating_count"] or 0) for row in rows}
    return [{"rating": rating, "count": counts_by_rating.get(rating, 0)} for rating in (1, 2, 3, 4)]


async def list_hardest_cards(db: aiosqlite.Connection, user_id: int, limit: int = 10) -> list[dict[str, Any]]:
    rows = await (
        await db.execute(
            """
            SELECT
                c.id AS card_id,
                d.slug AS deck_slug,
                d.title AS deck_title,
                c.prompt AS prompt,
                SUM(CASE WHEN rl.rating = 1 THEN 1 ELSE 0 END) AS again_count,
                COUNT(*) AS review_count
            FROM review_log AS rl
            JOIN cards AS c ON c.id = rl.card_id
            JOIN decks AS d ON d.id = c.deck_id
            WHERE rl.user_id = ?
            GROUP BY c.id
            HAVING SUM(CASE WHEN rl.rating = 1 THEN 1 ELSE 0 END) > 0
            ORDER BY again_count DESC, review_count DESC, c.id ASC
            LIMIT ?
            """,
            (user_id, limit),
        )
    ).fetchall()
    return [
        {
            "card_id": int(row["card_id"]),
            "deck_slug": str(row["deck_slug"]),
            "deck_title": str(row["deck_title"]),
            "prompt": str(row["prompt"]),
            "again_count": int(row["again_count"] or 0),
            "review_count": int(row["review_count"] or 0),
        }
        for row in rows
    ]


async def get_overall_progress(db: aiosqlite.Connection, user_id: int) -> dict[str, Any]:
    row = await (
        await db.execute(
            """
            SELECT
                (SELECT COUNT(*) FROM cards) AS total_cards,
                (
                    SELECT COUNT(*)
                    FROM card_states
                    WHERE user_id = ? AND phase = 'review'
                ) AS review_cards
            """,
            (user_id,),
        )
    ).fetchone()
    total_cards = int(row["total_cards"] or 0) if row is not None else 0
    review_cards = int(row["review_cards"] or 0) if row is not None else 0
    percent_review = round((review_cards * 100 / total_cards), 1) if total_cards > 0 else 0.0
    return {
        "review_cards": review_cards,
        "total_cards": total_cards,
        "percent_review": percent_review,
    }
