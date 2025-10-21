#!/bin/bash
# Reset development database to production-ready state from scratch
# This ensures migrations are the single source of truth

set -e

echo "🔄 Resetting development database..."
echo ""

# Run fresh migrations (drops all tables and reapplies)
cd "$(dirname "$0")/.."
cargo run --bin migration -- fresh

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
echo "🚀 Ready to develop!"
