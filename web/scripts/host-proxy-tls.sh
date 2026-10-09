#!/usr/bin/env bash
# Issue / renew Let's Encrypt cert for DuckDNS domain (HTTP-01 via nginx).
# Usage (as root / sudo):
#   DOMAIN=web-comp.duckdns.org CERTBOT_EMAIL=you@example.com bash scripts/host-proxy-tls.sh
#
# Optional: DUCKDNS_TOKEN=xxx to refresh the A record before requesting the cert.
set -euo pipefail

DOMAIN="${DOMAIN:-web-comp.duckdns.org}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"
DUCKDNS_TOKEN="${DUCKDNS_TOKEN:-}"

if [ -z "${CERTBOT_EMAIL}" ]; then
  echo "Set CERTBOT_EMAIL (GitLab CI variable or env) for Let's Encrypt registration." >&2
  exit 1
fi

if [ -n "${DUCKDNS_TOKEN}" ]; then
  SUBDOMAIN="${DOMAIN%%.duckdns.org}"
  echo "==> Updating DuckDNS A record for ${SUBDOMAIN}"
  curl -fsS "https://www.duckdns.org/update?domains=${SUBDOMAIN}&token=${DUCKDNS_TOKEN}&ip=" || true
  echo
  sleep 5
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y certbot python3-certbot-nginx

echo "==> Requesting certificate for ${DOMAIN}"
certbot --nginx \
  -d "${DOMAIN}" \
  --non-interactive \
  --agree-tos \
  --email "${CERTBOT_EMAIL}" \
  --redirect

nginx -t
systemctl reload nginx

echo "TLS ready → https://${DOMAIN}/"
