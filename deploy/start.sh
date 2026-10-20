#!/bin/sh
# Container entrypoint. Set RUN_MIGRATIONS_ON_START=0 when the platform runs deploy/migrate.sh before deploy (Render does).
set -e
cd "$(dirname "$0")/.."
if [ "${RUN_MIGRATIONS_ON_START:-1}" = "1" ]; then sh deploy/migrate.sh; fi
exec node apps/web/server.js
