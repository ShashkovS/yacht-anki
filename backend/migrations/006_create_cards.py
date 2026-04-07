"""Create the cards table for deck content and diagram JSON.

Edit this file only if this migration has not been used yet.
Create a new migration file instead when you need another schema change.
"""

from yoyo import step


steps = [
    step(
        """
        CREATE TABLE cards (
            id INTEGER PRIMARY KEY,
            deck_id INTEGER NOT NULL,
            template_type TEXT NOT NULL CHECK (
                template_type IN ('term_definition', 'directional', 'trim', 'manoeuvre', 'right_of_way')
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
        ) STRICT
        """,
        "DROP TABLE cards",
    ),
    step(
        "CREATE INDEX idx_cards_deck_sort ON cards (deck_id, sort_order, id)",
        "DROP INDEX idx_cards_deck_sort",
    ),
]
