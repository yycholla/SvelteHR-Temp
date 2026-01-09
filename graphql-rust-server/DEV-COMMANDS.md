# Quick Development Commands Reference

## Starting Development Server

```bash
# Start with hot-reloading (cargo-watch)
cd dev-containers
docker-compose -f docker-compose.dev.yml up hr-graphql-rust

# Start in detached mode (background)
docker-compose -f docker-compose.dev.yml up -d hr-graphql-rust

# Rebuild and start
docker-compose -f docker-compose.dev.yml up --build hr-graphql-rust
```

## Viewing Logs

```bash
# Follow logs in real-time
docker logs -f sveltehr-graphql-rust

# View last 100 lines
docker logs --tail 100 sveltehr-graphql-rust

# View logs with timestamps
docker logs -t sveltehr-graphql-rust
```

## Running Commands Inside Container

```bash
# Open a shell
docker exec -it sveltehr-graphql-rust bash

# Run cargo commands
docker exec sveltehr-graphql-rust cargo check
docker exec sveltehr-graphql-rust cargo test
docker exec sveltehr-graphql-rust cargo clippy

# Check if mold is being used
docker exec sveltehr-graphql-rust cargo build --verbose 2>&1 | grep mold
```

## Development Workflow

```bash
# 1. Start development server
docker-compose -f docker-compose.dev.yml up hr-graphql-rust

# 2. Edit files in src/
# (cargo-watch will automatically detect and recompile)

# 3. Check compilation status
docker logs sveltehr-graphql-rust

# 4. Test your changes
curl http://localhost:4000/health
```

## Stopping and Restarting

```bash
# Stop the service
docker-compose -f docker-compose.dev.yml stop hr-graphql-rust

# Restart without rebuilding
docker-compose -f docker-compose.dev.yml restart hr-graphql-rust

# Stop and remove container
docker-compose -f docker-compose.dev.yml down hr-graphql-rust
```

## Cleaning and Rebuilding

```bash
# Clean target directory
docker exec sveltehr-graphql-rust cargo clean

# Rebuild from scratch (removes cache)
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml build --no-cache hr-graphql-rust
docker-compose -f docker-compose.dev.yml up hr-graphql-rust

# Remove unused volumes
docker volume prune
```

## Testing

```bash
# Run all tests
docker exec sveltehr-graphql-rust cargo test

# Run specific test
docker exec sveltehr-graphql-rust cargo test test_name

# Run tests with output
docker exec sveltehr-graphql-rust cargo test -- --nocapture

# Run tests on file change (with cargo-watch)
docker exec sveltehr-graphql-rust cargo watch -x test
```

## Linting and Formatting

```bash
# Run clippy lints
docker exec sveltehr-graphql-rust cargo clippy

# Fix clippy warnings automatically
docker exec sveltehr-graphql-rust cargo clippy --fix

# Format code
docker exec sveltehr-graphql-rust cargo fmt

# Check formatting without modifying
docker exec sveltehr-graphql-rust cargo fmt -- --check
```

## Debugging

```bash
# View environment variables
docker exec sveltehr-graphql-rust env | grep RUST

# Check cargo configuration
docker exec sveltehr-graphql-rust cat .cargo/config.toml

# Check if mold is installed
docker exec sveltehr-graphql-rust which mold

# Check cargo-watch is installed
docker exec sveltehr-graphql-rust which cargo-watch

# View mounted volumes
docker inspect sveltehr-graphql-rust | grep -A 10 Mounts
```

## Performance Monitoring

```bash
# Measure build time
docker exec sveltehr-graphql-rust bash -c "touch src/main.rs && time cargo build"

# Check disk usage of target directory
docker exec sveltehr-graphql-rust du -sh target/

# Monitor CPU/Memory usage
docker stats sveltehr-graphql-rust
```

## Switching to Bacon

```bash
# 1. Edit docker-compose.dev.yml
# Change: dockerfile: Dockerfile.dev.bacon

# 2. Rebuild and start
docker-compose -f docker-compose.dev.yml up --build hr-graphql-rust

# 3. Use bacon commands
docker exec sveltehr-graphql-rust bacon run    # Run server
docker exec sveltehr-graphql-rust bacon check  # Check only
docker exec sveltehr-graphql-rust bacon test   # Run tests
docker exec sveltehr-graphql-rust bacon clippy # Lints
```

## Troubleshooting Quick Fixes

```bash
# Container keeps restarting
docker logs sveltehr-graphql-rust  # Check error logs

# Port already in use
docker ps | grep 4000  # Find conflicting container
docker stop <container_id>

# Compilation errors
docker exec sveltehr-graphql-rust cargo clean
docker-compose -f docker-compose.dev.yml restart hr-graphql-rust

# Slow compilation
docker exec sveltehr-graphql-rust cat .cargo/config.toml  # Verify mold config
docker volume ls | grep rust  # Check volumes exist

# Database connection issues
docker-compose -f docker-compose.dev.yml ps  # Check postgres is healthy
docker-compose -f docker-compose.dev.yml restart postgres-dev
```

## Useful Aliases (Add to ~/.bashrc or ~/.zshrc)

```bash
# Rust dev aliases
alias rd-up='cd dev-containers && docker-compose -f docker-compose.dev.yml up hr-graphql-rust'
alias rd-logs='docker logs -f sveltehr-graphql-rust'
alias rd-shell='docker exec -it sveltehr-graphql-rust bash'
alias rd-test='docker exec sveltehr-graphql-rust cargo test'
alias rd-check='docker exec sveltehr-graphql-rust cargo check'
alias rd-clippy='docker exec sveltehr-graphql-rust cargo clippy'
alias rd-clean='docker exec sveltehr-graphql-rust cargo clean'
```

## Common Development Scenarios

### Scenario: Adding a new dependency

```bash
# 1. Add to Cargo.toml (edit file locally)
# 2. cargo-watch detects change
# 3. Automatic rebuild (takes 1-2 minutes for new dependency)
# 4. Server restarts automatically
```

### Scenario: Fixing a bug in existing code

```bash
# 1. Edit src/models/event.rs
# 2. Save file
# 3. cargo-watch detects change
# 4. Incremental rebuild (3-10 seconds with mold)
# 5. Server restarts automatically
# 6. Test at http://localhost:4000/graphql
```

### Scenario: Running migrations

```bash
# Migrations are typically run in the postgres container
docker exec sveltehr-postgres-dev psql -U postgres -d hr_system -f /migrations/001_init.sql
```

### Scenario: Inspecting GraphQL schema

```bash
# Open GraphQL Playground
open http://localhost:4000

# Or use curl
curl http://localhost:4000/graphql -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'
```

## Performance Benchmarks

Track your compilation improvements:

```bash
# Clean build
docker exec sveltehr-graphql-rust bash -c "cargo clean && time cargo build --release"

# Incremental build (touch file)
docker exec sveltehr-graphql-rust bash -c "touch src/main.rs && time cargo build"

# Compare with and without mold
# Without mold: ~40-60 seconds for incremental
# With mold: ~3-10 seconds for incremental
```
