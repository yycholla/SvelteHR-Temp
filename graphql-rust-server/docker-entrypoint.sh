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

# Start the GraphQL server
echo "🚀 Starting GraphQL server on $HOST:$PORT..."
exec "$@"
