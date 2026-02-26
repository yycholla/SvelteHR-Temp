#!/bin/bash

# Start only backend services (PostgreSQL, Redis, Backend API)
# Frontend will run on the host

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 Starting SvelteHR Backend Services..."
echo "========================================"
echo "📁 Project root: $PROJECT_ROOT"
echo ""

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if containers need to be built
cd "$SCRIPT_DIR"
if ! docker images | grep -q sveltehr-graphql-rust; then
    echo "🔨 Building backend container (first time)..."
    docker compose -f docker-compose.dev.yml build hr-graphql-rust
else
    echo "✅ Using existing backend container (run 'make dev-rebuild' to rebuild)"
fi

echo "🚀 Starting backend services..."
docker compose -f docker-compose.dev.yml up -d postgres-dev redis-dev hr-graphql-rust

echo ""
echo "✅ Backend services starting..."
echo ""
echo "🔗 Backend Services:"
echo "   📊 Backend API:     http://localhost:4000"
echo "   🔍 GraphiQL:        http://localhost:4000/graphql"
echo "   🗄️  PostgreSQL:     localhost:5433 (postgres/postgres123)"
echo "   🔴 Redis:           localhost:6380"
echo ""
echo "💡 Note: Services may take 10-20 seconds to become fully available"
echo "   Run 'make dev-health' to check service readiness"
echo "   Run 'make dev-logs' to view container logs"
echo ""
