#!/usr/bin/env bash
set -euo pipefail

export APP_ENV="${APP_ENV:-production}"
export COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

# Staging may use dedicated File variables; otherwise fall back to production ones.
if [ "${APP_ENV}" = "staging" ]; then
  if [ -n "${BACKEND_ENV_STAGING:-}" ] && [ -f "${BACKEND_ENV_STAGING}" ]; then
    export BACKEND_ENV="${BACKEND_ENV_STAGING}"
  fi
  if [ -n "${FRONTEND_ENV_STAGING:-}" ] && [ -f "${FRONTEND_ENV_STAGING}" ]; then
    export FRONTEND_ENV="${FRONTEND_ENV_STAGING}"
  fi
  export DOMAIN="${DOMAIN:-${STAGING_DOMAIN:-web-comp-stage.duckdns.org}}"
  export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-web-comp-stage}"
  export DEPLOY_DIR="${DEPLOY_DIR:-/opt/web-comp-stage}"
else
  export DOMAIN="${DOMAIN:-web-comp.duckdns.org}"
  export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-web-comp}"
  export DEPLOY_DIR="${DEPLOY_DIR:-/opt/web-comp}"
fi

mkdir -p "${DEPLOY_DIR}"

if [ -z "${BACKEND_ENV:-}" ] || [ ! -f "${BACKEND_ENV}" ]; then
  echo "Missing CI variable BACKEND_ENV (Type: File)."
  exit 1
fi

if [ -z "${FRONTEND_ENV:-}" ] || [ ! -f "${FRONTEND_ENV}" ]; then
  echo "Missing CI variable FRONTEND_ENV (Type: File)."
  exit 1
fi

echo "Using APP_ENV=${APP_ENV} DEPLOY_DIR=${DEPLOY_DIR} DOMAIN=${DOMAIN} COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME:-}"
