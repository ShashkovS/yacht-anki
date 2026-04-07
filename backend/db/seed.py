"""Seed builtin content and dev-only users during app startup.

Edit this file when startup seed orchestration or dev-user bootstrap changes.
Copy the small helper style here when you add another startup seed step.
"""

from __future__ import annotations

import aiosqlite

from backend.auth.passwords import hash_password
from backend.config import Settings
from backend.db.builtin_content import seed_builtin_content
from backend.db.users import create_user_if_missing, user_exists


async def seed_dev_users(db: aiosqlite.Connection, settings: Settings) -> None:
    if settings.mode != "dev":
        return
    if not await user_exists(db, "user"):
        await create_user_if_missing(db, "user", hash_password("user"), False)
    if not await user_exists(db, "admin"):
        await create_user_if_missing(db, "admin", hash_password("admin"), True)


async def seed_startup_data(db: aiosqlite.Connection, settings: Settings) -> None:
    await seed_builtin_content(db)
    await seed_dev_users(db, settings)
