from __future__ import annotations

import aiosqlite

from backend.auth.passwords import hash_password
from backend.config import Settings
from backend.db.users import create_user_if_missing


async def seed_dev_data(db: aiosqlite.Connection, settings: Settings) -> None:
    if settings.mode != "dev":
        return
    await create_user_if_missing(db, "user", hash_password("user"), False)
    await create_user_if_missing(db, "admin", hash_password("admin"), True)
