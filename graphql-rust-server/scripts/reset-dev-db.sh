#!/bin/bash
# Reset development database to production-ready state from scratch
# This ensures migrations are the single source of truth
# Works with Docker containerized setup

set -e

echo "🔄 Resetting development database..."
echo ""

# Check if containers are running
if ! docker ps | grep -q sveltehr-graphql-rust; then
    echo "❌ Backend container not running. Start with: make dev"
    exit 1
fi

if ! docker ps | grep -q sveltehr-postgres-dev; then
    echo "❌ PostgreSQL container not running. Start with: make dev"
    exit 1
fi

# Run fresh migrations inside the Rust container
echo "Running migrations inside Docker container..."
docker exec sveltehr-graphql-rust sh -c 'cd /app && cargo run --bin migration -- fresh'

echo ""
echo "✅ Database reset complete!"
echo ""
echo "📊 Database status:"
docker exec sveltehr-postgres-dev psql -U postgres -d hr_system -c "
SELECT
    schemaname,
    COUNT(*) as table_count
FROM pg_tables
WHERE schemaname = 'hr_public'
GROUP BY schemaname;
"

echo ""
echo "👤 Seed data:"
docker exec sveltehr-postgres-dev psql -U postgres -d hr_system -c "
SELECT
    (SELECT COUNT(*) FROM hr_public.users) as users,
    (SELECT COUNT(*) FROM hr_public.roles) as roles,
    (SELECT COUNT(*) FROM hr_public.departments) as departments;
"

echo ""
echo "🔄 Restarting backend to reload schema..."
docker restart sveltehr-graphql-rust

echo ""
echo "🚀 Ready to develop!"
echo ""
echo "Services:"
echo "  📊 GraphQL API:  http://localhost:4000"
echo "  🎨 Frontend:     http://localhost:5173"
echo "  🗄️  PostgreSQL:   localhost:5433"
