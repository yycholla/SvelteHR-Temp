# Local Native Development Setup

This guide explains how to run the Rust GraphQL server **natively on your host machine** instead of in Docker, which provides:

- ✅ **Instant hot-reloading** with bacon (no Docker file-watching issues)
- ✅ **Faster compilation** (no Docker I/O overhead)
- ✅ **Better debugging** with native tools
- ✅ **Direct access** to logs and processes

## Prerequisites

1. **Rust toolchain** (1.90 or later)

   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Bacon** (hot-reload tool)

   ```bash
   cargo install bacon
   ```

3. **PostgreSQL client tools** (for migrations)

   ```bash
   # Ubuntu/Debian
   sudo apt install postgresql-client

   # macOS
   brew install postgresql

   # Arch Linux
   sudo pacman -S postgresql-libs
   ```

4. **Mold linker** (optional but HIGHLY recommended for 5-10x faster linking)

   ```bash
   # Ubuntu/Debian
   sudo apt install mold

   # macOS
   brew install mold

   # Arch Linux
   sudo pacman -S mold
   ```

## Setup Steps

### 1. Start Required Docker Services

Start **only** the database and supporting services (not the Rust server):

```bash
cd /home/chanway/Projects/SvelteHR/dev-containers

# Start all services
docker-compose -f docker-compose.dev.yml up -d

# Stop the Rust GraphQL container (we'll run it natively)
docker stop sveltehr-graphql-rust

# Optional: Remove it so it doesn't auto-restart
docker rm sveltehr-graphql-rust
```

Verify PostgreSQL is accessible:

```bash
psql postgresql://postgres:postgres123@localhost:5433/hr_system -c "SELECT 1;"
```

### 2. Configure Environment

The `.env` file in this directory is **already configured for native development**:

```bash
# Database connects to Docker PostgreSQL via exposed port 5433
DATABASE_URL=postgresql://postgres:postgres123@localhost:5433/hr_system

# Server binds to localhost only
HOST=127.0.0.1
PORT=4000

# Other settings...
```

**Important:** The `.env` file is for **native development only**. Docker containers use environment variables declared in `docker-compose.dev.yml`.

### 3. Run Migrations

```bash
cd /home/chanway/Projects/SvelteHR/graphql-rust-server

# Build migration binary
cargo build --release --bin migration

# Run migrations
./target/release/migration up
```

### 4. (Optional) Seed Development Data

```bash
# Build seed data binary
cargo build --release --bin seed-data

# Run seed data
./target/release/seed-data
```

### 5. Start Development Server

**Option A: Using Bacon (Recommended - Hot Reload)**

```bash
bacon run
```

Bacon will:

- ✅ Watch for file changes in `src/`, `Cargo.toml`, `migration/`
- ✅ Automatically recompile and restart the server
- ✅ Show beautiful colored output with error highlighting
- ✅ Support interactive commands (press `h` for help)

**Option B: Using Cargo Directly (No Hot Reload)**

```bash
cargo run --bin hr-graphql-server
```

### 6. Access the Server

- **GraphQL API:** http://localhost:4000/graphql
- **GraphQL Playground:** http://localhost:4000 (in browser)
- **Health Check:** http://localhost:4000/health

### 7. Update Frontend Configuration

The frontend should automatically connect to `localhost:4000`. Verify in your frontend's environment:

```bash
# Check frontend .env or vite.config.ts
PUBLIC_API_URL=http://localhost:4000
```

## Development Workflow

### Making Code Changes

1. **Edit Rust files** - Bacon automatically detects and rebuilds
2. **Check compilation** - Press `c` in bacon for cargo check
3. **Run tests** - Press `t` in bacon for cargo test
4. **Run clippy** - Press `l` in bacon for cargo clippy

### Database Changes

When you modify migrations:

```bash
# Stop the server (Ctrl+C in bacon)
cargo build --release --bin migration
./target/release/migration up
# Restart bacon
```

### Switching Back to Docker

To go back to Docker-based development:

```bash
# Start the Rust container again
cd /home/chanway/Projects/SvelteHR/dev-containers
docker-compose -f docker-compose.dev.yml up -d hr-graphql-rust

# The container will use environment variables from docker-compose.dev.yml
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 4000
lsof -i :4000

# Kill it
kill -9 <PID>
```

### Database Connection Failed

```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Check port mapping
docker port sveltehr-postgres-dev

# Test connection
psql postgresql://postgres:postgres123@localhost:5433/hr_system -c "SELECT 1;"
```

### Compilation Errors

```bash
# Clean build artifacts
cargo clean

# Update dependencies
cargo update

# Rebuild
cargo build
```

### Slow Compilation

Make sure you have **mold linker** installed and configured:

```bash
# Check if mold is installed
which mold

# Verify .cargo/config.toml has mold configured
cat .cargo/config.toml
```

## Performance Comparison

| Metric                    | Docker       | Native           |
| ------------------------- | ------------ | ---------------- |
| **First compilation**     | ~40s         | ~25s (with mold) |
| **Hot reload time**       | N/A (broken) | ~2-5s            |
| **File change detection** | ❌ Broken    | ✅ Instant       |
| **Debugging experience**  | 😐 OK        | ✅ Excellent     |
| **Log access**            | Docker logs  | Direct stdout    |

## Best Practices

1. **Always run native during active development** for fast iteration
2. **Test in Docker before pushing** to verify container compatibility
3. **Keep .env updated** with correct localhost ports
4. **Use bacon** for the best development experience
5. **Commit with mold enabled** for fastest linking

## Environment Variables Reference

| Variable               | Native (.env)    | Docker (docker-compose)                |
| ---------------------- | ---------------- | -------------------------------------- |
| `DATABASE_URL`         | `localhost:5433` | `postgres-dev:5432`                    |
| `HOST`                 | `127.0.0.1`      | `0.0.0.0`                              |
| `CORS_ALLOWED_ORIGINS` | `localhost:5173` | `localhost:5173` + `frontend-dev:5173` |
| `ENABLE_SEED_DATA`     | `false`          | `true`                                 |

## Additional Resources

- [Rust Book](https://doc.rust-lang.org/book/)
- [SeaORM Documentation](https://www.sea-ql.org/SeaORM/)
- [async-graphql Documentation](https://async-graphql.github.io/async-graphql/)
- [Bacon Documentation](https://dystroy.org/bacon/)
