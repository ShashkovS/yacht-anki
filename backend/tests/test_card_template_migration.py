"""Test the cards migration that adds the concept template without losing rows.

Edit this file when cards-table migrations or supported template types change.
Copy this test pattern when you add another forward-only migration smoke test.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

from yoyo import get_backend, read_migrations

from backend.db.sqlite_time import sqlite_datetime_codecs


ROOT_DIR = Path(__file__).resolve().parents[2]
MIGRATIONS_PATH = ROOT_DIR / "backend" / "migrations"
LATEST_CARDS_TEMPLATE_MIGRATION = "012_allow_concept_card_template.py"


def _apply_migrations(db_path: Path, *, include_latest: bool) -> None:
    migrations = read_migrations(str(MIGRATIONS_PATH))
    if not include_latest:
        migrations = type(migrations)(
            [migration for migration in migrations if Path(migration.path).name != LATEST_CARDS_TEMPLATE_MIGRATION],
            migrations.post_apply,
        )

    with sqlite_datetime_codecs():
        backend = get_backend(f"sqlite:///{db_path}")
        try:
            with backend.lock():
                backend.apply_migrations(backend.to_apply(migrations))
        finally:
            backend.connection.close()


def test_cards_template_migration_preserves_rows_and_allows_concept(tmp_path: Path) -> None:
    db_path = tmp_path / "migration.sqlite3"
    _apply_migrations(db_path, include_latest=False)

    connection = sqlite3.connect(db_path)
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute(
        """
        INSERT INTO decks (id, slug, title, description, builtin, created_at, updated_at)
        VALUES (1, 'terms', 'Terms', 'Terms deck', 1, '2026-01-01T00:00:00+00:00', '2026-01-01T00:00:00+00:00')
        """
    )
    connection.execute(
        """
        INSERT INTO cards (
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
        VALUES (
            1,
            1,
            'term-alpha',
            'term_definition',
            'Prompt',
            'Answer',
            'Explanation',
            '{"version":1,"wind":{"direction_deg":0},"boats":[{"id":"alpha","x":500,"y":350,"heading_deg":45,"sails":{"main":{"state":"trimmed"}}}]}',
            '[]',
            1,
            '2026-01-01T00:00:00+00:00',
            '2026-01-01T00:00:00+00:00'
        )
        """
    )
    connection.commit()
    connection.close()

    _apply_migrations(db_path, include_latest=True)

    connection = sqlite3.connect(db_path)
    row = connection.execute("SELECT slug, template_type, prompt FROM cards WHERE id = 1").fetchone()

    assert row == ("term-alpha", "term_definition", "Prompt")

    connection.execute(
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
        VALUES (
            1,
            'concept-alpha',
            'concept',
            'Concept prompt',
            'Concept answer',
            'Concept explanation',
            '{"version":1,"wind":{"direction_deg":0},"boats":[{"id":"alpha","x":500,"y":350,"heading_deg":180,"sails":{"main":{"state":"eased"}}}],"expected_answer":{"type":"choose_option","options":[{"id":"a","label":"A"},{"id":"b","label":"B"}],"correct_option_id":"a"}}',
            '[]',
            2,
            '2026-01-01T00:00:00+00:00',
            '2026-01-01T00:00:00+00:00'
        )
        """
    )
    connection.commit()

    concept_row = connection.execute("SELECT slug, template_type FROM cards WHERE slug = 'concept-alpha'").fetchone()
    connection.close()

    assert concept_row == ("concept-alpha", "concept")
