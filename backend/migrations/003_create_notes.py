from yoyo import step


steps = [
    step(
        """
        CREATE TABLE notes (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            text TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        ) STRICT
        """,
        "DROP TABLE notes",
    )
]
