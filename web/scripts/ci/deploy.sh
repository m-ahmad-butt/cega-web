#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${CI_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
source "${ROOT_DIR}/scripts/ci/resolve-env.sh"

echo "==> Rsync code → ${DEPLOY_DIR}"
rsync -a --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'frontend/node_modules' \
  --exclude 'backend/node_modules' \
  --exclude 'frontend/dist' \
  --exclude 'sample' \
  "${ROOT_DIR}/" "${DEPLOY_DIR}/"

echo "==> Write env files from GitLab File variables"
cp "${BACKEND_ENV}" "${DEPLOY_DIR}/backend/.env"
cp "${FRONTEND_ENV}" "${DEPLOY_DIR}/frontend/.env"
chmod 600 "${DEPLOY_DIR}/backend/.env" "${DEPLOY_DIR}/frontend/.env"

echo "==> Docker Compose up (build on this host, no registry push)"
cd "${DEPLOY_DIR}"
docker compose \
  --env-file backend/.env \
  --env-file frontend/.env \
  -f "${COMPOSE_FILE}" \
  up -d --build --remove-orphans

echo "==> Status"
docker compose -f "${COMPOSE_FILE}" ps
echo "Deploy finished → ${DEPLOY_DIR}"
