#!/bin/bash
set -e

echo "🚀 Starting SvelteHR GraphQL Rust Server (DEV MODE with Hot-Reloading)..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
until pg_isready -h postgres-dev -U postgres -d hr_system; do
  echo "   PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "✅ PostgreSQL is ready!"

# Run SeaORM migrations
echo "📦 Running SeaORM database migrations..."
cd /app && cargo build --release --bin migration

if ./target/release/migration up; then
    echo "✅ Migrations completed successfully!"
else
    echo "❌ Migration failed! Exiting..."
    exit 1
fi

# Run seed data if enabled
if [ "$ENABLE_SEED_DATA" = "true" ] || [ "$ENVIRONMENT" = "development" ]; then
    echo "🌱 Running seed data initialization..."

    if cargo build --release --bin seed-data >/dev/null 2>&1; then
        ./target/release/seed-data
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
        echo "⚠️  Seed data binary failed to compile - skipping seed data (database should already be seeded)"
    fi
else
    echo "⏭️  Seed data disabled (ENABLE_SEED_DATA not set)"
fi

# Start cargo-watch for hot-reloading
echo "🔥 Starting cargo-watch with hot-reloading..."
echo "   Watching: src/, migration/, Cargo.toml"
echo "   GraphQL API will be available at http://0.0.0.0:$PORT"
echo ""

exec cargo watch -x 'run --release --bin hr-graphql-server'
