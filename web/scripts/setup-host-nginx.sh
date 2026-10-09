#!/usr/bin/env bash
# Install host nginx and proxy DuckDNS → local compose (frontend :8080, backend :3001).
# Usage (as root / sudo):
#   DOMAIN=web-comp.duckdns.org bash scripts/setup-host-nginx.sh
set -euo pipefail

DOMAIN="${DOMAIN:-web-comp.duckdns.org}"
FRONTEND_UPSTREAM="${FRONTEND_UPSTREAM:-127.0.0.1:8080}"
BACKEND_UPSTREAM="${BACKEND_UPSTREAM:-127.0.0.1:3001}"
SITE_AVAILABLE="/etc/nginx/sites-available/hackathon"
SITE_ENABLED="/etc/nginx/sites-enabled/hackathon"

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y nginx

# Free :80 for host nginx (compose frontend binds 127.0.0.1:8080 only)
rm -f /etc/nginx/sites-enabled/default

cat >"${SITE_AVAILABLE}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location /api/ {
        proxy_pass http://${BACKEND_UPSTREAM};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /health {
        proxy_pass http://${BACKEND_UPSTREAM};
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass http://${FRONTEND_UPSTREAM};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

ln -sfn "${SITE_AVAILABLE}" "${SITE_ENABLED}"
mkdir -p /var/www/html
nginx -t
systemctl enable nginx
systemctl restart nginx

echo "Host nginx ready for http://${DOMAIN}/ → frontend ${FRONTEND_UPSTREAM}, API ${BACKEND_UPSTREAM}"
