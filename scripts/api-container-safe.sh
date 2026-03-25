#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE="docker-compose"
ACTION="${1:-rebuild}"

ensure_compose() {
  if ! command -v "$COMPOSE" >/dev/null 2>&1; then
    echo "docker-compose is not installed or not available in PATH" >&2
    exit 1
  fi
}

remove_api_container_if_exists() {
  if "$COMPOSE" ps -q api >/dev/null 2>&1; then
    "$COMPOSE" rm -f api >/dev/null 2>&1 || true
  fi
}

ensure_compose

case "$ACTION" in
  build)
    "$COMPOSE" build api
    ;;
  rebuild)
    "$COMPOSE" build api
    remove_api_container_if_exists
    "$COMPOSE" up -d api
    ;;
  restart)
    remove_api_container_if_exists
    "$COMPOSE" up -d api
    ;;
  *)
    echo "Usage: $0 {build|rebuild|restart}" >&2
    exit 1
    ;;
esac
