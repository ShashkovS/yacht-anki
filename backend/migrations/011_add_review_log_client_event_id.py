"""Add a client event id to review_log for offline replay deduplication.

Edit this file only if this migration has not been used yet.
Create a new migration file instead when you need another schema change.
"""

from yoyo import step


steps = [
    step(
        "ALTER TABLE review_log ADD COLUMN client_event_id TEXT NULL",
        "UPDATE review_log SET client_event_id = NULL",
    ),
    step(
        """
        CREATE UNIQUE INDEX idx_review_log_client_event_id
        ON review_log (client_event_id)
        WHERE client_event_id IS NOT NULL
        """,
        "DROP INDEX idx_review_log_client_event_id",
    ),
]
