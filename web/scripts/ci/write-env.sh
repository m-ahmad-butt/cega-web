#!/usr/bin/env bash
# Copy GitLab File variables into the compose env files. Run from web/.
set -euo pipefail

copy_env() {
  local var="$1"
  local dest="$2"
  local src="${!var:-}"
  if [ -z "${src}" ] || [ ! -f "${src}" ]; then
    echo "Missing CI variable ${var} (Type: File)."
    exit 1
  fi
  cp "${src}" "${dest}"
  chmod 600 "${dest}"
}

copy_env BACKEND_ENV backend/.env
copy_env FRONTEND_ENV frontend/.env
copy_env AGENT_ENV agent/.env
