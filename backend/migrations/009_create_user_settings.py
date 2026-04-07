"""Create the user_settings table for spaced-repetition options.

Edit this file only if this migration has not been used yet.
Create a new migration file instead when you need another schema change.
"""

from yoyo import step


steps = [
    step(
        """
        CREATE TABLE user_settings (
            user_id INTEGER PRIMARY KEY,
            desired_retention REAL NOT NULL DEFAULT 0.90,
            new_cards_per_day INTEGER NOT NULL DEFAULT 10,
            reviews_per_day INTEGER,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            CHECK (desired_retention > 0 AND desired_retention < 1),
            CHECK (new_cards_per_day >= 0),
            CHECK (reviews_per_day IS NULL OR reviews_per_day >= 0)
        ) STRICT
        """,
        "DROP TABLE user_settings",
    )
]
