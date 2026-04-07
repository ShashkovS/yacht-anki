"""Store and load card rows for global deck content.

Edit this file when card fields or card query behavior changes.
Copy this file as a starting point when you add queries for another content table.
"""

from __future__ import annotations

import json
from typing import Any

import aiosqlite

from backend.db.connection import utc_now_text


def _decode_json_text(value: str) -> Any:
    return json.loads(value)


def row_to_card(row: aiosqlite.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    card = {
        "id": row["id"],
        "deck_slug": row["deck_slug"],
        "template_type": row["template_type"],
        "prompt": row["prompt"],
        "answer": row["answer"],
        "explanation": row["explanation"],
        "diagram_spec": _decode_json_text(row["diagram_spec"]),
        "tags": _decode_json_text(row["tags"]),
        "sort_order": row["sort_order"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }
    if "state_phase" in row.keys():
        if row["state_phase"] is None:
            card["state"] = None
        else:
            card["state"] = {
                "phase": row["state_phase"],
                "due_at": row["state_due_at"],
                "last_reviewed_at": row["state_last_reviewed_at"],
                "fsrs_state": _decode_json_text(row["state_fsrs_state_json"]),
            }
    return card


async def create_card(
    db: aiosqlite.Connection,
    deck_id: int,
    slug: str,
    template_type: str,
    prompt: str,
    answer: str,
    explanation: str,
    diagram_spec: dict[str, Any],
    tags: list[str] | None = None,
    sort_order: int = 0,
) -> dict[str, Any]:
    now = utc_now_text()
    cursor = await db.execute(
        """
        INSERT INTO cards (
            deck_id,
            slug,
            template_type,
            prompt,
            answer,
            explanation,
            diagram_spec,
            tags,
            sort_order,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id
        """,
        (
            deck_id,
            slug,
            template_type,
            prompt,
            answer,
            explanation,
            json.dumps(diagram_spec),
            json.dumps(tags or []),
            sort_order,
            now,
            now,
        ),
    )
    row = await cursor.fetchone()
    await db.commit()
    return await get_card_by_id(db, int(row["id"]))


async def get_card_by_deck_and_slug(db: aiosqlite.Connection, deck_id: int, slug: str) -> dict[str, Any] | None:
    cursor = await db.execute(
        """
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
            c.updated_at
        FROM cards AS c
        JOIN decks AS d ON d.id = c.deck_id
        WHERE c.deck_id = ? AND c.slug = ?
        """,
        (deck_id, slug),
    )
    row = await cursor.fetchone()
    return row_to_card(row)


async def update_card(
    db: aiosqlite.Connection,
    deck_id: int,
    slug: str,
    template_type: str,
    prompt: str,
    answer: str,
    explanation: str,
    diagram_spec: dict[str, Any],
    tags: list[str] | None = None,
    sort_order: int = 0,
) -> dict[str, Any]:
    now = utc_now_text()
    cursor = await db.execute(
        """
        UPDATE cards
        SET
            template_type = ?,
            prompt = ?,
            answer = ?,
            explanation = ?,
            diagram_spec = ?,
            tags = ?,
            sort_order = ?,
            updated_at = ?
        WHERE deck_id = ? AND slug = ?
        RETURNING id
        """,
        (
            template_type,
            prompt,
            answer,
            explanation,
            json.dumps(diagram_spec),
            json.dumps(tags or []),
            sort_order,
            now,
            deck_id,
            slug,
        ),
    )
    row = await cursor.fetchone()
    await db.commit()
    return await get_card_by_id(db, int(row["id"]))


async def upsert_card(
    db: aiosqlite.Connection,
    deck_id: int,
    slug: str,
    template_type: str,
    prompt: str,
    answer: str,
    explanation: str,
    diagram_spec: dict[str, Any],
    tags: list[str] | None = None,
    sort_order: int = 0,
) -> dict[str, Any]:
    existing = await get_card_by_deck_and_slug(db, deck_id, slug)
    if existing is None:
        return await create_card(db, deck_id, slug, template_type, prompt, answer, explanation, diagram_spec, tags, sort_order)
    if (
        existing["template_type"] == template_type
        and existing["prompt"] == prompt
        and existing["answer"] == answer
        and existing["explanation"] == explanation
        and existing["diagram_spec"] == diagram_spec
        and existing["tags"] == (tags or [])
        and existing["sort_order"] == sort_order
    ):
        return existing
    return await update_card(db, deck_id, slug, template_type, prompt, answer, explanation, diagram_spec, tags, sort_order)


async def get_card_by_id(db: aiosqlite.Connection, card_id: int) -> dict[str, Any] | None:
    cursor = await db.execute(
        """
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
            c.updated_at
        FROM cards AS c
        JOIN decks AS d ON d.id = c.deck_id
        WHERE c.id = ?
        """,
        (card_id,),
    )
    row = await cursor.fetchone()
    return row_to_card(row)


async def list_cards_for_deck(
    db: aiosqlite.Connection,
    deck_slug: str,
    limit: int,
    offset: int,
    user_id: int | None = None,
) -> list[dict[str, Any]]:
    if user_id is None:
        cursor = await db.execute(
            """
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
                c.updated_at
            FROM cards AS c
            JOIN decks AS d ON d.id = c.deck_id
            WHERE d.slug = ?
            ORDER BY c.sort_order, c.id
            LIMIT ? OFFSET ?
            """,
            (deck_slug, limit, offset),
        )
    else:
        cursor = await db.execute(
            """
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
            FROM cards AS c
            JOIN decks AS d ON d.id = c.deck_id
            LEFT JOIN card_states AS cs ON cs.card_id = c.id AND cs.user_id = ?
            WHERE d.slug = ?
            ORDER BY c.sort_order, c.id
            LIMIT ? OFFSET ?
            """,
            (user_id, deck_slug, limit, offset),
        )
    rows = await cursor.fetchall()
    return [row_to_card(row) for row in rows if row is not None]
