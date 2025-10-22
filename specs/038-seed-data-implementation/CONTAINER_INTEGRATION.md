# Container Integration Guide (Phase 9)

## Overview

This document outlines the remaining work to integrate the seed data binary with Docker container startup.

## Current Status

✅ **Completed**: Seed data binary fully implemented and functional
⏳ **Pending**: Container integration and automatic execution on startup

## Required Changes

### 1. Update Dockerfile

**File**: `/root/repo/graphql-rust-server/Dockerfile`

Add seed-data binary compilation:

```dockerfile
# Build stage
FROM rust:1.75 as builder
WORKDIR /app
COPY . .

# Build both main server and seed-data binary
RUN cargo build --release --bin hr-graphql-server
RUN cargo build --release --bin seed-data

# Runtime stage
FROM debian:bookworm-slim
WORKDIR /app

# Copy both binaries
COPY --from=builder /app/target/release/hr-graphql-server /usr/local/bin/
COPY --from=builder /app/target/release/seed-data /usr/local/bin/

# Set environment variables
ENV RUST_LOG=info
ENV ENABLE_SEED_DATA=false  # Disabled by default for safety

EXPOSE 8080

# Use entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["hr-graphql-server"]
```

### 2. Update entrypoint.sh

**File**: `/root/repo/graphql-rust-server/entrypoint.sh`

Add seed data execution before starting server:

```bash
#!/bin/bash
set -e

echo "Starting MountainHR GraphQL Server..."

# Check if seed data should run
if [ "$ENABLE_SEED_DATA" = "true" ] || [ "$ENVIRONMENT" = "development" ]; then
    echo "Running seed data initialization..."

    # Run seed-data binary
    if /usr/local/bin/seed-data; then
        echo "✅ Seed data completed successfully"
    else
        EXIT_CODE=$?
        echo "⚠️  Seed data failed with exit code $EXIT_CODE"

        # Don't fail container startup on seed data errors (exit code 3 = partial failure)
        if [ $EXIT_CODE -eq 1 ]; then
            echo "❌ Production safety block - container starting without seed data"
        elif [ $EXIT_CODE -eq 2 ]; then
            echo "❌ Database connection failed - container may not be ready"
            exit 2  # Fail container startup on DB connection issues
        elif [ $EXIT_CODE -eq 3 ]; then
            echo "⚠️  Partial seed data failure - container starting anyway"
        fi
    fi
else
    echo "Seed data disabled (ENABLE_SEED_DATA not set)"
fi

# Start main GraphQL server
echo "Starting GraphQL server..."
exec "$@"
```

### 3. Update docker-compose.yml

**File**: `/root/repo/docker-compose.yml` (or wherever docker-compose is located)

Add environment variables:

```yaml
version: '3.8'

services:
  graphql-server:
    build:
      context: ./graphql-rust-server
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/hr_db
      ENABLE_SEED_DATA: "true"  # Enable for development
      SEED_VOLUME_TARGET: "small"  # small | medium | large
      SEED_ENABLE_AUDIT: "true"
      ENVIRONMENT: "development"
      RUST_LOG: "info"
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: hr_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-PG_ISREADY", "-U", "postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### 4. CI/CD Pipeline Integration

**File**: `.github/workflows/ci.yml` (or equivalent)

Add seed data testing:

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: password
          POSTGRES_DB: hr_db_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable

      - name: Run tests
        env:
          DATABASE_URL: postgresql://postgres:password@localhost:5432/hr_db_test
          ENABLE_SEED_DATA: "true"
        run: |
          cargo test --all-features

      - name: Run seed data contract tests
        env:
          DATABASE_URL: postgresql://postgres:password@localhost:5432/hr_db_test
          ENABLE_SEED_DATA: "true"
        run: |
          cargo test --test contract_tests seed_data

      - name: Build seed-data binary
        run: |
          cargo build --release --bin seed-data

      - name: Test seed data execution
        env:
          DATABASE_URL: postgresql://postgres:password@localhost:5432/hr_db_test
          ENABLE_SEED_DATA: "true"
          SEED_VOLUME_TARGET: "small"
        run: |
          ./target/release/seed-data
```

## Testing Checklist

Before marking Phase 9 complete, verify:

- [ ] Dockerfile builds both binaries successfully
- [ ] Container starts with seed data execution
- [ ] Seed data completes before GraphQL server starts
- [ ] Seed data failures don't prevent container startup (except DB connection issues)
- [ ] Environment variables properly control seed data execution
- [ ] Production deployments have ENABLE_SEED_DATA=false by default
- [ ] CI/CD pipeline runs seed data tests
- [ ] docker-compose.yml works for local development

## Local Testing

Test container integration locally:

```bash
# Build container
docker-compose build

# Start with seed data enabled
docker-compose up

# Check logs for seed data execution
docker-compose logs graphql-server | grep "Seed data"

# Verify database has seed data
docker-compose exec postgres psql -U postgres -d hr_db -c "SELECT COUNT(*) FROM users;"

# Test idempotency (restart container)
docker-compose restart graphql-server
docker-compose logs graphql-server | grep "skipped"
```

## Production Deployment Notes

**⚠️ IMPORTANT**: Seed data should be DISABLED in production by default.

Production environment variables:
```bash
ENABLE_SEED_DATA=false  # Critical for production safety
ENVIRONMENT=production
```

Only enable seed data in production for:
- Initial deployment to populate empty database
- Staging/QA environments for testing
- Demo environments for showcasing features

## Estimated Effort

- Dockerfile updates: 30 minutes
- entrypoint.sh updates: 30 minutes
- docker-compose.yml updates: 15 minutes
- CI/CD pipeline integration: 1-2 hours
- Testing and validation: 1 hour

**Total**: 3-4 hours

## Next Steps

After Phase 9 completion, proceed to Phase 10 (Documentation):
1. Update main README with seed data usage
2. Create troubleshooting guide
3. Add developer quick-start guide
4. Document environment variables
5. Add examples and common scenarios
