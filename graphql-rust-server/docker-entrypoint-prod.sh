#!/bin/sh
set -e

echo "🚀 Starting SvelteHR GraphQL Rust Server (PRODUCTION MODE)..."
echo ""
echo "⚠️  NOTE: This entrypoint is DEPRECATED for Kubernetes deployments."
echo "   For Kubernetes: Migrations run as separate Job (k8s/base/migration-job.yaml)"
echo "   This script is maintained for Docker Compose and local development only."
echo ""

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."

# Parse DATABASE_URL to extract host
DB_HOST=$(echo $DATABASE_URL | sed -E 's|.*@([^:]+):.*|\1|')
DB_NAME=$(echo $DATABASE_URL | sed -E 's|.*/([^?]+).*|\1|')

# Wait for PostgreSQL with timeout
RETRIES=30
until pg_isready -h "$DB_HOST" -U postgres -d "$DB_NAME" >/dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
  echo "   PostgreSQL is unavailable - sleeping (retries left: $RETRIES)"
  RETRIES=$((RETRIES-1))
  sleep 2
done

if [ $RETRIES -eq 0 ]; then
  echo "❌ PostgreSQL failed to become ready after 60 seconds"
  exit 1
fi

echo "✅ PostgreSQL is ready!"

# Run SeaORM migrations (ONLY for Docker Compose/local development)
# For Kubernetes: Use k8s/base/migration-job.yaml instead
if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "📦 Running SeaORM database migrations..."
    echo "   (Set RUN_MIGRATIONS=false to skip)"

    if ./migration-bin up; then
        echo "✅ Migrations completed successfully!"
    else
        echo "❌ Migration failed! Exiting..."
        exit 1
    fi
else
    echo "⏭️  Migrations skipped (RUN_MIGRATIONS not set to 'true')"
    echo "   For Kubernetes: Migrations run as pre-install Job"
fi

# Optional: Seed admin user if SEED_ADMIN_USER is enabled
if [ "$SEED_ADMIN_USER" = "true" ]; then
    echo "👤 Seeding admin user..."

    # Set environment for seed-data binary
    export ENABLE_SEED_DATA=true
    export ENVIRONMENT=production

    # Run seed-data binary (admin-only seed in production)
    ./seed-data-bin
    SEED_EXIT_CODE=$?

    if [ $SEED_EXIT_CODE -eq 0 ]; then
        echo "✅ Admin user seeded successfully!"
    elif [ $SEED_EXIT_CODE -eq 1 ]; then
        echo "⚠️  Production safety block or seed data already exists - continuing"
    else
        echo "⚠️  Admin user seed exited with code $SEED_EXIT_CODE - continuing anyway"
    fi
else
    echo "⏭️  Admin user seeding disabled (SEED_ADMIN_USER not set)"
fi

# Start the GraphQL server
echo "🎯 Starting GraphQL API server..."
echo "   Environment: $ENVIRONMENT"
echo "   Host: $HOST"
echo "   Port: $PORT"
echo ""

exec ./hr-graphql-server
