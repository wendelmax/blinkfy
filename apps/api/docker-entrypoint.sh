#!/bin/sh
set -e
cd /app/apps/api
npx prisma db push --skip-generate 2>/dev/null || true
exec node src/index.js
