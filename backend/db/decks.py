"""Store and load deck rows for global training decks.

Edit this file when deck fields or deck query behavior changes.
Copy this file as a starting point when you add queries for another content table.
"""

from __future__ import annotations

from typing import Any

import aiosqlite

from backend.db.connection import utc_now_text


def row_to_deck(row: aiosqlite.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    deck = {
        "id": row["id"],
        "slug": row["slug"],
        "title": row["title"],
        "description": row["description"],
        "builtin": bool(row["builtin"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }
    if "card_count" in row.keys():
        deck["card_count"] = int(row["card_count"])
    return deck


async def create_deck(
    db: aiosqlite.Connection,
    slug: str,
    title: str,
    description: str,
    builtin: bool = True,
) -> dict[str, Any]:
    now = utc_now_text()
    cursor = await db.execute(
        """
        INSERT INTO decks (slug, title, description, builtin, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        RETURNING id, slug, title, description, builtin, created_at, updated_at
        """,
        (slug, title, description, int(builtin), now, now),
    )
    row = await cursor.fetchone()
    await db.commit()
    return row_to_deck(row)


async def update_deck(
    db: aiosqlite.Connection,
    slug: str,
    title: str,
    description: str,
    builtin: bool = True,
) -> dict[str, Any]:
    now = utc_now_text()
    cursor = await db.execute(
        """
        UPDATE decks
        SET title = ?, description = ?, builtin = ?, updated_at = ?
        WHERE slug = ?
        RETURNING id, slug, title, description, builtin, created_at, updated_at
        """,
        (title, description, int(builtin), now, slug),
    )
    row = await cursor.fetchone()
    await db.commit()
    return row_to_deck(row)


async def upsert_deck(
    db: aiosqlite.Connection,
    slug: str,
    title: str,
    description: str,
    builtin: bool = True,
) -> dict[str, Any]:
    existing = await get_deck_by_slug(db, slug)
    if existing is None:
        return await create_deck(db, slug, title, description, builtin)
    if (
        existing["title"] == title
        and existing["description"] == description
        and existing["builtin"] == bool(builtin)
    ):
        return existing
    return await update_deck(db, slug, title, description, builtin)


async def list_decks(db: aiosqlite.Connection) -> list[dict[str, Any]]:
    cursor = await db.execute(
        """
        SELECT
            d.id,
            d.slug,
            d.title,
            d.description,
            d.builtin,
            d.created_at,
            d.updated_at,
            COUNT(c.id) AS card_count
        FROM decks AS d
        LEFT JOIN cards AS c ON c.deck_id = d.id
        GROUP BY d.id
        ORDER BY d.id
        """
    )
    rows = await cursor.fetchall()
    return [row_to_deck(row) for row in rows if row is not None]


async def get_deck_by_slug(db: aiosqlite.Connection, slug: str) -> dict[str, Any] | None:
    cursor = await db.execute(
        """
        SELECT
            d.id,
            d.slug,
            d.title,
            d.description,
            d.builtin,
            d.created_at,
            d.updated_at,
            COUNT(c.id) AS card_count
        FROM decks AS d
        LEFT JOIN cards AS c ON c.deck_id = d.id
        WHERE d.slug = ?
        GROUP BY d.id
        """,
        (slug,),
    )
    row = await cursor.fetchone()
    return row_to_deck(row)
