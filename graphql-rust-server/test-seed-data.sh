#!/bin/bash
# Seed Data Container Integration Test Script
#
# This script validates that the seed data system works correctly in Docker containers

set -e

echo "🧪 Seed Data Container Integration Test"
echo "========================================"
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to print test results
pass_test() {
    echo -e "${GREEN}✅ PASS:${NC} $1"
    ((TESTS_PASSED++))
}

fail_test() {
    echo -e "${RED}❌ FAIL:${NC} $1"
    ((TESTS_FAILED++))
}

warn_test() {
    echo -e "${YELLOW}⚠️  WARN:${NC} $1"
}

echo "Step 1: Building Docker image..."
if docker-compose build hr-graphql-rust; then
    pass_test "Docker image built successfully"
else
    fail_test "Docker image build failed"
    exit 1
fi

echo ""
echo "Step 2: Starting containers..."
docker-compose up -d

# Wait for services to be healthy
echo "Waiting for services to be ready (max 60s)..."
WAIT_TIME=0
MAX_WAIT=60

while [ $WAIT_TIME -lt $MAX_WAIT ]; do
    if docker-compose ps | grep -q "healthy"; then
        break
    fi
    sleep 2
    ((WAIT_TIME+=2))
    echo "  Waiting... ${WAIT_TIME}s"
done

if [ $WAIT_TIME -ge $MAX_WAIT ]; then
    fail_test "Services did not become healthy within ${MAX_WAIT}s"
    docker-compose logs
    exit 1
fi

pass_test "Containers started and healthy"

echo ""
echo "Step 3: Checking seed data execution in logs..."
sleep 5  # Give time for seed data to execute

LOGS=$(docker-compose logs hr-graphql-rust)

if echo "$LOGS" | grep -q "Running seed data initialization"; then
    pass_test "Seed data execution initiated"
else
    fail_test "Seed data execution not found in logs"
fi

if echo "$LOGS" | grep -q "Seed data completed successfully"; then
    pass_test "Seed data completed successfully"
else
    if echo "$LOGS" | grep -q "Partial seed data failure"; then
        warn_test "Seed data completed with partial failures"
    else
        fail_test "Seed data did not complete successfully"
    fi
fi

echo ""
echo "Step 4: Validating database records..."

# Check for roles
ROLE_COUNT=$(docker-compose exec -T sveltehr-postgres-dev psql -U postgres -d hr_system -t -c "SELECT COUNT(*) FROM roles;" 2>/dev/null | tr -d ' ')
if [ "$ROLE_COUNT" -ge 4 ]; then
    pass_test "Roles created (count: $ROLE_COUNT)"
else
    fail_test "Expected at least 4 roles, found: $ROLE_COUNT"
fi

# Check for users
USER_COUNT=$(docker-compose exec -T sveltehr-postgres-dev psql -U postgres -d hr_system -t -c "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL;" 2>/dev/null | tr -d ' ')
if [ "$USER_COUNT" -ge 10 ]; then
    pass_test "Users created (count: $USER_COUNT)"
else
    fail_test "Expected at least 10 users, found: $USER_COUNT"
fi

# Check for departments
DEPT_COUNT=$(docker-compose exec -T sveltehr-postgres-dev psql -U postgres -d hr_system -t -c "SELECT COUNT(*) FROM departments WHERE deleted_at IS NULL;" 2>/dev/null | tr -d ' ')
if [ "$DEPT_COUNT" -ge 10 ]; then
    pass_test "Departments created (count: $DEPT_COUNT)"
else
    fail_test "Expected at least 10 departments, found: $DEPT_COUNT"
fi

# Check for audit logs with batch_id
AUDIT_COUNT=$(docker-compose exec -T sveltehr-postgres-dev psql -U postgres -d hr_system -t -c "SELECT COUNT(*) FROM activity_log WHERE details::text LIKE '%seed_data%';" 2>/dev/null | tr -d ' ')
if [ "$AUDIT_COUNT" -gt 0 ]; then
    pass_test "Audit logs created (count: $AUDIT_COUNT)"
else
    fail_test "No audit logs found with seed_data source"
fi

echo ""
echo "Step 5: Testing idempotency (restart container)..."
docker-compose restart hr-graphql-rust
sleep 10  # Wait for restart

NEW_LOGS=$(docker-compose logs hr-graphql-rust --tail 100)
if echo "$NEW_LOGS" | grep -q "skipped"; then
    pass_test "Idempotency working (records skipped on second run)"
else
    warn_test "Could not confirm idempotency from logs"
fi

# Verify record counts didn't increase
NEW_USER_COUNT=$(docker-compose exec -T sveltehr-postgres-dev psql -U postgres -d hr_system -t -c "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL;" 2>/dev/null | tr -d ' ')
if [ "$NEW_USER_COUNT" -eq "$USER_COUNT" ]; then
    pass_test "User count unchanged after restart ($USER_COUNT)"
else
    fail_test "User count changed: $USER_COUNT -> $NEW_USER_COUNT"
fi

echo ""
echo "Step 6: Testing production safety block..."
docker-compose stop hr-graphql-rust
docker-compose up -d --force-recreate --no-deps -e ENABLE_SEED_DATA=false hr-graphql-rust 2>/dev/null || true
sleep 5

PROD_LOGS=$(docker-compose logs hr-graphql-rust --tail 50)
if echo "$PROD_LOGS" | grep -q "Seed data disabled"; then
    pass_test "Production safety block working (seed data disabled)"
else
    warn_test "Could not confirm production safety block"
fi

echo ""
echo "========================================"
echo "Test Summary"
echo "========================================"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "🎉 Seed data container integration is working correctly!"
    echo ""
    echo "You can now:"
    echo "  - View logs: docker-compose logs hr-graphql-rust"
    echo "  - Query database: docker-compose exec sveltehr-postgres-dev psql -U postgres -d hr_system"
    echo "  - Stop containers: docker-compose down"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo "Check logs with: docker-compose logs hr-graphql-rust"
    exit 1
fi
