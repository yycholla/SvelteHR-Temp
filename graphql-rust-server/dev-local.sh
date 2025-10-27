#!/bin/bash
# Quick start script for native local development
# This script runs the Rust GraphQL server on your host machine (not in Docker)

set -e

echo "🚀 SvelteHR GraphQL Server - Native Local Development"
echo "======================================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found!"
    echo "   Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file. Please review and adjust if needed."
    echo ""
fi

# Check if PostgreSQL is accessible
echo "🔍 Checking database connection..."
if ! command -v psql &> /dev/null; then
    echo "⚠️  psql command not found. Install postgresql-client to verify database connection."
else
    if psql postgresql://postgres:postgres123@localhost:5433/hr_system -c "SELECT 1;" &> /dev/null; then
        echo "✅ Database connection successful!"
    else
        echo "❌ Cannot connect to database!"
        echo ""
        echo "Make sure Docker services are running:"
        echo "  cd ../dev-containers"
        echo "  docker-compose -f docker-compose.dev.yml up -d postgres-dev"
        echo ""
        exit 1
    fi
fi

echo ""
echo "🔨 Building project..."
cargo build

echo ""
echo "📦 Running migrations..."
if [ -f ./target/debug/migration ]; then
    ./target/debug/migration up
else
    echo "⚠️  Migration binary not found. Building..."
    cargo build --bin migration
    ./target/debug/migration up
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Starting development server with bacon..."
echo "Press Ctrl+C to stop"
echo ""
echo "Available at:"
echo "  GraphQL API:        http://localhost:4000/graphql"
echo "  GraphQL Playground: http://localhost:4000"
echo "  Health Check:       http://localhost:4000/health"
echo ""
echo "Bacon commands:"
echo "  h = help"
echo "  c = cargo check"
echo "  t = cargo test"
echo "  l = cargo clippy"
echo "  q = quit"
echo ""

# Check if bacon is installed
if ! command -v bacon &> /dev/null; then
    echo "⚠️  Bacon not installed. Installing..."
    cargo install bacon
fi

# Start bacon
exec bacon run
