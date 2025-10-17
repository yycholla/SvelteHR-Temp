#!/bin/bash
set -e

echo "=========================================="
echo "Setting up migration tracking system"
echo "=========================================="

# Create migration tracking table if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create schema if it doesn't exist
    CREATE SCHEMA IF NOT EXISTS hr_public;

    -- Create migration tracking table
    CREATE TABLE IF NOT EXISTS hr_public.schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(64),
        execution_time_ms INTEGER,
        success BOOLEAN DEFAULT true,
        error_message TEXT
    );

    -- Create index for fast lookups
    CREATE INDEX IF NOT EXISTS idx_schema_migrations_name
        ON hr_public.schema_migrations(migration_name);

    -- Grant permissions
    GRANT SELECT, INSERT, UPDATE ON hr_public.schema_migrations TO postgres;
    GRANT USAGE, SELECT ON SEQUENCE hr_public.schema_migrations_id_seq TO postgres;

    COMMENT ON TABLE hr_public.schema_migrations IS
        'Tracks which migrations have been applied to the database';
EOSQL

echo "✓ Migration tracking table ready"
echo ""
