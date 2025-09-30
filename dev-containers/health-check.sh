#!/bin/bash

# Health check script for development containers
# Waits for all services to be healthy before completing

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🏥 Checking development environment health..."
echo ""

# Function to wait for a service
wait_for_service() {
    local service_name=$1
    local check_command=$2
    local max_attempts=30
    local attempt=1

    echo -n "⏳ Waiting for $service_name"
    while [ $attempt -le $max_attempts ]; do
        if eval "$check_command" > /dev/null 2>&1; then
            echo " ✅"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done

    echo " ❌"
    echo "⚠️  Timeout waiting for $service_name"
    return 1
}

# Check PostgreSQL
wait_for_service "PostgreSQL" \
    "docker exec sveltehr-postgres-dev pg_isready -U postgres -d hr_system"

# Check Redis
wait_for_service "Redis" \
    "docker exec sveltehr-redis-dev redis-cli ping"

# Check Backend API
wait_for_service "Backend API (PostGraphile)" \
    "curl -sf http://localhost:4000/health"

# Check Frontend
wait_for_service "Frontend (SvelteKit)" \
    "curl -sf http://localhost:5173"

echo ""
echo "✅ All services are healthy!"
echo ""
echo "🔗 Access Information:"
echo "   📊 Backend API:     http://localhost:4000"
echo "   🎨 Frontend:        http://localhost:5173"
echo "   🔍 GraphiQL:        http://localhost:5000"
echo "   🗄️  PostgreSQL:     localhost:5433 (postgres/postgres123)"
echo "   🔴 Redis:           localhost:6380"
echo ""