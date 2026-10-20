#!/bin/sh
# Applies pending database migrations. Safe to run on every deploy.
set -e
cd "$(dirname "$0")/.."
if command -v prisma >/dev/null 2>&1; then PRISMA=prisma; else PRISMA="npx prisma"; fi
$PRISMA migrate deploy --schema packages/db/prisma/schema.prisma
