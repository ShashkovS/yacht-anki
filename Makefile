# This file gives short root commands for local development, formatting, and tests.
# Edit this file when students need another common repo command from the project root.
# Copy an existing target pattern here when you add another simple root command.
.DEFAULT_GOAL := help

.PHONY: help setup back back-once front open format test

help:
	@printf "Available commands:\n"
	@printf "  make setup   Install deps and create local env files\n"
	@printf "  make back    Run the backend server with auto-reload\n"
	@printf "  make back-once Run the backend server without auto-reload\n"
	@printf "  make front   Run the frontend dev server\n"
	@printf "  make open    Open the frontend in a browser\n"
	@printf "  make format  Format backend and frontend code\n"
	@printf "  make test    Run backend, frontend unit, and e2e tests\n"

setup:
	uv sync --all-groups
	cd frontend && npm install
	test -f .env || cp .env.example .env
	cd frontend && test -f .env.development.local || cp .env.example .env.development.local

back:
	APP_HOST=localhost FRONTEND_ORIGIN=http://localhost:5173 uv run python -m backend.dev

back-once:
	APP_HOST=localhost FRONTEND_ORIGIN=http://localhost:5173 uv run python -m backend.main

front:
	cd frontend && VITE_BACKEND_URL=http://localhost:8000 npm run dev -- --host localhost --port 5173

open:
	open http://localhost:5173

format:
	uv run ruff format .
	cd frontend && npm run format
	cd frontend && npm exec eslint . --fix

test:
	uv run pytest
	cd frontend && npm run test
	cd frontend && npm run test:e2e
