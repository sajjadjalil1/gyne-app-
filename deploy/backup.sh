#!/bin/sh
# Daily PostgreSQL dump for the docker-compose (own server) setup. Keeps the last 30 days.
# Runs inside the `backup` container; dumps land in ./backups on the host.
set -e
mkdir -p /backups
while true; do
  f="/backups/gyne-$(date +%Y-%m-%d).sql.gz"
  pg_dump "$DATABASE_URL" | gzip > "$f.tmp" && mv "$f.tmp" "$f"
  echo "[backup] wrote $f"
  find /backups -name 'gyne-*.sql.gz' -mtime +30 -delete
  sleep 86400
done
