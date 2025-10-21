#!/bin/bash
# Manually trigger migration check and apply pending migrations
# Can be run from host machine without rebuilding the container

set -e

CONTAINER_NAME="sveltehr-postgres-dev"

echo "🔄 Checking for pending migrations in $CONTAINER_NAME..."

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ Container $CONTAINER_NAME is not running"
    echo "Start it with: cd dev-containers && docker compose -f docker-compose.dev.yml up -d postgres-dev"
    exit 1
fi

# Run migration check script inside the container
echo "Running migration check..."
docker exec -it "$CONTAINER_NAME" bash /usr/local/bin/check-and-apply-migrations.sh

echo ""
echo "✅ Migration check complete!"
echo ""
echo "To view migration history:"
echo "  docker exec -it $CONTAINER_NAME psql -U postgres -d hr_system -c \"SELECT migration_name, applied_at, CASE WHEN success THEN '✓' ELSE '✗' END as status FROM hr_public.schema_migrations ORDER BY applied_at DESC LIMIT 10;\""
