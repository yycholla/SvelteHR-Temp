#!/bin/bash

# Seed test database with fixture data for Puppeteer E2E tests
# This script uses the Rust backend's seed-data binary to populate the test database

set -e

echo "Seeding test database..."

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

if [ "$DB_EXISTS" != "1" ]; then
  echo "Error: Test database '$DB_NAME' does not exist. Run create-test-db.sh first."
  exit 1
fi

echo "Running Rust backend seed data..."
cd "$RUST_BACKEND_DIR"

# Run seed-data binary with test database URL
DATABASE_URL="$TEST_DATABASE_URL" cargo run --bin seed-data

echo "Test database seeding complete"
