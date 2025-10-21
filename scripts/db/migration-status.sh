#!/bin/bash
# View current migration status and history

set -e

CONTAINER_NAME="sveltehr-postgres-dev"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ Container $CONTAINER_NAME is not running"
    exit 1
fi

echo "📊 Migration Status Report"
echo "=================================="
echo ""

# Count total migrations
TOTAL_FILES=$(find db/migrations -maxdepth 1 -name "*.sql" -type f | wc -l)
echo "📁 Total migration files: $TOTAL_FILES"

# Count applied migrations
APPLIED=$(docker exec "$CONTAINER_NAME" psql -t -A -U postgres -d hr_system \
    -c "SELECT COUNT(*) FROM hr_public.schema_migrations WHERE success = true" 2>/dev/null || echo "0")
echo "✅ Applied migrations: $APPLIED"

PENDING=$((TOTAL_FILES - APPLIED))
if [ $PENDING -gt 0 ]; then
    echo "⏳ Pending migrations: $PENDING"
else
    echo "✅ All migrations applied!"
fi

echo ""
echo "📜 Recent Migration History:"
echo "=================================="

docker exec "$CONTAINER_NAME" psql -U postgres -d hr_system <<-EOSQL
    SELECT
        SUBSTRING(migration_name, 1, 50) as migration,
        TO_CHAR(applied_at, 'YYYY-MM-DD HH24:MI:SS') as applied,
        CASE WHEN success THEN '✓' ELSE '✗' END as status,
        COALESCE(execution_time_ms::text || 'ms', '-') as time
    FROM hr_public.schema_migrations
    ORDER BY applied_at DESC
    LIMIT 15;
EOSQL

echo ""
echo "=================================="

# Check for failed migrations
FAILED=$(docker exec "$CONTAINER_NAME" psql -t -A -U postgres -d hr_system \
    -c "SELECT COUNT(*) FROM hr_public.schema_migrations WHERE success = false" 2>/dev/null || echo "0")

if [ "$FAILED" -gt 0 ]; then
    echo ""
    echo "⚠️  Failed Migrations Found: $FAILED"
    echo "=================================="
    docker exec "$CONTAINER_NAME" psql -U postgres -d hr_system <<-EOSQL
        SELECT
            migration_name,
            TO_CHAR(applied_at, 'YYYY-MM-DD HH24:MI:SS') as attempted,
            SUBSTRING(error_message, 1, 100) as error
        FROM hr_public.schema_migrations
        WHERE success = false
        ORDER BY applied_at DESC;
EOSQL
fi
