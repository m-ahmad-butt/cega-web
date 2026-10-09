#!/usr/bin/env bash
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "${HERE}/resolve-env.sh"

if [ ! -f "${DEPLOY_DIR}/backend/.env" ]; then
  echo "Missing ${DEPLOY_DIR}/backend/.env — run deploy:${APP_ENV} first." >&2
  exit 1
fi

cd "${DEPLOY_DIR}"
docker compose \
  --env-file backend/.env \
  --env-file frontend/.env \
  --env-file agent/.env \
  -f "${COMPOSE_FILE}" \
  up -d --build --remove-orphans

docker compose -f "${COMPOSE_FILE}" ps
echo "Restart finished → ${DEPLOY_DIR} [${APP_ENV}]"
