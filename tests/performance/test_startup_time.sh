#!/bin/bash
# T008: Performance timing test (30-second target) using shell timing
# This test validates PostgreSQL container initialization completes within 30 seconds
# MUST fail initially to demonstrate TDD approach

set -e

echo "=== Performance Timing Test ==="
echo "Testing PostgreSQL container initialization performance (target: <30s)..."

# Configuration
CONTAINER_NAME="sveltehr-postgres-dev"
MAX_STARTUP_TIME=30
DB_NAME="hr_system"
DB_USER="postgres"
DB_PASSWORD="postgres123"

# Ensure clean start
echo "Preparing clean test environment..."
cd dev-containers
docker-compose -f docker-compose.dev.yml down postgres-dev > /dev/null 2>&1 || true
docker volume rm sveltehr_postgres_dev_data > /dev/null 2>&1 || true

echo "Starting performance timing test..."

# Test 1: Container startup time
echo "Test 1: Measuring container startup time..."
start_time=$(date +%s)

# Start the container
docker-compose -f docker-compose.dev.yml up postgres-dev -d

# Test 2: Time to container running state
echo "Test 2: Waiting for container to reach running state..."
container_start_time=$start_time
while true; do
    current_time=$(date +%s)
    elapsed=$((current_time - container_start_time))

    if [ $elapsed -gt $MAX_STARTUP_TIME ]; then
        echo "✗ FAIL: Container failed to start within ${MAX_STARTUP_TIME} seconds"
        docker logs $CONTAINER_NAME --tail=50
        exit 1
    fi

    status=$(docker inspect --format='{{.State.Status}}' $CONTAINER_NAME 2>/dev/null || echo "not-found")
    if [ "$status" = "running" ]; then
        container_running_time=$((current_time - start_time))
        echo "✓ Container running after ${container_running_time} seconds"
        break
    fi

    sleep 1
done

# Test 3: Time to database accepting connections
echo "Test 3: Waiting for database to accept connections..."
db_ready_time=$start_time
while true; do
    current_time=$(date +%s)
    elapsed=$((current_time - db_ready_time))

    if [ $elapsed -gt $MAX_STARTUP_TIME ]; then
        echo "✗ FAIL: Database failed to accept connections within ${MAX_STARTUP_TIME} seconds"
        docker logs $CONTAINER_NAME --tail=50
        exit 1
    fi

    if docker exec -e PGPASSWORD=$DB_PASSWORD $CONTAINER_NAME \
        psql -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
        db_connection_time=$((current_time - start_time))
        echo "✓ Database accepting connections after ${db_connection_time} seconds"
        break
    fi

    sleep 1
done

# Test 4: Time to schema fully initialized
echo "Test 4: Waiting for complete schema initialization..."
schema_ready_time=$start_time
while true; do
    current_time=$(date +%s)
    elapsed=$((current_time - schema_ready_time))

    if [ $elapsed -gt $MAX_STARTUP_TIME ]; then
        echo "✗ FAIL: Schema initialization failed to complete within ${MAX_STARTUP_TIME} seconds"
        docker logs $CONTAINER_NAME --tail=50
        exit 1
    fi

    # Check if all schemas exist
    schemas_count=$(docker exec -e PGPASSWORD=$DB_PASSWORD $CONTAINER_NAME \
        psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name IN ('hr_public', 'hr_private', 'hr_hidden');" 2>/dev/null | xargs || echo "0")

    # Check if minimum tables exist
    tables_count=$(docker exec -e PGPASSWORD=$DB_PASSWORD $CONTAINER_NAME \
        psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'hr_public';" 2>/dev/null | xargs || echo "0")

    if [ "$schemas_count" = "3" ] && [ "$tables_count" -ge "10" ]; then
        schema_init_time=$((current_time - start_time))
        echo "✓ Schema initialization complete after ${schema_init_time} seconds"
        break
    fi

    sleep 1
done

# Test 5: Time to health check passing
echo "Test 5: Waiting for health check to pass..."
health_ready_time=$start_time
while true; do
    current_time=$(date +%s)
    elapsed=$((current_time - health_ready_time))

    if [ $elapsed -gt $MAX_STARTUP_TIME ]; then
        echo "✗ FAIL: Health check failed to pass within ${MAX_STARTUP_TIME} seconds"
        docker logs $CONTAINER_NAME --tail=50
        exit 1
    fi

    health_status=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME 2>/dev/null || echo "none")
    if [ "$health_status" = "healthy" ]; then
        health_check_time=$((current_time - start_time))
        echo "✓ Health check passed after ${health_check_time} seconds"
        break
    fi

    sleep 1
done

# Final timing results
end_time=$(date +%s)
total_time=$((end_time - start_time))

echo ""
echo "=== Performance Timing Results ==="
echo "Container running:      ${container_running_time}s"
echo "Database connection:    ${db_connection_time}s"
echo "Schema initialization:  ${schema_init_time}s"
echo "Health check passed:    ${health_check_time}s"
echo "Total startup time:     ${total_time}s"
echo "Target:                 <${MAX_STARTUP_TIME}s"
echo ""

# Performance assessment
if [ $total_time -le $MAX_STARTUP_TIME ]; then
    echo "✓ PERFORMANCE TEST PASSED"
    echo "  Container initialization completed within target time"

    # Performance grading
    if [ $total_time -le 10 ]; then
        echo "  Performance Grade: EXCELLENT (<10s)"
    elif [ $total_time -le 20 ]; then
        echo "  Performance Grade: GOOD (10-20s)"
    else
        echo "  Performance Grade: ACCEPTABLE (20-30s)"
    fi
else
    echo "✗ PERFORMANCE TEST FAILED"
    echo "  Container initialization exceeded ${MAX_STARTUP_TIME}s target"
    echo "  Actual time: ${total_time}s"
    exit 1
fi

# Test 6: Performance with existing data (restart test)
echo ""
echo "Test 6: Testing restart performance with existing data..."
restart_start_time=$(date +%s)

# Restart the container
docker-compose -f docker-compose.dev.yml restart postgres-dev

# Wait for health check
while true; do
    current_time=$(date +%s)
    restart_elapsed=$((current_time - restart_start_time))

    if [ $restart_elapsed -gt 15 ]; then  # Restart should be faster
        echo "! Warning: Restart took longer than expected (${restart_elapsed}s)"
        break
    fi

    health_status=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME 2>/dev/null || echo "none")
    if [ "$health_status" = "healthy" ]; then
        restart_time=$((current_time - restart_start_time))
        echo "✓ Restart completed in ${restart_time}s (with existing data)"
        break
    fi

    sleep 1
done

echo "=== Performance Timing Test PASSED ==="