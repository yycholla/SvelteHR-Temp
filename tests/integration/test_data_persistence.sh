#!/bin/bash
# T009: Data persistence test using Docker volume commands
# This test validates data persists across container restarts and maintains integrity
# MUST fail initially to demonstrate TDD approach

set -e

echo "=== Data Persistence Test ==="
echo "Testing PostgreSQL data persistence across container lifecycle..."

# Configuration
CONTAINER_NAME="sveltehr-postgres-dev"
VOLUME_NAME="sveltehr_postgres_dev_data"
DB_NAME="hr_system"
DB_USER="postgres"
DB_PASSWORD="postgres123"

# Helper function to run SQL query
run_query() {
    local query="$1"
    docker exec -e PGPASSWORD=$DB_PASSWORD $CONTAINER_NAME \
        psql -U $DB_USER -d $DB_NAME -t -c "$query" 2>/dev/null | xargs
}

# Helper function to wait for container health
wait_for_healthy() {
    local timeout=30
    local elapsed=0

    while [ $elapsed -lt $timeout ]; do
        health_status=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME 2>/dev/null || echo "none")
        if [ "$health_status" = "healthy" ]; then
            return 0
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done
    return 1
}

# Ensure container is running
echo "Setting up test environment..."
cd dev-containers
docker-compose -f docker-compose.dev.yml up postgres-dev -d

if ! wait_for_healthy; then
    echo "✗ FAIL: Container failed to become healthy"
    exit 1
fi

# Test 1: Insert test data
echo "Test 1: Inserting test data..."
TEST_DEPARTMENT_ID=$(run_query "SELECT id FROM hr_public.departments LIMIT 1;")

if [ -z "$TEST_DEPARTMENT_ID" ]; then
    # Insert a test department
    run_query "INSERT INTO hr_public.departments (id, name, description, created_at, updated_at) VALUES (uuid_generate_v4(), 'Test Department', 'Test data for persistence testing', NOW(), NOW()) RETURNING id;"
    TEST_DEPARTMENT_ID=$(run_query "SELECT id FROM hr_public.departments WHERE name = 'Test Department';")
fi

# Insert test user
TEST_USER_EMAIL="test.persistence@example.com"
run_query "INSERT INTO hr_public.users (id, email, first_name, last_name, password_hash, role, department_id, is_active, created_at, updated_at) VALUES (uuid_generate_v4(), '$TEST_USER_EMAIL', 'Test', 'Persistence', crypt('testpass', gen_salt('bf')), 'hr_employee', '$TEST_DEPARTMENT_ID', true, NOW(), NOW()) ON CONFLICT (email) DO UPDATE SET first_name = 'Test';"

# Verify test data insertion
TEST_USER_ID=$(run_query "SELECT id FROM hr_public.users WHERE email = '$TEST_USER_EMAIL';")
if [ -n "$TEST_USER_ID" ]; then
    echo "✓ Test data inserted successfully"
    echo "  Test User ID: $TEST_USER_ID"
    echo "  Test Department ID: $TEST_DEPARTMENT_ID"
else
    echo "✗ FAIL: Test data insertion failed"
    exit 1
fi

# Test 2: Container restart test
echo "Test 2: Testing data persistence through container restart..."
docker-compose -f docker-compose.dev.yml restart postgres-dev

if ! wait_for_healthy; then
    echo "✗ FAIL: Container failed to restart healthily"
    exit 1
fi

# Verify data persisted after restart
persisted_user_id=$(run_query "SELECT id FROM hr_public.users WHERE email = '$TEST_USER_EMAIL';")
if [ "$persisted_user_id" = "$TEST_USER_ID" ]; then
    echo "✓ User data persisted through restart"
else
    echo "✗ FAIL: User data lost after restart"
    echo "  Expected: $TEST_USER_ID"
    echo "  Found: $persisted_user_id"
    exit 1
fi

# Test 3: Container stop/start test
echo "Test 3: Testing data persistence through container stop/start..."
docker-compose -f docker-compose.dev.yml stop postgres-dev
docker-compose -f docker-compose.dev.yml start postgres-dev

if ! wait_for_healthy; then
    echo "✗ FAIL: Container failed to start after stop"
    exit 1
fi

# Verify data persisted after stop/start
persisted_user_id=$(run_query "SELECT id FROM hr_public.users WHERE email = '$TEST_USER_EMAIL';")
if [ "$persisted_user_id" = "$TEST_USER_ID" ]; then
    echo "✓ User data persisted through stop/start cycle"
else
    echo "✗ FAIL: User data lost after stop/start"
    exit 1
fi

# Test 4: Data modification and persistence
echo "Test 4: Testing data modification persistence..."
UPDATED_FIRST_NAME="UpdatedTest"
run_query "UPDATE hr_public.users SET first_name = '$UPDATED_FIRST_NAME', updated_at = NOW() WHERE email = '$TEST_USER_EMAIL';"

# Restart container to test modification persistence
docker-compose -f docker-compose.dev.yml restart postgres-dev

if ! wait_for_healthy; then
    echo "✗ FAIL: Container failed to restart after data modification"
    exit 1
fi

# Verify modification persisted
persisted_name=$(run_query "SELECT first_name FROM hr_public.users WHERE email = '$TEST_USER_EMAIL';")
if [ "$persisted_name" = "$UPDATED_FIRST_NAME" ]; then
    echo "✓ Data modifications persisted through restart"
else
    echo "✗ FAIL: Data modifications lost after restart"
    echo "  Expected: $UPDATED_FIRST_NAME"
    echo "  Found: $persisted_name"
    exit 1
fi

# Test 5: Volume integrity check
echo "Test 5: Checking Docker volume integrity..."
volume_exists=$(docker volume inspect $VOLUME_NAME > /dev/null 2>&1 && echo "true" || echo "false")

if [ "$volume_exists" = "true" ]; then
    echo "✓ Named volume exists and is accessible"

    # Check volume size (should be reasonable for a development database)
    volume_size=$(docker run --rm -v $VOLUME_NAME:/data alpine du -sh /data | cut -f1)
    echo "  Volume size: $volume_size"

    # Volume should contain PostgreSQL data files
    has_postgres_data=$(docker run --rm -v $VOLUME_NAME:/data alpine ls -la /data | grep -c "base\|global\|pg_" || echo "0")
    if [ "$has_postgres_data" -gt "0" ]; then
        echo "✓ Volume contains PostgreSQL data files"
    else
        echo "✗ FAIL: Volume missing PostgreSQL data files"
        exit 1
    fi
else
    echo "✗ FAIL: Named volume not found"
    exit 1
fi

# Test 6: Schema preservation test
echo "Test 6: Testing schema structure persistence..."
schema_count=$(run_query "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name IN ('hr_public', 'hr_private', 'hr_hidden');")
table_count=$(run_query "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'hr_public';")
role_count=$(run_query "SELECT COUNT(*) FROM pg_roles WHERE rolname LIKE 'hr_%' OR rolname = 'postgraphile_app';")

if [ "$schema_count" = "3" ] && [ "$table_count" -ge "10" ] && [ "$role_count" -ge "5" ]; then
    echo "✓ Database schema structure preserved"
    echo "  Schemas: $schema_count/3"
    echo "  Tables: $table_count (≥10)"
    echo "  Roles: $role_count (≥5)"
else
    echo "✗ FAIL: Database schema structure incomplete"
    echo "  Schemas: $schema_count/3"
    echo "  Tables: $table_count"
    echo "  Roles: $role_count"
    exit 1
fi

# Test 7: Seed data preservation
echo "Test 7: Checking seed data preservation..."
admin_count=$(run_query "SELECT COUNT(*) FROM hr_public.users WHERE email LIKE '%admin%' OR role = 'hr_super_admin';")
department_count=$(run_query "SELECT COUNT(*) FROM hr_public.departments;")

if [ "$admin_count" -ge "1" ] && [ "$department_count" -ge "4" ]; then
    echo "✓ Seed data preserved"
    echo "  Admin users: $admin_count"
    echo "  Departments: $department_count"
else
    echo "✗ FAIL: Seed data incomplete"
    echo "  Admin users: $admin_count"
    echo "  Departments: $department_count"
    exit 1
fi

# Test 8: Cleanup test data
echo "Test 8: Cleaning up test data..."
run_query "DELETE FROM hr_public.users WHERE email = '$TEST_USER_EMAIL';"
run_query "DELETE FROM hr_public.departments WHERE name = 'Test Department';"

deleted_user=$(run_query "SELECT COUNT(*) FROM hr_public.users WHERE email = '$TEST_USER_EMAIL';")
if [ "$deleted_user" = "0" ]; then
    echo "✓ Test data cleaned up successfully"
else
    echo "! Warning: Test data cleanup incomplete"
fi

echo "=== Data Persistence Test PASSED ==="
echo "All data successfully persists across container lifecycle operations"
echo "Volume integrity maintained with proper PostgreSQL data structure"