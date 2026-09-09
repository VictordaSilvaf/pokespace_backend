#!/usr/bin/env bash
# Manual catalog sync on the VPS (dex + assets). Not part of automatic deploy.
#
# Required env:
#   APP_DIR, COMPOSE_FILE, COMPOSE_ENV_FILE
#
# Optional:
#   SYNC_DEX=1 (default 1)
#   SYNC_ASSETS=1 (default 1)
set -euo pipefail

: "${APP_DIR:?APP_DIR is required}"
: "${COMPOSE_FILE:?COMPOSE_FILE is required}"
: "${COMPOSE_ENV_FILE:?COMPOSE_ENV_FILE is required}"

SYNC_DEX="${SYNC_DEX:-1}"
SYNC_ASSETS="${SYNC_ASSETS:-1}"

cd "${APP_DIR}"

compose() {
  docker compose -f "${COMPOSE_FILE}" --env-file "${COMPOSE_ENV_FILE}" "$@"
}

if [[ "${SYNC_DEX}" == "1" ]]; then
  echo "[catalog] dex-sync"
  compose run --rm --no-deps \
    --entrypoint node \
    -v "${APP_DIR}/assets:/app/assets:ro" \
    -v "${APP_DIR}/scripts:/app/scripts:ro" \
    api ./scripts/catalog/dex-sync.mjs
fi

if [[ "${SYNC_ASSETS}" == "1" ]]; then
  echo "[catalog] assets-sync (as root for host volume writes)"
  compose run --rm --no-deps --user root \
    --entrypoint node \
    -v "${APP_DIR}/assets:/app/assets" \
    -v "${APP_DIR}/scripts:/app/scripts:ro" \
    api ./scripts/assets/sync.mjs
fi

echo "[catalog] done"
