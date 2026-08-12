#!/bin/sh
set -e
cd /app/apps/api
attempt=1
until npx prisma migrate deploy; do
  if [ "$attempt" -ge 10 ]; then
    echo "Database migrations failed after ${attempt} attempts" >&2
    exit 1
  fi
  echo "Database unavailable; retrying migration in 3 seconds (attempt ${attempt}/10)" >&2
  attempt=$((attempt + 1))
  sleep 3
done
exec node src/index.js
