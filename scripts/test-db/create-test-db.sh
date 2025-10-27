#!/bin/bash

# Create isolated test database for Puppeteer E2E tests
# This script creates the sveltehr_test database and applies schema migrations via Rust backend

set -e

echo "Creating test database..."

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
  echo "Test database '$DB_NAME' already exists"
else
  echo "Creating database '$DB_NAME'..."
  createdb -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" "$DB_NAME"
  echo "Test database created successfully"
fi

# Run migrations through Rust backend
echo "Running database migrations..."
cd "$RUST_BACKEND_DIR"
DATABASE_URL="$TEST_DATABASE_URL" cargo run --bin migration -- up

echo "Test database setup complete"
