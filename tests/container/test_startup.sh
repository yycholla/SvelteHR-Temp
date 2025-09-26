#!/bin/bash
# T004: Container startup validation test using shell/Docker commands
# This test validates PostgreSQL container starts successfully within 30 seconds and accepts connections
# MUST fail initially to demonstrate TDD approach

set -e

echo "=== Container Startup Validation Test ==="
echo "Testing PostgreSQL container initialization and readiness..."

# Configuration
CONTAINER_NAME="sveltehr-postgres-dev"
MAX_WAIT_TIME=30
DB_NAME="hr_system"
DB_USER="postgres"
DB_PASSWORD="postgres123"

# Test 1: Container startup timing
echo "Test 1: Starting PostgreSQL container..."
start_time=$(date +%s)

# Start the container (this will fail initially as the setup isn't complete)
cd dev-containers
docker-compose -f docker-compose.dev.yml up postgres-dev -d

# Test 2: Wait for container to be healthy within 30 seconds
echo "Test 2: Waiting for container health check (max ${MAX_WAIT_TIME}s)..."
wait_time=0
while [ $wait_time -lt $MAX_WAIT_TIME ]; do
    if docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME | grep -q "healthy"; then
        end_time=$(date +%s)
        startup_time=$((end_time - start_time))
        echo "✓ Container healthy after ${startup_time} seconds"
        break
    fi
    echo "Waiting... (${wait_time}/${MAX_WAIT_TIME}s)"
    sleep 2
    wait_time=$((wait_time + 2))
done

if [ $wait_time -ge $MAX_WAIT_TIME ]; then
    echo "✗ FAIL: Container failed to become healthy within ${MAX_WAIT_TIME} seconds"
    docker logs $CONTAINER_NAME --tail=50
    exit 1
fi

# Test 3: Database connection test
echo "Test 3: Testing database connection..."
if docker exec -e PGPASSWORD=$DB_PASSWORD $CONTAINER_NAME \
    psql -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✓ Database connection successful"
else
    echo "✗ FAIL: Cannot connect to database"
    docker logs $CONTAINER_NAME --tail=20
    exit 1
fi

# Test 4: Verify all expected schemas exist
echo "Test 4: Checking required schemas..."
EXPECTED_SCHEMAS="hr_public hr_private hr_hidden"
for schema in $EXPECTED_SCHEMAS; do
    if docker exec -e PGPASSWORD=$DB_PASSWORD $CONTAINER_NAME \
        psql -U $DB_USER -d $DB_NAME -t -c "SELECT 1 FROM information_schema.schemata WHERE schema_name = '$schema';" | grep -q "1"; then
        echo "✓ Schema '$schema' exists"
    else
        echo "✗ FAIL: Required schema '$schema' not found"
        exit 1
    fi
done

echo "=== Container Startup Test PASSED ==="
echo "Startup time: ${startup_time} seconds (target: <30s)"