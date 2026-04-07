"""Create the card_states table for per-user FSRS progress.

Edit this file only if this migration has not been used yet.
Create a new migration file instead when you need another schema change.
"""

from yoyo import step


steps = [
    step(
        """
        CREATE TABLE card_states (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            card_id INTEGER NOT NULL,
            fsrs_state_json TEXT NOT NULL,
            phase TEXT NOT NULL CHECK (phase IN ('new', 'learning', 'review', 'relearning')),
            due_at TEXT NOT NULL,
            last_reviewed_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (card_id) REFERENCES cards (id) ON DELETE CASCADE,
            UNIQUE (user_id, card_id)
        ) STRICT
        """,
        "DROP TABLE card_states",
    ),
    step(
        "CREATE INDEX idx_card_states_user_due ON card_states (user_id, due_at)",
        "DROP INDEX idx_card_states_user_due",
    ),
]
