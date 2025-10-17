#!/bin/bash
# Custom entrypoint wrapper for PostgreSQL that ensures migrations run on every start
set -e

echo "🚀 Starting PostgreSQL with automatic migration support..."

# Run the original PostgreSQL entrypoint in the background
docker-entrypoint.sh postgres &
PG_PID=$!

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until pg_isready -U postgres -d hr_system -h localhost -p 5432 > /dev/null 2>&1; do
    sleep 1
done

echo "✓ PostgreSQL is ready"

# Check and apply migrations (this runs on EVERY container start)
if [ -f /usr/local/bin/check-and-apply-migrations.sh ]; then
    echo "🔄 Checking for pending migrations..."
    bash /usr/local/bin/check-and-apply-migrations.sh
else
    echo "⚠️  Migration script not found, skipping migration check"
fi

# Wait for the PostgreSQL process
wait $PG_PID
