"""Create the review_log table for answer history.

Edit this file only if this migration has not been used yet.
Create a new migration file instead when you need another schema change.
"""

from yoyo import step


steps = [
    step(
        """
        CREATE TABLE review_log (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            card_id INTEGER NOT NULL,
            rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 4),
            scheduled_days REAL,
            elapsed_days REAL,
            elapsed_ms INTEGER NOT NULL,
            reviewed_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (card_id) REFERENCES cards (id) ON DELETE CASCADE
        ) STRICT
        """,
        "DROP TABLE review_log",
    ),
    step(
        "CREATE INDEX idx_review_log_user_reviewed_at ON review_log (user_id, reviewed_at)",
        "DROP INDEX idx_review_log_user_reviewed_at",
    ),
]
