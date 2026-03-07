# Template PWA

This repository is a small teaching template for school projects.

- Frontend: Vite, React, Tailwind 4, TypeScript, PWA plugin.
- Backend: aiohttp, SQLite, yoyo migrations, cookie auth, WebSocket.
- Tests: pytest, Vitest, Playwright.

## Main ideas

- Keep the code small and direct.
- Keep SQL in `backend/db`.
- Use simple English in the UI and docs.
- Avoid unnecessary production-style features.

## Default dev users

These users are created only in `dev` mode and only if they do not exist:

- `user` / `user`
- `admin` / `admin`

Passwords are stored as Argon2 hashes, never as plain text.

## Security note

This template uses `HttpOnly` cookies with `SameSite=Lax`.
It also checks allowed origins for write endpoints.
This is intentionally simple and does not include a full CSRF framework.

## Project layout

- `/Users/sergeyshashkov/repos/templatePWA/backend` backend app, auth, HTTP handlers, WebSocket, DB access, migrations, tests.
- `/Users/sergeyshashkov/repos/templatePWA/frontend` frontend app, unit tests, and Playwright tests.
- `/Users/sergeyshashkov/repos/templatePWA/backend/db` all SQLite code.

## First start

1. Copy `.env.example` to `.env`.
2. Install Python packages:

```bash
uv sync --group dev
```

3. Install frontend packages:

```bash
cd frontend
npm install
```

4. Copy the frontend env example:

```bash
cd frontend
cp .env.example .env.development.local
```

## Run in development

Backend:

```bash
uv run python -m backend.main
```

Backend with auto-reload:

```bash
uv run python -m backend.dev
```

Frontend:

```bash
cd frontend
npm run dev
```

Or with the default backend URL already set:

```bash
make front
```

Open:

- frontend: `http://localhost:5173`
- backend: `http://localhost:8000`

The frontend reads the backend address from `VITE_BACKEND_URL`.
`make front` sets `VITE_BACKEND_URL=http://localhost:8000` for local development.
If you run `npm run dev` manually, set it in `frontend/.env.development.local`.
This template does not use Vite proxy rules for API paths.
Use the same hostname on both sides in development.
Do not mix `localhost` and `127.0.0.1` when using cookie auth, or the browser may stop sending the auth cookies.

You can also use:

```bash
make back
make back-once
make open
```

## Format

Python:

```bash
uv run ruff format .
```

Frontend:

```bash
cd frontend
npm run format
```

Or from the repo root:

```bash
make format
```

## Tests

Backend:

```bash
uv run pytest
```

Frontend unit tests:

```bash
cd frontend
npm test
```

E2E tests:

```bash
cd frontend
npm run test:e2e
```

Or run everything from the repo root:

```bash
make test
```

Playwright starts a temporary backend on port `9010`, a temporary frontend on port `4173`, and uses a temporary SQLite database file.

## Production note

In production, the frontend build should be served by nginx or Traefik.
The backend should stay behind the same reverse proxy and use secure cookies.
