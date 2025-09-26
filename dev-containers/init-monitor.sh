#!/bin/bash
# PostgreSQL Initialization Monitor and Error Handler
# This script provides enhanced error handling and timeout management for container initialization

set -e

CONTAINER_NAME="sveltehr-postgres-dev"
MAX_INIT_TIME=30
DB_NAME="hr_system"
DB_USER="postgres"
DB_PASSWORD="postgres123"

echo "=== PostgreSQL Initialization Monitor ==="
echo "Container: $CONTAINER_NAME"
echo "Max initialization time: ${MAX_INIT_TIME}s"
echo "Database: $DB_NAME"
echo ""

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to check container logs for errors
check_for_errors() {
    local logs=$(docker logs $CONTAINER_NAME --tail=50 2>&1)

    # Check for common PostgreSQL initialization errors
    if echo "$logs" | grep -qi "fatal\|error\|failed\|cannot"; then
        echo "⚠️  Potential errors detected in container logs:"
        echo "$logs" | grep -i "fatal\|error\|failed\|cannot" | tail -10
        return 1
    fi
    return 0
}

# Function to validate initialization files
validate_init_files() {
    log "Validating initialization files..."

    local init_files=(
        "../migrations/01-roles.sql"
        "../migrations/02-schema.sql"
        "../migrations/03-data.sql"
        "../migrations/04-indexes.sql"
    )

    for file in "${init_files[@]}"; do
        if [ ! -f "$file" ]; then
            log "❌ Missing initialization file: $file"
            return 1
        fi

        if [ ! -r "$file" ]; then
            log "❌ Cannot read initialization file: $file"
            return 1
        fi

        # Basic SQL syntax validation
        if ! grep -q ";" "$file"; then
            log "⚠️  Warning: $file may not contain valid SQL statements"
        fi

        log "✅ $file validated"
    done

    return 0
}

# Function to wait for container with timeout
wait_for_container() {
    local timeout=$1
    local start_time=$(date +%s)

    log "Waiting for container to be healthy (timeout: ${timeout}s)..."

    while true; do
        current_time=$(date +%s)
        elapsed=$((current_time - start_time))

        if [ $elapsed -ge $timeout ]; then
            log "❌ Timeout reached (${timeout}s) - container failed to initialize"
            check_for_errors
            return 1
        fi

        # Check container status
        status=$(docker inspect --format='{{.State.Status}}' $CONTAINER_NAME 2>/dev/null || echo "not-found")

        if [ "$status" = "exited" ]; then
            log "❌ Container exited unexpectedly"
            check_for_errors
            return 1
        elif [ "$status" = "running" ]; then
            # Check health status
            health=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME 2>/dev/null || echo "none")

            if [ "$health" = "healthy" ]; then
                log "✅ Container healthy after ${elapsed}s"
                return 0
            elif [ "$health" = "unhealthy" ]; then
                log "❌ Container marked unhealthy"
                check_for_errors
                return 1
            fi
        fi

        # Progress indicator
        if [ $((elapsed % 5)) -eq 0 ] && [ $elapsed -gt 0 ]; then
            log "Still waiting... (${elapsed}/${timeout}s)"
        fi

        sleep 1
    done
}

# Function to validate database initialization
validate_database() {
    log "Validating database initialization..."

    # Test database connection
    if ! docker exec -e PGPASSWORD=$DB_PASSWORD $CONTAINER_NAME \
        psql -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
        log "❌ Cannot connect to database"
        return 1
    fi

    log "✅ Database connection successful"

    # Check schemas
    schema_count=$(docker exec -e PGPASSWORD=$DB_PASSWORD $CONTAINER_NAME \
        psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name IN ('hr_public', 'hr_private', 'hr_hidden');" | xargs)

    if [ "$schema_count" != "3" ]; then
        log "❌ Expected 3 schemas, found $schema_count"
        return 1
    fi

    log "✅ All schemas present ($schema_count/3)"

    # Check tables
    table_count=$(docker exec -e PGPASSWORD=$DB_PASSWORD $CONTAINER_NAME \
        psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'hr_public';" | xargs)

    if [ "$table_count" -lt "10" ]; then
        log "❌ Expected at least 10 tables, found $table_count"
        return 1
    fi

    log "✅ Tables initialized ($table_count tables in hr_public)"

    # Check roles
    role_count=$(docker exec -e PGPASSWORD=$DB_PASSWORD $CONTAINER_NAME \
        psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM pg_roles WHERE rolname LIKE 'hr_%' OR rolname = 'postgraphile_app';" | xargs)

    if [ "$role_count" -lt "5" ]; then
        log "❌ Expected at least 5 HR roles, found $role_count"
        return 1
    fi

    log "✅ Roles configured ($role_count roles)"

    return 0
}

# Main execution
main() {
    local exit_code=0

    # Step 1: Validate initialization files before starting
    if ! validate_init_files; then
        log "❌ Initialization file validation failed"
        exit 1
    fi

    # Step 2: Start container if not running
    if ! docker inspect $CONTAINER_NAME > /dev/null 2>&1; then
        log "Starting PostgreSQL container..."
        cd "$(dirname "$0")"
        docker-compose -f docker-compose.dev.yml up postgres-dev -d
    fi

    # Step 3: Wait for container with timeout
    if ! wait_for_container $MAX_INIT_TIME; then
        log "❌ Container initialization failed"
        exit_code=1
    fi

    # Step 4: Validate database initialization
    if [ $exit_code -eq 0 ]; then
        if ! validate_database; then
            log "❌ Database validation failed"
            exit_code=1
        fi
    fi

    # Final status
    if [ $exit_code -eq 0 ]; then
        log "🎉 PostgreSQL initialization completed successfully"
        log "Container is ready for use"
    else
        log "💥 PostgreSQL initialization failed"
        log ""
        log "Recent container logs:"
        docker logs $CONTAINER_NAME --tail=20
        log ""
        log "For detailed troubleshooting, run:"
        log "  docker logs $CONTAINER_NAME"
        log "  docker exec -it $CONTAINER_NAME /bin/bash"
    fi

    return $exit_code
}

# Handle script arguments
case "${1:-start}" in
    "start")
        main
        ;;
    "validate")
        validate_database
        ;;
    "logs")
        docker logs $CONTAINER_NAME --tail=50
        ;;
    "check")
        validate_init_files
        ;;
    *)
        echo "Usage: $0 [start|validate|logs|check]"
        echo "  start    - Start and monitor container initialization (default)"
        echo "  validate - Validate database initialization"
        echo "  logs     - Show recent container logs"
        echo "  check    - Validate initialization files"
        exit 1
        ;;
esac