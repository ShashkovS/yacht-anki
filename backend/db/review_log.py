"""Store review log rows and compute review-day streaks.

Edit this file when review-log fields or review-history query behavior changes.
Copy this file as a starting point when you add queries for another history table.
"""

from __future__ import annotations

from datetime import timedelta

import aiosqlite

from backend.db.connection import utc_now, utc_now_text


async def create_review_log(
    db: aiosqlite.Connection,
    user_id: int,
    card_id: int,
    rating: int,
    scheduled_days: float | None,
    elapsed_days: float | None,
    elapsed_ms: int,
    reviewed_at: str | None = None,
    client_event_id: str | None = None,
    *,
    commit: bool = True,
) -> None:
    effective_reviewed_at = reviewed_at or utc_now_text()
    await db.execute(
        """
        INSERT INTO review_log (
            user_id,
            card_id,
            rating,
            scheduled_days,
            elapsed_days,
            elapsed_ms,
            reviewed_at,
            client_event_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (user_id, card_id, rating, scheduled_days, elapsed_days, elapsed_ms, effective_reviewed_at, client_event_id),
    )
    if commit:
        await db.commit()


async def get_review_log_by_client_event_id(
    db: aiosqlite.Connection,
    user_id: int,
    client_event_id: str,
) -> dict[str, object] | None:
    cursor = await db.execute(
        """
        SELECT id, user_id, card_id, rating, scheduled_days, elapsed_days, elapsed_ms, reviewed_at, client_event_id
        FROM review_log
        WHERE user_id = ? AND client_event_id = ?
        """,
        (user_id, client_event_id),
    )
    row = await cursor.fetchone()
    if row is None:
        return None
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "card_id": row["card_id"],
        "rating": row["rating"],
        "scheduled_days": row["scheduled_days"],
        "elapsed_days": row["elapsed_days"],
        "elapsed_ms": row["elapsed_ms"],
        "reviewed_at": row["reviewed_at"],
        "client_event_id": row["client_event_id"],
    }


async def count_streak_days(db: aiosqlite.Connection, user_id: int, deck_slug: str | None = None) -> int:
    params: list[object] = [user_id]
    joins = ""
    where = ["rl.user_id = ?"]
    if deck_slug is not None:
        joins = """
        JOIN cards AS c ON c.id = rl.card_id
        JOIN decks AS d ON d.id = c.deck_id
        """
        where.append("d.slug = ?")
        params.append(deck_slug)
    cursor = await db.execute(
        f"""
        SELECT DISTINCT substr(rl.reviewed_at, 1, 10) AS review_day
        FROM review_log AS rl
        {joins}
        WHERE {' AND '.join(where)}
        ORDER BY review_day DESC
        """,
        params,
    )
    rows = await cursor.fetchall()
    if not rows:
        return 0

    expected_day = utc_now().date()
    streak = 0
    for row in rows:
        review_day = row["review_day"]
        if review_day != expected_day.isoformat():
            if streak == 0:
                return 0
            break
        streak += 1
        expected_day -= timedelta(days=1)
    return streak
