#!/bin/sh
# This script runs Docker e2e tests from start to finish with one fixed test stack.
# Edit this file when docker e2e ports, startup checks, or cleanup rules change.
# Copy this script pattern when you add another full test command that needs setup and cleanup.

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
FRONTEND_DIR=$(CDPATH= cd -- "${SCRIPT_DIR}/.." && pwd)
REPO_DIR=$(CDPATH= cd -- "${FRONTEND_DIR}/.." && pwd)
COMPOSE_SCRIPT="${REPO_DIR}/scripts/docker-compose.sh"
PROJECT_NAME="${PW_DOCKER_PROJECT_NAME:-yachtanki_e2e}"

find_free_ports() {
  python3 -c 'import socket; sockets = []; ports = []; 
for _ in range(1):
    sock = socket.socket()
    sock.bind(("127.0.0.1", 0))
    sockets.append(sock)
    ports.append(str(sock.getsockname()[1]))
print(" ".join(ports))
[sock.close() for sock in sockets]'
}

DEFAULT_PORTS=$(find_free_ports)
DEFAULT_FRONTEND_PORT=$(printf '%s' "${DEFAULT_PORTS}" | awk '{print $1}')

export DOCKER_APP_MODE="${DOCKER_APP_MODE:-dev}"
export DOCKER_COOKIE_SECRET="${DOCKER_COOKIE_SECRET:-playwright-docker-secret}"
export DOCKER_FRONTEND_PORT="${DOCKER_FRONTEND_PORT:-${DEFAULT_FRONTEND_PORT}}"
export DOCKER_FRONTEND_ORIGIN="${DOCKER_FRONTEND_ORIGIN:-http://localhost:${DOCKER_FRONTEND_PORT}}"
export PW_DOCKER_FRONTEND_URL="${PW_DOCKER_FRONTEND_URL:-http://localhost:${DOCKER_FRONTEND_PORT}}"

cleanup() {
  "${COMPOSE_SCRIPT}" -p "${PROJECT_NAME}" -f "${REPO_DIR}/docker-compose.yml" down -v --remove-orphans >/dev/null 2>&1 || true
}

wait_for_stack() {
  i=0
  stable_checks=0
  while [ "$i" -lt 60 ]; do
    if curl -fsS "${PW_DOCKER_FRONTEND_URL}" >/dev/null 2>&1 && curl -fsS "${PW_DOCKER_FRONTEND_URL}/health" >/dev/null 2>&1; then
      stable_checks=$((stable_checks + 1))
      if [ "$stable_checks" -ge 3 ]; then
        return 0
      fi
    else
      stable_checks=0
    fi
    i=$((i + 1))
    sleep 1
  done

  printf '%s\n' "Docker stack did not become stable on ${PW_DOCKER_FRONTEND_URL} and ${PW_DOCKER_FRONTEND_URL}/health." >&2
  return 1
}

trap cleanup EXIT INT TERM

cleanup
"${COMPOSE_SCRIPT}" -p "${PROJECT_NAME}" -f "${REPO_DIR}/docker-compose.yml" up -d --build --remove-orphans
wait_for_stack

cd "${FRONTEND_DIR}"
npx playwright test -c playwright.docker.config.ts "$@"
