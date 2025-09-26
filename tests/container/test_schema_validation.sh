#!/bin/bash
# T005: Schema integrity test using PostgreSQL queries
# This test validates that all required tables, constraints, and relationships are properly initialized
# MUST fail initially to demonstrate TDD approach

set -e

echo "=== Schema Integrity Validation Test ==="
echo "Testing database schema completeness and integrity..."

# Configuration
CONTAINER_NAME="sveltehr-postgres-dev"
DB_NAME="hr_system"
DB_USER="postgres"
DB_PASSWORD="postgres123"

# Helper function to run SQL query
run_query() {
    local query="$1"
    docker exec -e PGPASSWORD=$DB_PASSWORD $CONTAINER_NAME \
        psql -U $DB_USER -d $DB_NAME -t -c "$query" 2>/dev/null | xargs
}

# Test 1: Verify minimum number of tables in hr_public schema
echo "Test 1: Checking table count in hr_public schema..."
table_count=$(run_query "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'hr_public';")
MIN_TABLES=10

if [ "$table_count" -ge $MIN_TABLES ]; then
    echo "✓ Found $table_count tables in hr_public (minimum: $MIN_TABLES)"
else
    echo "✗ FAIL: Only $table_count tables found in hr_public, expected at least $MIN_TABLES"
    echo "Existing tables:"
    run_query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'hr_public' ORDER BY table_name;"
    exit 1
fi

# Test 2: Verify core tables exist
echo "Test 2: Checking core tables exist..."
CORE_TABLES="users departments leave_requests performance_reviews user_role_assignments"
for table in $CORE_TABLES; do
    exists=$(run_query "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'hr_public' AND table_name = '$table';")
    if [ "$exists" = "1" ]; then
        echo "✓ Core table '$table' exists"
    else
        echo "✗ FAIL: Core table '$table' not found"
        exit 1
    fi
done

# Test 3: Verify extensions are installed
echo "Test 3: Checking required extensions..."
REQUIRED_EXTENSIONS="uuid-ossp pgcrypto"
for ext in $REQUIRED_EXTENSIONS; do
    installed=$(run_query "SELECT COUNT(*) FROM pg_extension WHERE extname = '$ext';")
    if [ "$installed" = "1" ]; then
        echo "✓ Extension '$ext' installed"
    else
        echo "✗ FAIL: Extension '$ext' not installed"
        exit 1
    fi
done

# Test 4: Verify foreign key relationships
echo "Test 4: Checking foreign key constraints..."
fk_count=$(run_query "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'hr_public';")
MIN_FK=10

if [ "$fk_count" -ge $MIN_FK ]; then
    echo "✓ Found $fk_count foreign key constraints (minimum: $MIN_FK)"
else
    echo "✗ FAIL: Only $fk_count foreign keys found, expected at least $MIN_FK"
    exit 1
fi

# Test 5: Verify unique constraints on critical fields
echo "Test 5: Checking unique constraints..."
UNIQUE_CONSTRAINTS="users:email departments:name"
for constraint in $UNIQUE_CONSTRAINTS; do
    table=$(echo $constraint | cut -d: -f1)
    column=$(echo $constraint | cut -d: -f2)
    unique_exists=$(run_query "SELECT COUNT(*) FROM information_schema.table_constraints tc JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = 'hr_public' AND tc.table_name = '$table' AND ccu.column_name = '$column';")

    if [ "$unique_exists" -ge "1" ]; then
        echo "✓ Unique constraint exists for $table.$column"
    else
        echo "✗ FAIL: Unique constraint missing for $table.$column"
        exit 1
    fi
done

# Test 6: Verify RLS (Row Level Security) is enabled
echo "Test 6: Checking Row Level Security..."
rls_tables=$(run_query "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'hr_public' AND rowsecurity = true;")
if [ "$rls_tables" -gt "0" ]; then
    echo "✓ Row Level Security enabled on $rls_tables tables"
else
    echo "✗ FAIL: No tables have Row Level Security enabled"
    exit 1
fi

echo "=== Schema Integrity Test PASSED ==="
echo "Database schema is properly initialized and complete"