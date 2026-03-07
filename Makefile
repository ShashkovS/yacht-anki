.DEFAULT_GOAL := help

.PHONY: help back back-once front open format test

help:
	@printf "Available commands:\n"
	@printf "  make back    Run the backend server with auto-reload\n"
	@printf "  make back-once Run the backend server without auto-reload\n"
	@printf "  make front   Run the frontend dev server\n"
	@printf "  make open    Open the frontend in a browser\n"
	@printf "  make format  Format backend and frontend code\n"
	@printf "  make test    Run backend, frontend unit, and e2e tests\n"

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
