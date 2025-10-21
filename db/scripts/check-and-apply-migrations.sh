#!/bin/bash
# This script runs on EVERY container start to ensure migrations are up-to-date
# Can be called manually or via Docker healthcheck
set -e

# Wait for PostgreSQL to be ready
until pg_isready -U postgres -d hr_system -h localhost -p 5432 > /dev/null 2>&1; do
    echo "Waiting for PostgreSQL to be ready..."
    sleep 2
done

echo "PostgreSQL is ready. Checking for pending migrations..."

# Ensure migration tracking table exists
psql -U postgres -d hr_system <<-EOSQL > /dev/null 2>&1
    CREATE SCHEMA IF NOT EXISTS hr_public;

    CREATE TABLE IF NOT EXISTS hr_public.schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(64),
        execution_time_ms INTEGER,
        success BOOLEAN DEFAULT true,
        error_message TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_schema_migrations_name
        ON hr_public.schema_migrations(migration_name);
EOSQL

# Check for pending migrations
MIGRATION_DIR="/migrations"

if [ ! -d "$MIGRATION_DIR" ]; then
    echo "Migration directory not found: $MIGRATION_DIR"
    exit 0
fi

# Count total and applied migrations
TOTAL_MIGRATIONS=$(find "$MIGRATION_DIR" -maxdepth 1 -name "*.sql" -type f | wc -l)
APPLIED_MIGRATIONS=$(psql -t -A -U postgres -d hr_system -c "SELECT COUNT(*) FROM hr_public.schema_migrations WHERE success = true" 2>/dev/null || echo "0")

PENDING_COUNT=$((TOTAL_MIGRATIONS - APPLIED_MIGRATIONS))

if [ $PENDING_COUNT -gt 0 ]; then
    echo "⚠️  Found $PENDING_COUNT pending migrations. Applying..."

    # Run the migration script
    bash /docker-entrypoint-initdb.d/02_run_migrations.sh
else
    echo "✓ All migrations are up-to-date ($APPLIED_MIGRATIONS/$TOTAL_MIGRATIONS)"
fi

exit 0
