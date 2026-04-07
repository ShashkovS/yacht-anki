"""Add stable slugs to cards for builtin content upserts.

Edit this file only if this migration has not been used yet.
Create a new migration file instead when you need another schema change.
"""

from yoyo import step


steps = [
    step(
        "ALTER TABLE cards ADD COLUMN slug TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE cards DROP COLUMN slug",
    ),
    step(
        "UPDATE cards SET slug = printf('card-%d', id) WHERE slug = ''",
        "UPDATE cards SET slug = '' WHERE slug LIKE 'card-%'",
    ),
    step(
        "CREATE UNIQUE INDEX idx_cards_deck_slug ON cards (deck_id, slug)",
        "DROP INDEX idx_cards_deck_slug",
    ),
]
