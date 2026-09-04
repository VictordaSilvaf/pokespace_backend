#!/usr/bin/env bash
set -euo pipefail

# Prefer Node 24 (Nest CLI / ESM require Node >= 22; Dockerfile pins 24).
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm use 24 >/dev/null 2>&1 || nvm install 24
fi
export PATH="${NVM_DIR}/versions/node/$(node -v 2>/dev/null || echo v24.20.0)/bin:${HOME}/bin:${PATH}"
# Ensure nvm node wins over any system/exec-daemon node.
if [[ -d "${NVM_DIR}/versions/node" ]]; then
  LATEST24="$(ls -1d "${NVM_DIR}"/versions/node/v24* 2>/dev/null | sort -V | tail -1 || true)"
  if [[ -n "${LATEST24}" ]]; then
    export PATH="${LATEST24}/bin:${HOME}/bin:${PATH}"
  fi
fi

cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  cp .env.example .env
fi

corepack enable
corepack prepare pnpm@10.33.3 --activate
pnpm install --frozen-lockfile

# OCI CLI for Oracle Cloud deploys (idempotent).
if ! command -v oci >/dev/null 2>&1; then
  python3 -m venv "${HOME}/lib/oracle-cli"
  "${HOME}/lib/oracle-cli/bin/pip" install --upgrade pip oci-cli
  mkdir -p "${HOME}/bin"
  ln -sfn "${HOME}/lib/oracle-cli/bin/oci" "${HOME}/bin/oci"
fi
