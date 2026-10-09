#!/usr/bin/env bash
# Bring the stack up, then host nginx + DuckDNS TLS (CI init stage).
set -euo pipefail

ROOT_DIR="${CI_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
source "${ROOT_DIR}/scripts/ci/resolve-env.sh"

CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"
DUCKDNS_TOKEN="${DUCKDNS_TOKEN:-}"

if [ ! -f "${DEPLOY_DIR}/backend/.env" ] || [ ! -f "${DEPLOY_DIR}/frontend/.env" ]; then
  echo "Missing ${DEPLOY_DIR}/backend/.env or frontend/.env — run deploy:${APP_ENV} first." >&2
  exit 1
fi

# Probe a command already allowed by install-runner-sudoers.sh (bare `true` is not).
if ! sudo -n /usr/bin/tee --help >/dev/null 2>&1; then
  echo "gitlab-runner needs passwordless sudo for init (nginx/certbot)." >&2
  echo "On the EC2 server run once (SSH as ubuntu):" >&2
  echo "  sudo bash ${DEPLOY_DIR}/scripts/ci/install-runner-sudoers.sh" >&2
  exit 1
fi

echo "==> Compose up (${DEPLOY_DIR}) [${APP_ENV}]"
cd "${DEPLOY_DIR}"
docker compose \
  --env-file backend/.env \
  --env-file frontend/.env \
  -f "${COMPOSE_FILE}" \
  up -d --build --remove-orphans

echo "==> Wait for backend /health"
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3001/health >/dev/null; then
    echo "Backend is healthy"
    break
  fi
  sleep 2
  if [ "$i" -eq 30 ]; then
    echo "Backend health check failed" >&2
    docker compose -f "${COMPOSE_FILE}" logs --tail=80 backend || true
    exit 1
  fi
done

echo "==> Host nginx (HTTP proxy)"
# Do not use `sudo VAR=value ...` — sudoers blocks env overrides; set vars inside bash -c.
sudo /bin/bash -c "export DOMAIN=$(printf '%q' "${DOMAIN}"); bash $(printf '%q' "${ROOT_DIR}/scripts/setup-host-nginx.sh")"

echo "==> Let's Encrypt TLS for ${DOMAIN}"
sudo /bin/bash -c "export DOMAIN=$(printf '%q' "${DOMAIN}"); export CERTBOT_EMAIL=$(printf '%q' "${CERTBOT_EMAIL}"); export DUCKDNS_TOKEN=$(printf '%q' "${DUCKDNS_TOKEN}"); bash $(printf '%q' "${ROOT_DIR}/scripts/host-proxy-tls.sh")"

echo "==> Done — https://${DOMAIN}/ [${APP_ENV}]"
docker compose -f "${COMPOSE_FILE}" ps
