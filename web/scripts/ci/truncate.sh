#!/usr/bin/env bash
# Wipe application data on the deployed stack. Admin users are kept.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "${HERE}/resolve-env.sh"

if [ ! -f "${DEPLOY_DIR}/backend/.env" ]; then
  echo "Missing ${DEPLOY_DIR}/backend/.env. Run deploy:${APP_ENV} first." >&2
  exit 1
fi

cd "${DEPLOY_DIR}"

compose() {
  docker compose \
    --env-file backend/.env \
    --env-file frontend/.env \
    --env-file agent/.env \
    -f "${COMPOSE_FILE}" \
    "$@"
}

mongo_id="$(compose ps -q mongodb)"
if [ -z "${mongo_id}" ]; then
  echo "MongoDB is not running in ${DEPLOY_DIR}." >&2
  exit 1
fi

echo "Truncating ${APP_ENV} data in ${DEPLOY_DIR}. Admin users are kept."

docker exec -i "${mongo_id}" mongosh --quiet authdb <<'EOF'
const admins = db.users.find({ role: 'ADMIN' }, { email: 1 }).toArray();
if (!admins.length) {
  print('No admin user found. Refusing to truncate.');
  quit(1);
}
admins.forEach((user) => print('Keeping admin ' + user.email));

db.getCollectionNames().filter((name) => !name.startsWith('system.')).forEach((name) => {
  if (name === 'users') {
    const result = db.users.deleteMany({ role: { $ne: 'ADMIN' } });
    print('users removed ' + result.deletedCount);
    return;
  }
  const result = db.getCollection(name).deleteMany({});
  print(name + ' removed ' + result.deletedCount);
});

print('Admins remaining: ' + db.users.countDocuments({ role: 'ADMIN' }));
EOF

redis_id="$(compose ps -q redis || true)"
if [ -n "${redis_id}" ]; then
  redis_pass="$(grep -E '^REDIS_PASSWORD=' backend/.env | head -n1 | cut -d= -f2- | tr -d '\r' || true)"
  redis_pass="${redis_pass:-123123123}"
  if ! docker exec "${redis_id}" redis-cli -a "${redis_pass}" FLUSHALL >/dev/null 2>&1; then
    docker exec "${redis_id}" redis-cli -a 123123123 FLUSHALL >/dev/null 2>&1 || true
  fi
  echo "Redis cleared."
fi

rabbit_id="$(compose ps -q rabbitmq || true)"
if [ -n "${rabbit_id}" ]; then
  while read -r queue; do
    [ -z "${queue}" ] && continue
    docker exec "${rabbit_id}" rabbitmqctl purge_queue -p hackathon "${queue}" >/dev/null 2>&1 || true
  done < <(docker exec "${rabbit_id}" rabbitmqctl list_queues -p hackathon name --quiet 2>/dev/null || true)
  echo "RabbitMQ queues purged."
fi

echo "Truncate finished for ${APP_ENV}. Admin login is unchanged."
