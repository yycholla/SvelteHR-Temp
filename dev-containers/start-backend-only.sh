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

# Build and start only backend containers
echo "🔨 Building backend container..."
cd "$SCRIPT_DIR"
docker-compose -f docker-compose.dev.yml build backend-dev

echo "🚀 Starting backend services..."
docker-compose -f docker-compose.dev.yml up -d postgres-dev redis-dev backend-dev

echo ""
echo "⏳ Waiting for services to become healthy..."
sleep 5

# Check PostgreSQL
echo -n "⏳ Checking PostgreSQL"
for i in {1..30}; do
    if docker exec sveltehr-postgres-dev pg_isready -U postgres -d hr_system > /dev/null 2>&1; then
        echo " ✅"
        break
    fi
    echo -n "."
    sleep 2
done

# Check Redis
echo -n "⏳ Checking Redis"
for i in {1..15}; do
    if docker exec sveltehr-redis-dev redis-cli ping > /dev/null 2>&1; then
        echo " ✅"
        break
    fi
    echo -n "."
    sleep 2
done

# Check Backend API
echo -n "⏳ Checking Backend API"
for i in {1..30}; do
    if curl -sf http://localhost:4000/health > /dev/null 2>&1; then
        echo " ✅"
        break
    fi
    echo -n "."
    sleep 2
done

echo ""
echo "✅ Backend services started successfully!"
echo ""
echo "🔗 Backend Services:"
echo "   📊 Backend API:     http://localhost:4000"
echo "   🔍 GraphiQL:        http://localhost:5000"
echo "   🗄️  PostgreSQL:     localhost:5433 (postgres/postgres123)"
echo "   🔴 Redis:           localhost:6380"
echo ""
echo "🔑 SSH Access:"
echo "   📡 Backend:         ssh dev@localhost -p 2222"
echo "   🔐 Password:        dev"
echo ""
echo "💡 Next Steps:"
echo "   Run 'npm run dev' in the project root to start the frontend"
echo "   Or run 'make frontend-dev' to start the frontend automatically"
echo ""