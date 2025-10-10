#!/bin/bash
# Script to create a new migration file with proper naming convention

set -e

# Check if description is provided
if [ -z "$1" ]; then
    echo "Usage: ./scripts/db/new-migration.sh <description>"
    echo "Example: ./scripts/db/new-migration.sh add_user_preferences"
    exit 1
fi

DESCRIPTION=$1
DATE=$(date +%Y%m%d)
MIGRATIONS_DIR="db/migrations"

# Find the next sequence number for today
EXISTING_TODAY=$(find "$MIGRATIONS_DIR" -name "${DATE}_*.sql" | wc -l)
SEQUENCE=$(printf "%03d" $((EXISTING_TODAY + 1)))

FILENAME="${DATE}_${SEQUENCE}_${DESCRIPTION}.sql"
FILEPATH="${MIGRATIONS_DIR}/${FILENAME}"

# Create migration template
cat > "$FILEPATH" << 'EOF'
-- Migration: [Brief description of what this migration does]
-- Date: $(date +%Y-%m-%d)
-- Purpose: [Detailed explanation of changes]

BEGIN;

-- ========================================
-- YOUR CHANGES HERE
-- ========================================

-- Example:
-- CREATE TABLE IF NOT EXISTS hr_public.my_new_table (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   name VARCHAR(255) NOT NULL,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );

-- COMMENT ON TABLE hr_public.my_new_table IS 'Description of what this table stores';

-- CREATE INDEX idx_my_table_name ON hr_public.my_new_table(name);

COMMIT;
EOF

# Replace the date placeholder in the template
sed -i "s/\$(date +%Y-%m-%d)/$(date +%Y-%m-%d)/" "$FILEPATH"

echo "✓ Created new migration: $FILEPATH"
echo ""
echo "Next steps:"
echo "1. Edit the migration file with your SQL changes"
echo "2. Test locally:"
echo "   docker compose -f dev-containers/docker-compose.dev.yml down postgres-dev"
echo "   docker volume rm sveltehr_postgres_dev_data"
echo "   docker compose -f dev-containers/docker-compose.dev.yml up -d postgres-dev"
echo "3. Verify schema: npm run db:verify"
echo "4. Update baseline: npm run db:snapshot"
