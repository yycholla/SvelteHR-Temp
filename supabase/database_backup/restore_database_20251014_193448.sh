#!/bin/bash
# Database Restore Script
# Generated: Tue Oct 14 07:34:48 PM MDT 2025
# Source: localhost:5433/hr_system

set -e

# Configuration - MODIFY THESE FOR YOUR TARGET DATABASE
TARGET_HOST="${TARGET_HOST:-localhost}"
TARGET_PORT="${TARGET_PORT:-5432}"
TARGET_DB="${TARGET_DB:-hr_system}"
TARGET_USER="${TARGET_USER:-postgres}"
TARGET_PASSWORD="${TARGET_PASSWORD:-postgres123}"

echo "Restoring SvelteHR database..."
echo "Target: $TARGET_HOST:$TARGET_PORT/$TARGET_DB"
echo ""

# Set password for non-interactive use
export PGPASSWORD="$TARGET_PASSWORD"

# Option 1: Restore from schema-only dump (recommended for development)
if [ -f "hr_system_schema_20251014_193448.sql" ]; then
    echo "Restoring schema from: hr_system_schema_20251014_193448.sql"
    psql -h "$TARGET_HOST" -p "$TARGET_PORT" -U "$TARGET_USER" -d "$TARGET_DB" -f "hr_system_schema_20251014_193448.sql"
    echo "✅ Schema restored successfully"
fi

# Option 2: Restore from complete dump (includes data)
if [ -f "hr_system_complete_20251014_193448.backup" ]; then
    echo "Restoring complete database from: hr_system_complete_20251014_193448.backup"
    pg_restore --verbose --clean --if-exists --create \
        --host="$TARGET_HOST" \
        --port="$TARGET_PORT" \
        --username="$TARGET_USER" \
        --dbname="$TARGET_DB" \
        "hr_system_complete_20251014_193448.backup"
    echo "✅ Complete database restored successfully"
fi

echo ""
echo "Database restore complete!"
echo "You can now run your application against the restored database."
