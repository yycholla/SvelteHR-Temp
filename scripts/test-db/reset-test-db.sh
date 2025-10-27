#!/bin/bash

# Reset test database to clean state with fresh seed data
# This script drops the database, recreates it, reapplies migrations, and reseeds via Rust backend

set -e

echo "Resetting test database..."

# Database configuration
DB_NAME="sveltehr_test"
DB_USER="${POSTGRES_USER:-postgres}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
TEST_DATABASE_URL="postgresql://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# Get Rust backend directory
RUST_BACKEND_DIR="$(dirname "$0")/../../graphql-rust-server"

if [ ! -d "$RUST_BACKEND_DIR" ]; then
  echo "Error: Rust backend directory not found at $RUST_BACKEND_DIR"
  exit 1
fi

# Check if database exists
DB_EXISTS=$(psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null || echo "0")

if [ "$DB_EXISTS" = "1" ]; then
  echo "Dropping existing test database..."
  # Terminate all connections to the database
  psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d postgres <<EOF
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '$DB_NAME'
  AND pid <> pg_backend_pid();
EOF

  dropdb -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" "$DB_NAME"
  echo "Test database dropped successfully"
fi

echo "Creating fresh test database..."
createdb -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" "$DB_NAME"

echo "Running database migrations..."
cd "$RUST_BACKEND_DIR"
DATABASE_URL="$TEST_DATABASE_URL" cargo run --bin migration -- up

echo "Running seed data..."
DATABASE_URL="$TEST_DATABASE_URL" cargo run --bin seed-data

echo "Test database reset complete"
