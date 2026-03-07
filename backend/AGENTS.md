# Backend Agent Notes

- This backend is for students, so code should be obvious on first reading.
- Use `aiohttp`, plain functions, and small modules.
- Keep all SQLite access inside `backend/db`.
- Store timestamps as UTC ISO strings and convert explicitly in Python.
- Use `STRICT` tables, `foreign_keys = ON`, and `journal_mode = WAL`.
- Return only the shared JSON envelope shape.
- Do not introduce ORM, DI, pydantic, or generic service layers.
- Add backend tests for each new endpoint, auth rule, DB branch, and error path that matters.
- If a backend change affects browser behavior, make sure frontend/e2e coverage exists too.
- Start each backend source file with a short simple-English docstring that says what the file does, when to edit it, and whether it can be copied for a similar backend feature.
