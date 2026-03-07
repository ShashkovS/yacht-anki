# DB Agent Notes

- Keep DB code easy enough for students to trace from route to SQL.
- Every table must be created by yoyo migrations in `backend/migrations`.
- Use `STRICT` tables whenever SQLite allows it.
- Store booleans as `INTEGER CHECK (... IN (0, 1))`.
- Keep queries small, named clearly, and close to the table they work with.
- Prefer explicit `INSERT`, `UPDATE`, `DELETE`, and careful `ON CONFLICT`.
- Add or update tests whenever DB schema or query behavior changes, including success paths and important failure paths.
- Start each DB file with a short simple-English docstring that says what table or query group it owns, when to edit it, and whether it can be copied to add another table or query module.
