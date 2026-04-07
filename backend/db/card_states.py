"""Store user card states and build review-ready card lists.

Edit this file when card-state fields or queue query behavior changes.
Copy this file as a starting point when you add queries for another per-user content table.
"""

from __future__ import annotations

import json
from typing import Any

import aiosqlite

from backend.db.cards import row_to_card
from backend.db.connection import parse_utc_text, utc_now_text


def row_to_card_state(row: aiosqlite.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "card_id": row["card_id"],
        "fsrs_state": json.loads(row["fsrs_state_json"]),
        "phase": row["phase"],
        "due_at": row["due_at"],
        "last_reviewed_at": row["last_reviewed_at"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


async def get_card_state(db: aiosqlite.Connection, user_id: int, card_id: int) -> dict[str, Any] | None:
    cursor = await db.execute(
        """
        SELECT id, user_id, card_id, fsrs_state_json, phase, due_at, last_reviewed_at, created_at, updated_at
        FROM card_states
        WHERE user_id = ? AND card_id = ?
        """,
        (user_id, card_id),
    )
    row = await cursor.fetchone()
    return row_to_card_state(row)


async def upsert_card_state(
    db: aiosqlite.Connection,
    user_id: int,
    card_id: int,
    fsrs_state: dict[str, Any],
    phase: str,
    due_at: str,
    last_reviewed_at: str,
    *,
    commit: bool = True,
) -> dict[str, Any]:
    now = utc_now_text()
    cursor = await db.execute(
        """
        INSERT INTO card_states (
            user_id,
            card_id,
            fsrs_state_json,
            phase,
            due_at,
            last_reviewed_at,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, card_id) DO UPDATE SET
            fsrs_state_json = excluded.fsrs_state_json,
            phase = excluded.phase,
            due_at = excluded.due_at,
            last_reviewed_at = excluded.last_reviewed_at,
            updated_at = excluded.updated_at
        RETURNING id, user_id, card_id, fsrs_state_json, phase, due_at, last_reviewed_at, created_at, updated_at
        """,
        (
            user_id,
            card_id,
            json.dumps(fsrs_state),
            phase,
            due_at,
            last_reviewed_at,
            now,
            now,
        ),
    )
    row = await cursor.fetchone()
    if commit:
        await db.commit()
    return row_to_card_state(row)


async def create_card_state(
    db: aiosqlite.Connection,
    user_id: int,
    card_id: int,
    fsrs_state: dict[str, Any],
    phase: str,
    due_at: str,
    last_reviewed_at: str | None = None,
) -> dict[str, Any]:
    reviewed_at = last_reviewed_at or utc_now_text()
    return await upsert_card_state(db, user_id, card_id, fsrs_state, phase, due_at, reviewed_at)


async def list_due_review_cards(
    db: aiosqlite.Connection,
    user_id: int,
    now_text: str,
    deck_slug: str | None,
    limit: int | None,
) -> list[dict[str, Any]]:
    params: list[Any] = [user_id, now_text]
    where = ["cs.user_id = ?", "cs.due_at <= ?"]
    if deck_slug is not None:
        where.append("d.slug = ?")
        params.append(deck_slug)
    limit_clause = ""
    if limit is not None:
        limit_clause = "LIMIT ?"
        params.append(limit)
    cursor = await db.execute(
        f"""
        SELECT
            c.id,
            d.slug AS deck_slug,
            c.template_type,
            c.prompt,
            c.answer,
            c.explanation,
            c.diagram_spec,
            c.tags,
            c.sort_order,
            c.created_at,
            c.updated_at,
            cs.phase AS state_phase,
            cs.due_at AS state_due_at,
            cs.last_reviewed_at AS state_last_reviewed_at,
            cs.fsrs_state_json AS state_fsrs_state_json
        FROM card_states AS cs
        JOIN cards AS c ON c.id = cs.card_id
        JOIN decks AS d ON d.id = c.deck_id
        WHERE {' AND '.join(where)}
        ORDER BY cs.due_at, c.sort_order, c.id
        {limit_clause}
        """,
        params,
    )
    rows = await cursor.fetchall()
    return [row_to_card(row) for row in rows if row is not None]


async def count_due_review_cards(
    db: aiosqlite.Connection,
    user_id: int,
    now_text: str,
    deck_slug: str | None,
) -> int:
    params: list[Any] = [user_id, now_text]
    where = ["cs.user_id = ?", "cs.due_at <= ?"]
    if deck_slug is not None:
        where.append("d.slug = ?")
        params.append(deck_slug)
    cursor = await db.execute(
        f"""
        SELECT COUNT(*) AS count
        FROM card_states AS cs
        JOIN cards AS c ON c.id = cs.card_id
        JOIN decks AS d ON d.id = c.deck_id
        WHERE {' AND '.join(where)}
        """,
        params,
    )
    row = await cursor.fetchone()
    return int(row["count"]) if row is not None else 0


async def list_new_cards(
    db: aiosqlite.Connection,
    user_id: int,
    deck_slug: str | None,
    limit: int | None,
) -> list[dict[str, Any]]:
    params: list[Any] = [user_id]
    where = ["cs.id IS NULL"]
    if deck_slug is not None:
        where.append("d.slug = ?")
        params.append(deck_slug)
    limit_clause = ""
    if limit is not None:
        limit_clause = "LIMIT ?"
        params.append(limit)
    cursor = await db.execute(
        f"""
        SELECT
            c.id,
            d.slug AS deck_slug,
            c.template_type,
            c.prompt,
            c.answer,
            c.explanation,
            c.diagram_spec,
            c.tags,
            c.sort_order,
            c.created_at,
            c.updated_at,
            NULL AS state_phase,
            NULL AS state_due_at,
            NULL AS state_last_reviewed_at
        FROM cards AS c
        JOIN decks AS d ON d.id = c.deck_id
        LEFT JOIN card_states AS cs ON cs.card_id = c.id AND cs.user_id = ?
        WHERE {' AND '.join(where)}
        ORDER BY d.id, c.sort_order, c.id
        {limit_clause}
        """,
        params,
    )
    rows = await cursor.fetchall()
    return [row_to_card(row) for row in rows if row is not None]


async def count_new_cards(db: aiosqlite.Connection, user_id: int, deck_slug: str | None) -> int:
    params: list[Any] = [user_id]
    where = ["cs.id IS NULL"]
    if deck_slug is not None:
        where.append("d.slug = ?")
        params.append(deck_slug)
    cursor = await db.execute(
        f"""
        SELECT COUNT(*) AS count
        FROM cards AS c
        JOIN decks AS d ON d.id = c.deck_id
        LEFT JOIN card_states AS cs ON cs.card_id = c.id AND cs.user_id = ?
        WHERE {' AND '.join(where)}
        """,
        params,
    )
    row = await cursor.fetchone()
    return int(row["count"]) if row is not None else 0


async def list_deck_progress(
    db: aiosqlite.Connection,
    user_id: int,
    deck_slug: str | None = None,
) -> list[dict[str, Any]]:
    params: list[Any] = [user_id]
    where = []
    if deck_slug is not None:
        where.append("d.slug = ?")
        params.append(deck_slug)
    where_clause = f"WHERE {' AND '.join(where)}" if where else ""
    cursor = await db.execute(
        f"""
        SELECT
            d.slug AS deck_slug,
            d.title AS title,
            COUNT(c.id) AS total_cards,
            SUM(CASE WHEN c.id IS NOT NULL AND (cs.id IS NULL OR cs.phase = 'new') THEN 1 ELSE 0 END) AS new_cards,
            SUM(CASE WHEN cs.phase IN ('learning', 'relearning') THEN 1 ELSE 0 END) AS learning_cards,
            SUM(CASE WHEN cs.phase = 'review' THEN 1 ELSE 0 END) AS review_cards
        FROM decks AS d
        LEFT JOIN cards AS c ON c.deck_id = d.id
        LEFT JOIN card_states AS cs ON cs.card_id = c.id AND cs.user_id = ?
        {where_clause}
        GROUP BY d.id
        ORDER BY d.id
        """,
        params,
    )
    rows = await cursor.fetchall()
    return [
        {
            "deck_slug": row["deck_slug"],
            "title": row["title"],
            "total_cards": int(row["total_cards"] or 0),
            "new_cards": int(row["new_cards"] or 0),
            "learning_cards": int(row["learning_cards"] or 0),
            "review_cards": int(row["review_cards"] or 0),
        }
        for row in rows
    ]


async def count_studied_cards(db: aiosqlite.Connection, user_id: int, deck_slug: str | None) -> int:
    params: list[Any] = [user_id]
    where = ["cs.user_id = ?"]
    if deck_slug is not None:
        where.append("d.slug = ?")
        params.append(deck_slug)
    cursor = await db.execute(
        f"""
        SELECT COUNT(DISTINCT cs.card_id) AS count
        FROM card_states AS cs
        JOIN cards AS c ON c.id = cs.card_id
        JOIN decks AS d ON d.id = c.deck_id
        WHERE {' AND '.join(where)}
        """,
        params,
    )
    row = await cursor.fetchone()
    return int(row["count"]) if row is not None else 0


def compute_elapsed_days(previous_last_reviewed_at: str | None, reviewed_at: str) -> float | None:
    if previous_last_reviewed_at is None:
        return None
    delta = parse_utc_text(reviewed_at) - parse_utc_text(previous_last_reviewed_at)
    return delta.total_seconds() / 86400
