#!/usr/bin/env bash
set -euo pipefail

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm use 24 >/dev/null 2>&1 || true
fi
LATEST24="$(ls -1d "${NVM_DIR}"/versions/node/v24* 2>/dev/null | sort -V | tail -1 || true)"
if [[ -n "${LATEST24}" ]]; then
  export PATH="${LATEST24}/bin:${HOME}/bin:${PATH}"
fi
export PATH="${HOME}/bin:${PATH}"

cd /workspace

# Configure OCI CLI from Cursor secrets when present (never log values).
if [[ -n "${OCI_CLI_USER:-}" && -n "${OCI_CLI_TENANCY:-}" && -n "${OCI_CLI_FINGERPRINT:-}" && -n "${OCI_CLI_KEY_CONTENT:-}" && -n "${OCI_CLI_REGION:-}" ]]; then
  mkdir -p "${HOME}/.oci"
  umask 077
  printf '%s\n' "${OCI_CLI_KEY_CONTENT}" > "${HOME}/.oci/oci_api_key.pem"
  cat > "${HOME}/.oci/config" <<EOF
[DEFAULT]
user=${OCI_CLI_USER}
fingerprint=${OCI_CLI_FINGERPRINT}
tenancy=${OCI_CLI_TENANCY}
region=${OCI_CLI_REGION}
key_file=${HOME}/.oci/oci_api_key.pem
EOF
fi

# Docker daemon (nested VM: fuse-overlayfs, no systemd).
if ! docker info >/dev/null 2>&1; then
  sudo mkdir -p /etc/docker
  if [[ ! -f /etc/docker/daemon.json ]]; then
    printf '%s\n' '{' '  "storage-driver": "fuse-overlayfs"' '}' | sudo tee /etc/docker/daemon.json >/dev/null
  fi
  sudo dockerd >/tmp/dockerd.log 2>&1 &
  for _ in $(seq 1 30); do
    docker info >/dev/null 2>&1 && break
    sleep 1
  done
  sudo chmod 666 /var/run/docker.sock || true
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
fi

# Infra only — API runs on the host with pnpm/node for fast agent iteration.
docker compose up -d postgres redis rabbitmq kafka mailpit

for _ in $(seq 1 60); do
  pg=$(docker inspect -f '{{.State.Health.Status}}' pokespace-postgres 2>/dev/null || echo starting)
  rd=$(docker inspect -f '{{.State.Health.Status}}' pokespace-redis 2>/dev/null || echo starting)
  if [[ "$pg" == healthy && "$rd" == healthy ]]; then
    break
  fi
  sleep 2
done

set -a
# shellcheck disable=SC1091
. ./.env
set +a

exec pnpm start:dev
