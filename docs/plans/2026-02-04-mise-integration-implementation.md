# Mise Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace ad-hoc tool management and Makefile with unified mise configuration for consistent development environments.

**Architecture:** Single `.mise.toml` at project root manages tool versions, environment variables, and tasks. Secrets stay in `.env` (gitignored). Tasks use dependency chains for safety. Hybrid execution: native frontend + Docker backend.

**Tech Stack:** mise (tool/task runner), Node 22, npm 10, Rust stable, Docker Compose

**Reference:** [Design document](./2026-02-04-mise-integration-design.md)

---

## Task 1: Add mise to .gitignore

**Files:**

- Modify: `.gitignore`

**Step 1: Add mise local config to gitignore**

Add after line 20 (after `.env`):

```gitignore
# mise local overrides
.mise.local.toml
.mise.*.local.toml
```

**Step 2: Verify the change**

Run: `grep -n "mise" .gitignore`
Expected: Shows the new lines with line numbers

**Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: add mise local config to gitignore"
```

---

## Task 2: Create base .mise.toml with tool versions

**Files:**

- Create: `.mise.toml`

**Step 1: Create the mise configuration file**

```toml
# =============================================================================
# SvelteHR Development Environment Configuration
# =============================================================================
# This file manages tool versions, environment variables, and tasks.
# Run `mise install` to set up your development environment.
# Run `mise tasks` to see available commands.
# =============================================================================

min_version = "2024.1.0"

# =============================================================================
# Tool Versions
# =============================================================================
# These ensure consistent tooling across all team members and CI/CD.

[tools]
node = "22"
rust = "stable"

# Cargo tools installed via mise
"cargo:sea-orm-cli" = "0.12"
"cargo:cargo-watch" = "latest"

# =============================================================================
# Settings
# =============================================================================

[settings]
# Load .env file automatically
env_file = ".env"
# Show task prefix in output
task_output = "prefix"
# Quiet mode for cleaner output
quiet = true
```

**Step 2: Verify mise can parse the file**

Run: `mise doctor`
Expected: No errors related to config parsing

**Step 3: Commit**

```bash
git add .mise.toml
git commit -m "chore: add mise.toml with tool versions

- Node 22 (matches package.json engines)
- Rust stable
- sea-orm-cli 0.12.x
- cargo-watch latest"
```

---

## Task 3: Add environment variables section

**Files:**

- Modify: `.mise.toml`

**Step 1: Add environment variables after [settings]**

```toml
# =============================================================================
# Environment Variables (non-secrets only)
# =============================================================================
# Secrets (passwords, API keys) stay in .env file (gitignored).
# mise loads .env automatically via env_file setting above.

[env]
# Database (non-secret parts)
POSTGRES_DB = "hr_system"
POSTGRES_USER = "postgres"

# Server defaults
HOST = "127.0.0.1"

# Rust logging
RUST_LOG = "info,hr_graphql_server=debug,sea_orm=warn,sqlx=warn"
RUST_BACKTRACE = "1"

# SeaORM
SEA_ORM_LOG_QUERIES = "false"
SEA_ORM_LOG_LEVEL = "warn"

# Development defaults
ENVIRONMENT = "development"
```

**Step 2: Verify environment loading**

Run: `mise env | grep POSTGRES_DB`
Expected: `POSTGRES_DB=hr_system`

**Step 3: Commit**

```bash
git add .mise.toml
git commit -m "chore: add non-secret environment variables to mise.toml"
```

---

## Task 4: Add hidden utility tasks

**Files:**

- Modify: `.mise.toml`

**Step 1: Add utility tasks section**

```toml
# =============================================================================
# Utility Tasks (hidden)
# =============================================================================
# These are helper tasks used as dependencies. Not shown in `mise tasks`.

[tasks._docker_check]
description = "Verify Docker is running"
hide = true
run = """
#!/usr/bin/env bash
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop or the Docker daemon."
    exit 1
fi
"""

[tasks._db_running]
description = "Verify PostgreSQL container is healthy"
hide = true
run = """
#!/usr/bin/env bash
if ! docker ps --format '{{.Names}}' | grep -q 'sveltehr-postgres-dev'; then
    echo "❌ PostgreSQL container is not running."
    echo "   Run: mise run backend:start"
    exit 1
fi
# Check if PostgreSQL is accepting connections
if ! docker exec sveltehr-postgres-dev pg_isready -U postgres > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not ready to accept connections."
    exit 1
fi
"""

[tasks._backend_running]
description = "Verify backend container is healthy"
hide = true
run = """
#!/usr/bin/env bash
if ! docker ps --format '{{.Names}}' | grep -q 'sveltehr-graphql-rust\|sveltehr-backend-dev'; then
    echo "❌ Backend container is not running."
    echo "   Run: mise run backend:start"
    exit 1
fi
"""

[tasks._backend_wait]
description = "Wait for backend to become healthy"
hide = true
run = """
#!/usr/bin/env bash
echo "⏳ Waiting for backend to be ready..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:4000/graphql -o /dev/null 2>&1; then
        echo "✅ Backend is ready!"
        exit 0
    fi
    attempt=$((attempt + 1))
    sleep 1
done
echo "❌ Backend did not become ready in time"
exit 1
"""

[tasks._ngrok_check]
description = "Verify ngrok is installed"
hide = true
run = """
#!/usr/bin/env bash
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed"
    echo ""
    echo "Install ngrok:"
    echo "  macOS:  brew install ngrok"
    echo "  Linux:  See https://ngrok.com/download"
    echo ""
    echo "After installation, authenticate:"
    echo "  ngrok config add-authtoken <your_token>"
    exit 1
fi
"""

[tasks._tailscale_check]
description = "Verify Tailscale is installed"
hide = true
run = """
#!/usr/bin/env bash
if ! command -v tailscale &> /dev/null; then
    echo "❌ Tailscale is not installed"
    echo ""
    echo "Install Tailscale:"
    echo "  macOS:  brew install tailscale"
    echo "  Linux:  curl -fsSL https://tailscale.com/install.sh | sh"
    echo ""
    echo "After installation, authenticate:"
    echo "  sudo tailscale up"
    exit 1
fi
"""
```

**Step 2: Verify hidden tasks don't appear in list**

Run: `mise tasks`
Expected: No tasks starting with `_` appear

**Step 3: Test a utility task directly**

Run: `mise run _docker_check`
Expected: Either success message or helpful error about Docker

**Step 4: Commit**

```bash
git add .mise.toml
git commit -m "chore: add hidden utility tasks for dependency checking"
```

---

## Task 5: Add development workflow tasks

**Files:**

- Modify: `.mise.toml`

**Step 1: Add dev tasks section**

```toml
# =============================================================================
# Development Tasks
# =============================================================================

[tasks."dev"]
alias = "dev:start"
description = "Start development environment (native frontend + Docker backend)"
depends = ["_docker_check"]
run = """
#!/usr/bin/env bash
echo "🚀 Starting Docker services (PostgreSQL, Redis, Backend)..."
cd dev-containers && docker compose -f docker-compose.dev.yml up -d postgres-dev redis-dev backend-dev

echo ""
mise run _backend_wait

echo ""
echo "🎨 Starting native frontend with hot reload..."
echo "   Press Ctrl+C to stop"
echo ""
npm run dev
"""

[tasks."dev:docker"]
description = "Start ALL dev containers (full Docker mode)"
depends = ["_docker_check"]
run = """
#!/usr/bin/env bash
echo "🚀 Starting ALL SvelteHR Development Containers..."
cd dev-containers && docker compose -f docker-compose.dev.yml up -d
echo ""
echo "✅ All containers started!"
echo ""
echo "📍 Services available:"
echo "   🔹 Frontend:     http://localhost:5173"
echo "   🔹 Backend API:  http://localhost:4000/graphql"
echo "   🔹 PostgreSQL:   localhost:5433"
echo "   🔹 Redis:        localhost:6380"
echo ""
echo "💡 View logs: mise run dev:logs"
echo "💡 Stop all:  mise run dev:stop"
"""

[tasks."dev:stop"]
description = "Stop all development containers"
run = """
#!/usr/bin/env bash
echo "⏹️ Stopping development containers..."
cd dev-containers && docker compose -f docker-compose.dev.yml down
echo "✅ Containers stopped"
"""

[tasks."dev:logs"]
description = "View container logs (Ctrl+C to exit)"
run = "cd dev-containers && docker compose -f docker-compose.dev.yml logs -f --no-log-prefix"

[tasks."dev:rebuild"]
description = "Rebuild containers with cargo-chef caching"
depends = ["_docker_check"]
run = """
#!/usr/bin/env bash
echo "🔨 Rebuilding development containers with cargo-chef caching..."
cd dev-containers && docker compose -f docker-compose.dev.yml build
echo "✅ Rebuild complete. Run 'mise run dev' to start."
"""

[tasks."dev:rebuild-full"]
description = "Full rebuild without caching"
depends = ["_docker_check"]
run = """
#!/usr/bin/env bash
echo "🔨 Full rebuild (no cache) - this may take 8-12 minutes..."
cd dev-containers && docker compose -f docker-compose.dev.yml build --no-cache
echo "✅ Full rebuild complete. Run 'mise run dev' to start."
"""
```

**Step 2: Verify tasks appear in list**

Run: `mise tasks | grep dev`
Expected: Shows dev, dev:docker, dev:stop, dev:logs, dev:rebuild, dev:rebuild-full

**Step 3: Test dev:stop (safe to run even if nothing is running)**

Run: `mise run dev:stop`
Expected: Either stops containers or reports nothing to stop

**Step 4: Commit**

```bash
git add .mise.toml
git commit -m "feat: add development workflow tasks to mise

- dev (alias dev:start): hybrid mode with native frontend
- dev:docker: full Docker mode
- dev:stop, dev:logs, dev:rebuild, dev:rebuild-full"
```

---

## Task 6: Add backend and frontend tasks

**Files:**

- Modify: `.mise.toml`

**Step 1: Add backend/frontend tasks**

```toml
# =============================================================================
# Backend / Frontend Tasks
# =============================================================================

[tasks."backend:start"]
alias = "backend"
description = "Start backend containers only (database + redis + backend API)"
depends = ["_docker_check"]
run = """
#!/usr/bin/env bash
echo "🚀 Starting Backend Containers..."
cd dev-containers && docker compose -f docker-compose.dev.yml up -d postgres-dev redis-dev backend-dev
echo ""
echo "✅ Backend containers started!"
echo ""
echo "📍 Services available:"
echo "   🔹 Backend API:  http://localhost:4000/graphql"
echo "   🔹 PostgreSQL:   localhost:5433"
echo "   🔹 Redis:        localhost:6380"
echo ""
echo "💡 Start frontend: mise run frontend"
"""

[tasks."frontend:start"]
alias = "frontend"
description = "Start frontend container (Docker mode)"
depends = ["_backend_running"]
run = """
#!/usr/bin/env bash
echo "🎨 Starting Frontend Container..."
cd dev-containers && docker compose -f docker-compose.dev.yml up -d frontend-dev
echo ""
echo "✅ Frontend container started!"
echo "🌐 Frontend available at: http://localhost:5173"
"""

[tasks."frontend:native"]
description = "Start frontend natively (faster HMR, requires backend running)"
depends = ["_backend_running"]
run = """
#!/usr/bin/env bash
echo "🎨 Starting native frontend with hot reload..."
echo "   Press Ctrl+C to stop"
echo ""
npm run dev
"""
```

**Step 2: Verify tasks**

Run: `mise tasks | grep -E "backend|frontend"`
Expected: Shows backend:start, frontend:start, frontend:native with aliases

**Step 3: Commit**

```bash
git add .mise.toml
git commit -m "feat: add backend and frontend tasks to mise"
```

---

## Task 7: Add database tasks

**Files:**

- Modify: `.mise.toml`

**Step 1: Add database tasks**

```toml
# =============================================================================
# Database Tasks
# =============================================================================

[tasks."db:shell"]
alias = "db"
description = "Open PostgreSQL shell"
depends = ["_db_running"]
run = """
#!/usr/bin/env bash
echo "🔧 Opening PostgreSQL shell..."
docker exec -it sveltehr-postgres-dev psql -U postgres -d hr_system
"""

[tasks."db:status"]
description = "Show database migration status"
depends = ["_db_running"]
run = """
#!/usr/bin/env bash
echo "📊 Database Migration Status:"
echo ""
docker exec sveltehr-postgres-dev psql -U postgres -d hr_system -c \
    "SELECT id, name, applied_at FROM migrations ORDER BY applied_at DESC LIMIT 10;" \
    2>/dev/null || echo "Migrations table not found."
"""

[tasks."db:migrate"]
description = "Run database migrations"
depends = ["_db_running"]
run = """
#!/usr/bin/env bash
echo "📋 Running database migrations..."
if [ -f "scripts/init-db.sh" ]; then
    bash scripts/init-db.sh
else
    echo "⚠️  Migration script not found"
    echo "Migrations in /migrations will auto-apply on container start"
fi
"""

[tasks."db:reset"]
description = "Reset database (WARNING: deletes all data)"
depends = ["_docker_check"]
confirm = "⚠️  This will DELETE ALL DATA. Are you sure?"
run = """
#!/usr/bin/env bash
echo "🔄 Resetting database..."
cd dev-containers && docker compose -f docker-compose.dev.yml down -v
docker volume rm sveltehr_postgres_dev_data sveltehr_redis_dev_data 2>/dev/null || true
echo "⏳ Restarting containers..."
cd dev-containers && docker compose -f docker-compose.dev.yml up -d postgres-dev redis-dev backend-dev
echo "⏳ Waiting for database initialization..."
sleep 10
echo "✅ Database reset complete"
"""

[tasks."db:entities"]
description = "Regenerate SeaORM entities from database schema"
depends = ["_db_running"]
run = """
#!/usr/bin/env bash
echo "🔄 Regenerating SeaORM entities..."
docker exec sveltehr-graphql-rust sea-orm-cli generate entity \
    --database-url postgresql://postgres:postgres123@postgres-dev:5432/hr_system \
    --output-dir models/generated \
    --with-serde both
echo "✅ SeaORM entities regenerated"
"""

[tasks."db:logs"]
description = "View PostgreSQL initialization logs"
run = "docker logs sveltehr-postgres-dev 2>&1 | grep -A50 'Starting Database Initialization'"

[tasks."db:check"]
description = "Check database schema status"
depends = ["_db_running"]
run = """docker exec sveltehr-postgres-dev psql -U postgres -d hr_system -c "SELECT count(*) FROM pg_tables WHERE schemaname = 'hr_public'" """
```

**Step 2: Verify tasks**

Run: `mise tasks | grep db`
Expected: Shows all db:\* tasks

**Step 3: Commit**

```bash
git add .mise.toml
git commit -m "feat: add database tasks to mise

- db:shell (alias db), db:status, db:migrate
- db:reset with confirmation prompt
- db:entities, db:logs, db:check"
```

---

## Task 8: Add Rust tasks

**Files:**

- Modify: `.mise.toml`

**Step 1: Add Rust tasks**

```toml
# =============================================================================
# Rust GraphQL Server Tasks
# =============================================================================

[tasks."rust:check"]
description = "Run cargo check on Rust GraphQL server"
depends = ["_backend_running"]
run = """
#!/usr/bin/env bash
echo "🔍 Running cargo check..."
docker exec sveltehr-graphql-rust cargo check
"""

[tasks."rust:clippy"]
description = "Run clippy lints on Rust GraphQL server"
depends = ["_backend_running"]
run = """
#!/usr/bin/env bash
echo "🔧 Running cargo clippy..."
docker exec sveltehr-graphql-rust cargo clippy -- -D warnings
"""

[tasks."rust:test"]
description = "Run Rust tests"
depends = ["_backend_running"]
run = """
#!/usr/bin/env bash
echo "🧪 Running cargo test..."
docker exec sveltehr-graphql-rust cargo test
"""

[tasks."rust:build"]
description = "Build Rust GraphQL server in release mode"
depends = ["_backend_running"]
run = """
#!/usr/bin/env bash
echo "🔨 Building Rust GraphQL server..."
docker exec sveltehr-graphql-rust cargo build --release
"""

[tasks."rust:logs"]
description = "View Rust GraphQL server logs"
run = "docker logs -f sveltehr-graphql-rust"

[tasks."rust:shell"]
description = "Open shell in Rust GraphQL container"
depends = ["_backend_running"]
run = "docker exec -it sveltehr-graphql-rust bash"
```

**Step 2: Verify tasks**

Run: `mise tasks | grep rust`
Expected: Shows all rust:\* tasks

**Step 3: Commit**

```bash
git add .mise.toml
git commit -m "feat: add Rust GraphQL server tasks to mise

- rust:check, rust:clippy, rust:test, rust:build
- rust:logs, rust:shell"
```

---

## Task 9: Add production tasks

**Files:**

- Modify: `.mise.toml`

**Step 1: Add production tasks**

```toml
# =============================================================================
# Production Tasks
# =============================================================================

[tasks."prod:start"]
alias = "prod"
description = "Start all production containers"
depends = ["_docker_check"]
run = """
#!/usr/bin/env bash
echo "🚀 Starting ALL SvelteHR Production Containers..."
docker compose up -d
echo ""
echo "✅ All containers started!"
echo ""
echo "📍 Services available:"
echo "   🔹 Frontend:     http://localhost"
echo "   🔹 Backend API:  http://localhost:4000/graphql"
echo "   🔹 PostgreSQL:   localhost:5433"
echo "   🔹 Redis:        localhost:6380"
echo ""
echo "💡 View logs: mise run prod:logs"
echo "💡 Stop all:  mise run prod:stop"
"""

[tasks."prod:stop"]
description = "Stop all production containers"
run = """
#!/usr/bin/env bash
echo "⏹️ Stopping Production containers..."
docker compose down
echo "✅ Containers stopped"
"""

[tasks."prod:logs"]
description = "View production container logs"
run = "docker compose logs -f"

[tasks."prod:rebuild"]
description = "Rebuild production containers with caching"
depends = ["_docker_check"]
run = """
#!/usr/bin/env bash
echo "🔨 Rebuilding Production containers with cargo-chef caching..."
docker compose build
echo "✅ Rebuild complete. Run 'mise run prod' to start."
"""

[tasks."prod:rebuild-full"]
description = "Full production rebuild without caching"
depends = ["_docker_check"]
run = """
#!/usr/bin/env bash
echo "🔨 Full rebuild (no cache) - this will take 8-12 minutes..."
docker compose build --no-cache
echo "✅ Full rebuild complete. Run 'mise run prod' to start."
"""

[tasks."prod:frontend-rebuild"]
description = "Rebuild and restart frontend container only"
depends = ["_docker_check"]
run = """
#!/usr/bin/env bash
echo "🎨 Rebuilding Frontend Container..."
if ! docker ps | grep -q registry.gitlab.com/chanway/sveltehr/backend; then
    echo "❌ Backend not running. Start it first with 'mise run prod'"
    exit 1
fi
docker compose build frontend
docker compose up -d frontend
echo ""
echo "✅ Frontend container rebuilt and started!"
echo "🌐 Frontend available at: http://localhost"
"""

[tasks."prod:frontend-rebuild-full"]
description = "Full frontend rebuild without caching"
depends = ["_docker_check"]
run = """
#!/usr/bin/env bash
echo "🎨 Rebuilding Frontend Container (no cache)..."
if ! docker ps | grep -q registry.gitlab.com/chanway/sveltehr/backend; then
    echo "❌ Backend not running. Start it first with 'mise run prod'"
    exit 1
fi
docker compose build frontend --no-cache
docker compose up -d frontend
echo ""
echo "✅ Frontend container rebuilt and started!"
echo "🌐 Frontend available at: http://localhost"
"""
```

**Step 2: Verify tasks**

Run: `mise tasks | grep prod`
Expected: Shows all prod:\* tasks

**Step 3: Commit**

```bash
git add .mise.toml
git commit -m "feat: add production tasks to mise

- prod:start (alias prod), prod:stop, prod:logs
- prod:rebuild, prod:rebuild-full
- prod:frontend-rebuild, prod:frontend-rebuild-full"
```

---

## Task 10: Add testing tasks

**Files:**

- Modify: `.mise.toml`

**Step 1: Add testing tasks**

```toml
# =============================================================================
# Testing Tasks
# =============================================================================

[tasks."test"]
alias = "test:all"
description = "Run all tests"
run = "npm run test"

[tasks."test:unit"]
description = "Run unit tests"
run = "npm run test:unit"

[tasks."test:unit:server"]
description = "Run server-side unit tests"
run = "npm run test:unit:server"

[tasks."test:unit:client"]
description = "Run client-side unit tests"
run = "npm run test:unit:client"

[tasks."test:integration"]
description = "Run integration tests"
run = "npm run test:integration"

[tasks."test:e2e"]
description = "Run E2E tests"
run = "npm run test:e2e"

[tasks."test:e2e:ui"]
description = "Run E2E tests with UI"
run = "npm run test:e2e:ui"

[tasks."test:e2e:headed"]
description = "Run E2E tests in headed browser"
run = "npm run test:e2e:headed"

[tasks."test:watch"]
description = "Run tests in watch mode"
run = "npm run test:watch"

[tasks."test:coverage"]
description = "Run tests with coverage"
run = "npm run test:coverage"
```

**Step 2: Verify tasks**

Run: `mise tasks | grep test`
Expected: Shows all test:\* tasks

**Step 3: Commit**

```bash
git add .mise.toml
git commit -m "feat: add testing tasks to mise

- test (alias test:all), test:unit, test:e2e
- test:watch, test:coverage, and variants"
```

---

## Task 11: Add webhook and SSH tasks

**Files:**

- Modify: `.mise.toml`

**Step 1: Add webhook tasks**

```toml
# =============================================================================
# Webhook Development Tasks
# =============================================================================

[tasks."webhook:ngrok"]
description = "Start ngrok tunnel for QuickBooks webhook testing"
depends = ["_ngrok_check", "_backend_running"]
run = "./scripts/dev-webhook-tunnel.sh"

[tasks."webhook:tailscale"]
description = "Start Tailscale Funnel for QuickBooks webhooks (stable URL)"
depends = ["_tailscale_check", "_backend_running"]
run = "./scripts/dev-webhook-tunnel-tailscale.sh"

# =============================================================================
# SSH Access Tasks
# =============================================================================

[tasks."ssh:backend"]
description = "SSH into backend container (user: dev, pass: dev)"
run = """
#!/usr/bin/env bash
echo "🔌 Connecting to Backend Container..."
echo "   User: dev | Password: dev"
echo "   Backend code: /home/dev/backend"
echo ""
ssh -o StrictHostKeyChecking=no dev@localhost -p 2222
"""

[tasks."ssh:frontend"]
description = "SSH into frontend container (user: dev, pass: dev)"
run = """
#!/usr/bin/env bash
echo "🔌 Connecting to Frontend Container..."
echo "   User: dev | Password: dev"
echo "   Frontend code: /home/dev/frontend"
echo ""
ssh -o StrictHostKeyChecking=no dev@localhost -p 2223
"""
```

**Step 2: Verify tasks**

Run: `mise tasks | grep -E "webhook|ssh"`
Expected: Shows webhook:_ and ssh:_ tasks

**Step 3: Commit**

```bash
git add .mise.toml
git commit -m "feat: add webhook and SSH tasks to mise

- webhook:ngrok, webhook:tailscale
- ssh:backend, ssh:frontend"
```

---

## Task 12: Add utility tasks (install, clean, check)

**Files:**

- Modify: `.mise.toml`

**Step 1: Add utility tasks**

```toml
# =============================================================================
# Utility Tasks
# =============================================================================

[tasks.install]
description = "Install all dependencies"
run = """
#!/usr/bin/env bash
echo "📦 Installing dependencies..."
npm install
echo "✅ All dependencies installed"
"""

[tasks.clean]
description = "Stop containers and clean build artifacts"
depends = ["_docker_check"]
run = """
#!/usr/bin/env bash
echo "🧹 Cleaning up..."
cd dev-containers && docker compose -f docker-compose.dev.yml down -v 2>/dev/null || true
docker system prune -f
rm -rf .svelte-kit build dist node_modules/.vite
rm -rf backend/dist backend/logs 2>/dev/null || true
echo "✅ Cleanup complete"
"""

[tasks.check]
description = "Run TypeScript/Svelte type checking"
run = "npm run check"

[tasks.lint]
description = "Run linting"
run = "npm run lint"

[tasks.format]
description = "Format code with Prettier"
run = "npm run format"

[tasks.build]
description = "Production build"
run = "npm run build"

[tasks.codegen]
description = "Generate GraphQL types"
run = "npm run codegen:types"

[tasks."schema:validate"]
description = "Validate GraphQL schema"
run = "npm run schema:validate"
```

**Step 2: Verify all tasks**

Run: `mise tasks`
Expected: Complete list of all tasks organized by category

**Step 3: Commit**

```bash
git add .mise.toml
git commit -m "feat: add utility tasks to mise

- install, clean, check, lint, format
- build, codegen, schema:validate"
```

---

## Task 13: Update CLAUDE.md with mise commands

**Files:**

- Modify: `CLAUDE.md`

**Step 1: Find the Development Commands section**

Run: `grep -n "Development Commands" CLAUDE.md`
Expected: Line number of the section

**Step 2: Update the Development Commands section**

Replace the existing commands section with:

````markdown
## Development Commands

**Setup (first time):**

```bash
# Install mise (one-time)
curl https://mise.run | sh

# Install tools and dependencies
mise install
cp .env.example .env  # Fill in secrets
```
````

**Daily development:**

```bash
mise run dev          # Start hybrid mode (native frontend + Docker backend)
mise run dev:docker   # Start full Docker mode
mise run dev:stop     # Stop all containers
mise run dev:logs     # View container logs
```

**Testing:**

```bash
mise run test         # Run all tests
mise run test:unit    # Run unit tests
mise run test:e2e     # Run E2E tests
mise run check        # TypeScript/Svelte check (CRITICAL before commits)
```

**Database:**

```bash
mise run db           # Open PostgreSQL shell
mise run db:status    # Show migration status
mise run db:migrate   # Run migrations
mise run db:reset     # Reset database (WARNING: deletes data)
```

**Rust backend:**

```bash
mise run rust:check   # cargo check
mise run rust:clippy  # cargo clippy
mise run rust:test    # cargo test
mise run rust:logs    # View Rust server logs
```

**All available commands:** `mise tasks`

````

**Step 3: Remove or comment out the old npm run / make commands**

The old commands section referencing `npm run` directly should be replaced or noted as legacy.

**Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with mise commands

Replace npm/make command references with mise equivalents."
````

---

## Task 14: Delete Makefile

**Files:**

- Delete: `Makefile`
- Keep: `Makefile.clean` (if needed for other purposes)

**Step 1: Verify all Makefile commands have mise equivalents**

Run: `mise tasks | wc -l`
Expected: At least 35+ tasks

**Step 2: Create a backup (optional, for reference)**

Run: `cp Makefile docs/archive/Makefile.deprecated`

**Step 3: Delete the Makefile**

Run: `rm Makefile`

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove Makefile in favor of mise tasks

All Makefile commands have been migrated to mise tasks.
Run 'mise tasks' to see available commands."
```

---

## Task 15: Final verification and documentation

**Files:**

- Modify: `README.md` (add mise quickstart)

**Step 1: Verify mise setup works end-to-end**

Run:

```bash
mise install
mise run dev:stop  # Clean state
mise run backend:start
mise run _backend_wait
mise run db:status
mise run dev:stop
```

Expected: All commands succeed

**Step 2: Add quickstart to README.md**

Add near the top of README.md:

````markdown
## Quick Start

```bash
# 1. Install mise (one-time)
curl https://mise.run | sh

# 2. Setup project
git clone <repo>
cd SvelteHR
mise install
cp .env.example .env  # Fill in secrets

# 3. Start development
mise run dev
```
````

See `mise tasks` for all available commands.

````

**Step 3: Final commit**

```bash
git add README.md
git commit -m "docs: add mise quickstart to README"
````

---

## Summary

After completing all tasks, you will have:

1. `.mise.toml` managing:
   - Tool versions (Node 22, Rust stable, cargo tools)
   - Non-secret environment variables
   - 40+ tasks replacing all Makefile commands

2. Updated documentation:
   - `CLAUDE.md` with mise commands
   - `README.md` with quickstart

3. Removed:
   - `Makefile` (all commands migrated)

4. New team onboarding:
   ```bash
   curl https://mise.run | sh
   mise install
   cp .env.example .env
   mise run dev
   ```

---

**Plan complete and saved to `docs/plans/2026-02-04-mise-integration-implementation.md`.**

**Sources:**

- [mise Tasks Documentation](https://mise.jdx.dev/tasks/)
- [mise TOML Tasks](https://mise.jdx.dev/tasks/toml-tasks.html)
- [mise Task Configuration](https://mise.jdx.dev/tasks/task-configuration.html)
- [mise Configuration](https://mise.jdx.dev/configuration.html)
