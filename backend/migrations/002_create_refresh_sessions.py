from yoyo import step


steps = [
    step(
        """
        CREATE TABLE refresh_sessions (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            token_hash TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            last_used_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        ) STRICT
        """,
        "DROP TABLE refresh_sessions",
    )
]
