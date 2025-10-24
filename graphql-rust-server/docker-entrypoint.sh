#!/bin/bash
set -e

echo "🚀 Starting SvelteHR GraphQL Rust Server..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until pg_isready -h "$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\).*/\1/p')" -U postgres; do
  echo "   PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "✅ PostgreSQL is ready!"

# Run SeaORM migrations
echo "📦 Running SeaORM database migrations..."
/app/migration up

if [ $? -eq 0 ]; then
    echo "✅ Migrations completed successfully!"
else
    echo "❌ Migration failed! Exiting..."
    exit 1
fi

# Run seed data if enabled
if [ "$ENABLE_SEED_DATA" = "true" ] || [ "$ENVIRONMENT" = "development" ]; then
    echo "🌱 Running seed data initialization..."

    /app/seed-data
    SEED_EXIT_CODE=$?

    if [ $SEED_EXIT_CODE -eq 0 ]; then
        echo "✅ Seed data completed successfully!"
    elif [ $SEED_EXIT_CODE -eq 1 ]; then
        echo "⚠️  Production safety block - continuing without seed data"
    elif [ $SEED_EXIT_CODE -eq 2 ]; then
        echo "❌ Seed data database connection failed!"
        exit 2
    elif [ $SEED_EXIT_CODE -eq 3 ]; then
        echo "⚠️  Partial seed data failure - continuing anyway"
    else
        echo "⚠️  Seed data exited with code $SEED_EXIT_CODE - continuing anyway"
    fi
else
    echo "⏭️  Seed data disabled (ENABLE_SEED_DATA not set)"
fi

# Start the GraphQL server
echo "🚀 Starting GraphQL server on $HOST:$PORT..."
exec "$@"
