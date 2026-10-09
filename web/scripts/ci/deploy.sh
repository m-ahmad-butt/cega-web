#!/usr/bin/env bash
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "${HERE}/resolve-env.sh"
ROOT_DIR="${APP_DIR}"

echo "==> Rsync code → ${DEPLOY_DIR}"
rsync -a --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'frontend/node_modules' \
  --exclude 'backend/node_modules' \
  --exclude 'frontend/dist' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  "${ROOT_DIR}/" "${DEPLOY_DIR}/"

echo "==> Write env files from GitLab File variables"
cp "${BACKEND_ENV}" "${DEPLOY_DIR}/backend/.env"
cp "${FRONTEND_ENV}" "${DEPLOY_DIR}/frontend/.env"
cp "${AGENT_ENV}" "${DEPLOY_DIR}/agent/.env"
chmod 600 "${DEPLOY_DIR}/backend/.env" "${DEPLOY_DIR}/frontend/.env" "${DEPLOY_DIR}/agent/.env"

echo "==> Docker Compose up (build on this host, no registry push)"
cd "${DEPLOY_DIR}"
docker compose \
  --env-file backend/.env \
  --env-file frontend/.env \
  --env-file agent/.env \
  -f "${COMPOSE_FILE}" \
  up -d --build --remove-orphans

echo "==> Status"
docker compose -f "${COMPOSE_FILE}" ps
echo "Deploy finished → ${DEPLOY_DIR}"
