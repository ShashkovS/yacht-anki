"""Allow the concept card template in the cards table.

Edit this file only if this migration has not been used yet.
Create a new migration file instead when you need another schema change.
"""

from yoyo import step


steps = [
    step(
        "PRAGMA foreign_keys = OFF",
        "SELECT 1",
    ),
    step(
        """
        CREATE TABLE cards_new (
            id INTEGER PRIMARY KEY,
            deck_id INTEGER NOT NULL,
            slug TEXT NOT NULL DEFAULT '',
            template_type TEXT NOT NULL CHECK (
                template_type IN ('term_definition', 'directional', 'trim', 'manoeuvre', 'right_of_way', 'concept')
            ),
            prompt TEXT NOT NULL,
            answer TEXT NOT NULL,
            explanation TEXT NOT NULL,
            diagram_spec TEXT NOT NULL,
            tags TEXT NOT NULL DEFAULT '[]',
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (deck_id) REFERENCES decks (id) ON DELETE CASCADE
        ) STRICT;
        """,
        "SELECT 1",
    ),
    step(
        """
        INSERT INTO cards_new (
            id,
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
        SELECT
            id,
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
        FROM cards
        """,
        "SELECT 1",
    ),
    step(
        "DROP INDEX idx_cards_deck_sort",
        "SELECT 1",
    ),
    step(
        "DROP INDEX idx_cards_deck_slug",
        "SELECT 1",
    ),
    step(
        "DROP TABLE cards",
        "SELECT 1",
    ),
    step(
        "ALTER TABLE cards_new RENAME TO cards",
        "SELECT 1",
    ),
    step(
        """
        CREATE INDEX idx_cards_deck_sort ON cards (deck_id, sort_order, id)
        """,
        "SELECT 1",
    ),
    step(
        """
        CREATE UNIQUE INDEX idx_cards_deck_slug ON cards (deck_id, slug)
        """,
        "SELECT 1",
    ),
    step(
        "PRAGMA foreign_keys = ON",
        "SELECT 1",
    ),
]
