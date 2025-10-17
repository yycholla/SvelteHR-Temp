#!/bin/bash
set -e

echo "=========================================="
echo "Starting Database Initialization"
echo "=========================================="

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

MIGRATION_DIR="/migrations"
MIGRATION_COUNT=0
SUCCESS_COUNT=0
FAILED_COUNT=0

echo -e "${BLUE}Migration directory: ${MIGRATION_DIR}${NC}"
echo ""

# Check if migration directory exists
if [ ! -d "$MIGRATION_DIR" ]; then
    echo -e "${RED}ERROR: Migration directory not found: ${MIGRATION_DIR}${NC}"
    exit 1
fi

# Count total migrations
TOTAL_MIGRATIONS=$(find "$MIGRATION_DIR" -maxdepth 1 -name "*.sql" -type f | wc -l)
echo -e "${BLUE}Found ${TOTAL_MIGRATIONS} migration files${NC}"
echo ""

# Run migrations in alphabetical order (which matches timestamp order)
for migration_file in $(find "$MIGRATION_DIR" -maxdepth 1 -name "*.sql" -type f | sort); do
    MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
    filename=$(basename "$migration_file")

    echo -e "${BLUE}[${MIGRATION_COUNT}/${TOTAL_MIGRATIONS}] Running: ${filename}${NC}"

    if psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$migration_file" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Success: ${filename}${NC}"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo -e "${RED}✗ Failed: ${filename}${NC}"
        FAILED_COUNT=$((FAILED_COUNT + 1))

        # Show error details
        echo -e "${RED}Error details:${NC}"
        psql -v ON_ERROR_STOP=0 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$migration_file" 2>&1 | tail -20

        # Stop on first failure
        echo -e "${RED}Migration failed. Stopping initialization.${NC}"
        exit 1
    fi
    echo ""
done

echo "=========================================="
echo -e "${GREEN}Database Initialization Complete${NC}"
echo "=========================================="
echo -e "Total migrations: ${TOTAL_MIGRATIONS}"
echo -e "${GREEN}Successful: ${SUCCESS_COUNT}${NC}"
if [ $FAILED_COUNT -gt 0 ]; then
    echo -e "${RED}Failed: ${FAILED_COUNT}${NC}"
fi
echo "=========================================="

# Verify final table count
TABLE_COUNT=$(psql -t -A --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "SELECT count(*) FROM pg_tables WHERE schemaname = 'hr_public'")
echo -e "${BLUE}Tables in hr_public schema: ${TABLE_COUNT}${NC}"
echo "=========================================="
