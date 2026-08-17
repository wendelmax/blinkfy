#!/bin/sh
set -e
cd /app/apps/api
attempt=1
while true; do
  output=$(npx prisma migrate deploy 2>&1) && break
  if echo "$output" | grep -q "P3005"; then
    echo "Existing database detected; pushing schema instead" >&2
    npx prisma db push --accept-data-loss
    break
  fi
  if [ "$attempt" -ge 10 ]; then
    echo "Database migrations failed after ${attempt} attempts" >&2
    exit 1
  fi
  echo "Database unavailable; retrying migration in 3 seconds (attempt ${attempt}/10)" >&2
  attempt=$((attempt + 1))
  sleep 3
done
exec node src/index.js
