#!/bin/bash
set -e

echo "=========================================="
echo "Running Database Migrations"
echo "=========================================="

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

MIGRATION_DIR="/migrations"
APPLIED_COUNT=0
SKIPPED_COUNT=0
FAILED_COUNT=0

echo -e "${BLUE}Migration directory: ${MIGRATION_DIR}${NC}"
echo ""

# Check if migration directory exists
if [ ! -d "$MIGRATION_DIR" ]; then
    echo -e "${RED}ERROR: Migration directory not found: ${MIGRATION_DIR}${NC}"
    exit 1
fi

# Function to calculate checksum of a file
calculate_checksum() {
    local file="$1"
    md5sum "$file" | awk '{print $1}'
}

# Function to check if migration has been applied
is_migration_applied() {
    local migration_name="$1"
    local count=$(psql -t -A --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
        -c "SELECT COUNT(*) FROM hr_public.schema_migrations WHERE migration_name = '$migration_name' AND success = true")
    [ "$count" -gt 0 ]
}

# Function to record successful migration
record_migration() {
    local migration_name="$1"
    local checksum="$2"
    local execution_time="$3"

    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        INSERT INTO hr_public.schema_migrations (migration_name, checksum, execution_time_ms, success)
        VALUES ('$migration_name', '$checksum', $execution_time, true)
        ON CONFLICT (migration_name) DO UPDATE SET
            applied_at = CURRENT_TIMESTAMP,
            checksum = '$checksum',
            execution_time_ms = $execution_time,
            success = true,
            error_message = NULL;
EOSQL
}

# Function to record failed migration
record_failure() {
    local migration_name="$1"
    local error_msg="$2"

    # Escape single quotes in error message
    error_msg=$(echo "$error_msg" | sed "s/'/''/g")

    psql -v ON_ERROR_STOP=0 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        INSERT INTO hr_public.schema_migrations (migration_name, success, error_message)
        VALUES ('$migration_name', false, '$error_msg')
        ON CONFLICT (migration_name) DO UPDATE SET
            applied_at = CURRENT_TIMESTAMP,
            success = false,
            error_message = '$error_msg';
EOSQL
}

# Get list of all migration files sorted by name (timestamp-based)
MIGRATION_FILES=($(find "$MIGRATION_DIR" -maxdepth 1 -name "*.sql" -type f | sort))
TOTAL_MIGRATIONS=${#MIGRATION_FILES[@]}

echo -e "${BLUE}Found ${TOTAL_MIGRATIONS} migration files${NC}"

# Get list of previously applied migrations
echo -e "${BLUE}Checking applied migrations...${NC}"
APPLIED_MIGRATIONS=$(psql -t -A --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    -c "SELECT migration_name FROM hr_public.schema_migrations WHERE success = true" 2>/dev/null || echo "")

if [ -n "$APPLIED_MIGRATIONS" ]; then
    PREVIOUSLY_APPLIED=$(echo "$APPLIED_MIGRATIONS" | wc -l)
    echo -e "${GREEN}Previously applied: ${PREVIOUSLY_APPLIED} migrations${NC}"
else
    echo -e "${YELLOW}No previous migrations found${NC}"
fi
echo ""

# Process each migration
MIGRATION_NUM=0
for migration_file in "${MIGRATION_FILES[@]}"; do
    MIGRATION_NUM=$((MIGRATION_NUM + 1))
    filename=$(basename "$migration_file")

    echo -e "${BLUE}[${MIGRATION_NUM}/${TOTAL_MIGRATIONS}] Processing: ${filename}${NC}"

    # Check if migration has already been applied
    if is_migration_applied "$filename"; then
        echo -e "${YELLOW}⊙ Skipped (already applied): ${filename}${NC}"
        SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
        echo ""
        continue
    fi

    # Calculate checksum
    checksum=$(calculate_checksum "$migration_file")

    # Record start time
    start_time=$(date +%s%3N)

    # Apply migration
    if psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$migration_file" > /tmp/migration_output.log 2>&1; then
        # Calculate execution time
        end_time=$(date +%s%3N)
        execution_time=$((end_time - start_time))

        # Record success
        record_migration "$filename" "$checksum" "$execution_time"

        echo -e "${GREEN}✓ Applied: ${filename} (${execution_time}ms)${NC}"
        APPLIED_COUNT=$((APPLIED_COUNT + 1))
    else
        # Get error message
        error_msg=$(tail -20 /tmp/migration_output.log | tr '\n' ' ')

        # Record failure
        record_failure "$filename" "$error_msg"

        echo -e "${RED}✗ Failed: ${filename}${NC}"
        FAILED_COUNT=$((FAILED_COUNT + 1))

        # Show error details
        echo -e "${RED}Error details:${NC}"
        tail -20 /tmp/migration_output.log

        # Stop on first failure
        echo -e "${RED}Migration failed. Stopping.${NC}"
        exit 1
    fi

    echo ""
done

# Summary
echo "=========================================="
echo -e "${GREEN}Migration Process Complete${NC}"
echo "=========================================="
echo -e "Total migrations found: ${TOTAL_MIGRATIONS}"
echo -e "${GREEN}Applied: ${APPLIED_COUNT}${NC}"
echo -e "${YELLOW}Skipped: ${SKIPPED_COUNT}${NC}"
if [ $FAILED_COUNT -gt 0 ]; then
    echo -e "${RED}Failed: ${FAILED_COUNT}${NC}"
fi
echo "=========================================="

# Verify final state
TABLE_COUNT=$(psql -t -A --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    -c "SELECT count(*) FROM pg_tables WHERE schemaname = 'hr_public'" 2>/dev/null || echo "0")
echo -e "${BLUE}Tables in hr_public schema: ${TABLE_COUNT}${NC}"

# Show migration history summary
echo ""
echo -e "${BLUE}Migration History:${NC}"
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT
        migration_name,
        applied_at,
        CASE
            WHEN success THEN '✓ Success'
            ELSE '✗ Failed'
        END as status,
        execution_time_ms || 'ms' as duration
    FROM hr_public.schema_migrations
    ORDER BY applied_at DESC
    LIMIT 10;
EOSQL

echo "=========================================="
