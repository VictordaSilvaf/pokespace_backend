#!/usr/bin/env bash
# Idempotent API deploy on the VPS. Never runs `compose down -v`.
#
# Required env:
#   APP_DIR            Absolute path to the repo checkout on the host
#   COMPOSE_FILE       e.g. docker-compose.prod.yml or docker-compose.staging.yml
#   COMPOSE_ENV_FILE   e.g. .env.production or .env.staging
#   API_IMAGE          Full image ref, e.g. ghcr.io/victordasilvaf/pokespace-api:<sha>
#   API_PORT           Host port published for health checks
#
# Optional:
#   GHCR_USER / GHCR_TOKEN   docker login to ghcr.io before pull
#   DEPLOY_GIT_PULL=1        git pull --ff-only in APP_DIR before compose
#   HEALTH_TIMEOUT_SEC=120   max wait for /api/v1/health
#   HEALTH_INTERVAL_SEC=5
set -euo pipefail

: "${APP_DIR:?APP_DIR is required}"
: "${COMPOSE_FILE:?COMPOSE_FILE is required}"
: "${COMPOSE_ENV_FILE:?COMPOSE_ENV_FILE is required}"
: "${API_IMAGE:?API_IMAGE is required}"
: "${API_PORT:?API_PORT is required}"

HEALTH_TIMEOUT_SEC="${HEALTH_TIMEOUT_SEC:-120}"
HEALTH_INTERVAL_SEC="${HEALTH_INTERVAL_SEC:-5}"

cd "${APP_DIR}"

if [[ "${DEPLOY_GIT_PULL:-0}" == "1" ]]; then
  echo "[deploy] git pull --ff-only"
  git pull --ff-only
fi

if [[ -n "${GHCR_TOKEN:-}" ]]; then
  echo "[deploy] docker login ghcr.io"
  echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USER:-$(whoami)}" --password-stdin
fi

echo "[deploy] pull ${API_IMAGE}"
docker pull "${API_IMAGE}"

echo "[deploy] compose up api (no volume wipe)"
export API_IMAGE
docker compose \
  -f "${COMPOSE_FILE}" \
  --env-file "${COMPOSE_ENV_FILE}" \
  up -d api

echo "[deploy] waiting for health on :${API_PORT}"
deadline=$((SECONDS + HEALTH_TIMEOUT_SEC))
until curl -fsS "http://127.0.0.1:${API_PORT}/api/v1/health" >/dev/null 2>&1; do
  if (( SECONDS >= deadline )); then
    echo "[deploy] health check failed after ${HEALTH_TIMEOUT_SEC}s" >&2
    docker compose -f "${COMPOSE_FILE}" --env-file "${COMPOSE_ENV_FILE}" ps api || true
    docker compose -f "${COMPOSE_FILE}" --env-file "${COMPOSE_ENV_FILE}" logs --tail=80 api || true
    exit 1
  fi
  sleep "${HEALTH_INTERVAL_SEC}"
done

echo "[deploy] healthy — ${API_IMAGE}"
