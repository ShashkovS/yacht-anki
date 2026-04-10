#!/bin/sh
# This script runs Docker e2e tests from start to finish with one fixed test stack.
# Edit this file when docker e2e ports, startup checks, or cleanup rules change.
# Copy this script pattern when you add another full test command that needs setup and cleanup.

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
FRONTEND_DIR=$(CDPATH= cd -- "${SCRIPT_DIR}/.." && pwd)
REPO_DIR=$(CDPATH= cd -- "${FRONTEND_DIR}/.." && pwd)
COMPOSE_SCRIPT="${REPO_DIR}/scripts/docker-compose.sh"
DOCKER_ENV_FILE="${REPO_DIR}/.docker.env"

if [ ! -f "${DOCKER_ENV_FILE}" ]; then
  printf '%s\n' "Docker config file .docker.env was not found. Run make setup first." >&2
  exit 1
fi

set -a
. "${DOCKER_ENV_FILE}"
set +a

: "${DOCKER_E2E_PROJECT_NAME:?Missing DOCKER_E2E_PROJECT_NAME in .docker.env.}"
: "${DOCKER_E2E_APP_MODE:?Missing DOCKER_E2E_APP_MODE in .docker.env.}"
: "${DOCKER_E2E_COOKIE_SECRET:?Missing DOCKER_E2E_COOKIE_SECRET in .docker.env.}"
: "${DOCKER_E2E_FRONTEND_PORT:?Missing DOCKER_E2E_FRONTEND_PORT in .docker.env.}"
: "${DOCKER_E2E_BACKEND_PORT:?Missing DOCKER_E2E_BACKEND_PORT in .docker.env.}"
: "${DOCKER_E2E_FRONTEND_ORIGIN:?Missing DOCKER_E2E_FRONTEND_ORIGIN in .docker.env.}"
: "${DOCKER_E2E_VITE_BACKEND_URL:?Missing DOCKER_E2E_VITE_BACKEND_URL in .docker.env.}"
: "${DOCKER_E2E_FRONTEND_URL:?Missing DOCKER_E2E_FRONTEND_URL in .docker.env.}"

PROJECT_NAME="${DOCKER_E2E_PROJECT_NAME}"
export DOCKER_PROJECT_NAME="${DOCKER_E2E_PROJECT_NAME}"
export DOCKER_APP_MODE="${DOCKER_E2E_APP_MODE}"
export DOCKER_COOKIE_SECRET="${DOCKER_E2E_COOKIE_SECRET}"
export DOCKER_FRONTEND_PORT="${DOCKER_E2E_FRONTEND_PORT}"
export DOCKER_BACKEND_PORT="${DOCKER_E2E_BACKEND_PORT}"
export DOCKER_FRONTEND_ORIGIN="${DOCKER_E2E_FRONTEND_ORIGIN}"
export DOCKER_VITE_BACKEND_URL="${DOCKER_E2E_VITE_BACKEND_URL}"
export PW_DOCKER_FRONTEND_URL="${DOCKER_E2E_FRONTEND_URL}"

cleanup() {
  "${COMPOSE_SCRIPT}" --env-file "${DOCKER_ENV_FILE}" -p "${PROJECT_NAME}" -f "${REPO_DIR}/docker-compose.yml" down -v --remove-orphans >/dev/null 2>&1 || true
}

wait_for_frontend() {
  i=0
  while [ "$i" -lt 60 ]; do
    if curl -fsS "${PW_DOCKER_FRONTEND_URL}" >/dev/null 2>&1; then
      return 0
    fi
    i=$((i + 1))
    sleep 1
  done

  printf '%s\n' "Docker frontend did not start on ${PW_DOCKER_FRONTEND_URL}." >&2
  return 1
}

trap cleanup EXIT INT TERM

cleanup
"${COMPOSE_SCRIPT}" --env-file "${DOCKER_ENV_FILE}" -p "${PROJECT_NAME}" -f "${REPO_DIR}/docker-compose.yml" up -d --build --remove-orphans
wait_for_frontend

cd "${FRONTEND_DIR}"
npx playwright test -c playwright.docker.config.ts "$@"
