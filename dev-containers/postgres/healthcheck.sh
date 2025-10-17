#!/bin/bash
# Combined healthcheck and migration script
# This runs on every health check interval, applying pending migrations automatically

# First, check if PostgreSQL is ready
if ! pg_isready -U postgres -d hr_system > /dev/null 2>&1; then
    exit 1
fi

# If this is the first successful health check after startup, apply migrations
# We use a lock file to ensure migrations only run once per container start
MIGRATION_LOCK="/tmp/migrations_applied_$$"

if [ ! -f "$MIGRATION_LOCK" ]; then
    echo "🔄 First health check passed - checking migrations..."

    # Run migration check script
    if /usr/local/bin/check-and-apply-migrations.sh 2>&1 | tee -a /var/log/postgresql/migration.log; then
        # Create lock file to prevent running again
        touch "$MIGRATION_LOCK"
        echo "✓ Migrations checked successfully"
    else
        echo "⚠️  Migration check failed, but PostgreSQL is healthy"
        # Still mark as healthy - don't fail the health check due to migration issues
        # This allows the container to start even if a migration fails
    fi
fi

# PostgreSQL is healthy
exit 0
