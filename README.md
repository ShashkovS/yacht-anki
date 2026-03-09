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

## Project layout

- `backend` backend app, auth, HTTP handlers, WebSocket, DB access, migrations, tests.
- `frontend` frontend app, unit tests, and Playwright tests.
- `backend/db` all SQLite code.

## Start from zero

Preferred way:

```bash
git clone git@github.com:leaders-tech/templatePWA.git templatePWA
cd templatePWA
make setup
```

Manual way:

```bash
git clone git@github.com:leaders-tech/templatePWA.git templatePWA
cd templatePWA
uv sync --all-groups
cd frontend
npm install
cp .env.example .env.development.local
cd ..
cp .env.example .env
```

`make setup` does the same install and env-file setup from the project root.

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
make setup
make back
make back-once
make open
```



## Adding libraries

Python:

- add a runtime package with `uv add package-name`
- add a dev-only package with `uv add --dev package-name`

Frontend:

- add a runtime package with `npm install package-name`
- add a dev-only package with `npm install -D package-name`

Use these commands instead of editing dependency lists by hand.

## Update dependencies

Safe update:

```bash
make deps-update-safe
```

This does:

- backend: runs `uv add --bounds major ...` for all current Python deps, so `pyproject.toml` and `uv.lock` stay inside the current major version
- frontend: runs `npm update`, so `package-lock.json` moves forward inside the current `package.json` semver ranges

Latest update:

```bash
make deps-update-latest
```

This does:

- backend: runs `uv add --bounds lower ...` for all current Python deps, so `pyproject.toml` and `uv.lock` move to the newest available versions

Frontend latest-version bumps are intentionally manual for now:

- `npm-check-updates` is not used by the root commands
- newest frontend version jumps often hit peer dependency conflicts
- for the frontend, use `make deps-update-safe` for the supported automatic path
- if you want a risky latest bump, edit `frontend/package.json` yourself, then run `npm install`, `make test`, and `make test-e2e-docker`

After either command, run:

```bash
make test
make test-e2e-docker
```

## Default dev users

These users are created only in `dev` mode and only if they do not exist:

- `user` / `user`
- `admin` / `admin`

Passwords are stored as Argon2 hashes, never as plain text.
These are tracked example credentials for local development only.

## Security note

This template uses `HttpOnly` cookies with `SameSite=Lax`.
It also checks allowed origins for write endpoints in local dev.
The real simplified CSRF barrier is `SameSite=Lax` cookies plus JSON `POST` requests from JavaScript.
This is intentionally simple and does not include a full CSRF framework.

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

Docker deployment e2e tests:

```bash
cd frontend
npm run test:e2e:docker
```

Or run everything from the repo root:

```bash
make test
```

Docker deployment e2e from the repo root:

```bash
make test-e2e-docker
```

Playwright starts a temporary backend on port `9010`, a temporary frontend on port `4173`, and uses a temporary SQLite database file.
The Docker e2e flow picks free local ports, starts a clean Docker deployment stack, runs the same browser checks against the container build, and removes the test containers when the run finishes.
If an old Docker e2e stack is still alive, the command stops it first and starts a clean one.

## Production note

In production, the frontend build should be served by nginx or Traefik.
The backend should stay behind the same reverse proxy and use secure cookies.
Production is intentionally same-origin in this template. Dev-only CORS exists only for localhost-style frontend/backend splits.

## Docker and Dokploy

Files:

- `backend/Dockerfile` builds the aiohttp backend image.
- `frontend/Dockerfile` builds the static frontend image.
- `frontend/nginx.conf` serves the frontend as a single-page app.
- `docker-compose.yml` connects both containers and keeps SQLite data in a named volume.

Preferred local Docker test:

```bash
make back-docker
make front-docker
make open-docker
```

These `make` commands use Docker in `dev` mode on purpose, so the default demo users are available for quick testing.

Useful Docker commands from the repo root:

```bash
make stop-docker
make clean-docker
```

- `make stop-docker` stops and removes the local Docker test containers.
- `make clean-docker` also removes the named volume and the local images built from `docker-compose.yml`.

Open:

- frontend: `http://localhost:8088`
- backend health: `http://localhost:8089/health`

Manual Docker Compose commands:

```bash
DOCKER_COOKIE_SECRET=change-this-now docker compose build
DOCKER_COOKIE_SECRET=change-this-now docker compose up
```

Container ports are different from local dev ports on purpose:

- frontend container: `8080`
- backend container: `8081`
- published compose ports: `8088` and `8089`

Important env values for Docker and Dokploy:

- `DOCKER_COOKIE_SECRET` must be set to a real secret in production.
- `DOCKER_FRONTEND_ORIGIN` should match the public frontend URL, for example `http://localhost:8088` or your Dokploy URL.
- `DOCKER_VITE_BACKEND_URL` is the public backend URL that the frontend build will call.
- `DOCKER_APP_MODE=prod` is the default.

Quick local Docker demo with default users:

```bash
DOCKER_APP_MODE=dev DOCKER_COOKIE_SECRET=change-this-now docker compose up --build
```

Use this only for local testing. In production, the default demo users should stay disabled.

Important notes:

- The frontend uses `VITE_BACKEND_URL` at build time. If the public backend URL changes, rebuild the frontend image.
- SQLite data is stored in the `sqlite_data` named volume.
- `make back-docker` starts only the backend container.
- `make front-docker` starts the frontend container and also starts the backend dependency if it is not running yet.
- Docker local testing uses different ports only for testing convenience. It is not the recommended production topology for this template.
- This compose file is designed for Dokploy Docker Compose deployment. Set the `DOCKER_*` env values in Dokploy instead of editing the file.
- The Docker e2e helper tries `docker compose` first and falls back to `docker-compose`.
- `npm run test:e2e:docker` always restarts its own Docker test stack before the tests begin and uses free ports so it does not collide with your usual local Docker stack.
