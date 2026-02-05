# Mise Integration Design

**Date:** 2026-02-04
**Status:** Approved
**Goal:** Replace ad-hoc tool management and Makefile with unified mise configuration for consistent development environments across team and machines.

## Overview

Integrate mise as the single source of truth for:

- Tool version management (Node, npm, Rust, cargo tools)
- Task runner (replacing Makefile entirely)
- Non-secret environment variables

Secrets remain in `.env` files (gitignored).

## Tool Version Management

mise pins exact versions of all development tools in `.mise.toml`. Running `mise install` gives any team member identical tooling.

### Tools Managed

| Tool        | Version           | Purpose                                  |
| ----------- | ----------------- | ---------------------------------------- |
| node        | 22.x (latest LTS) | Frontend runtime, matches `engines.node` |
| npm         | 10.x              | Package manager, matches `engines.npm`   |
| rust        | stable (1.82+)    | Backend compilation                      |
| cargo-watch | latest            | Rust hot-reload                          |
| sea-orm-cli | 0.12.x            | Database entity generation               |

### File Structure

```
.mise.toml          # Tool versions + tasks + non-secret env vars (committed)
.mise.local.toml    # Developer overrides (gitignored)
.env                # Secrets only (gitignored, existing)
.env.example        # Secret template (existing, unchanged)
```

## Task Structure

Tasks mirror current Makefile organization with improved discoverability via `mise tasks`.

### Task Categories

```
dev:start           # Start ALL dev containers (hybrid: Docker backend + native frontend)
dev:start-docker    # Full Docker mode (all containers)
dev:stop            # Stop all containers
dev:logs            # View container logs
dev:rebuild         # Fast rebuild with cache
dev:rebuild-full    # Full rebuild, no cache

backend:start       # Start backend containers only
frontend:start      # Start frontend container only (Docker)
frontend:native     # Start frontend natively (faster HMR)

db:shell            # Open PostgreSQL shell
db:status           # Show migration status
db:migrate          # Run migrations
db:reset            # Reset database (with confirmation)
db:entities         # Regenerate SeaORM entities

rust:check          # cargo check
rust:clippy         # cargo clippy
rust:test           # cargo test
rust:build          # cargo build --release
rust:logs           # View Rust server logs
rust:shell          # Shell into Rust container

prod:start          # Start production containers
prod:stop           # Stop production containers
prod:logs           # View production logs
prod:rebuild        # Rebuild production containers
prod:rebuild-full   # Full rebuild, no cache
prod:frontend-rebuild      # Rebuild frontend only
prod:frontend-rebuild-full # Rebuild frontend, no cache

test:all            # Run all tests
test:unit           # Run unit tests
test:e2e            # Run E2E tests

webhook:ngrok       # Start ngrok tunnel
webhook:tailscale   # Start Tailscale funnel

ssh:backend         # SSH into backend container
ssh:frontend        # SSH into frontend container

install             # Install all dependencies
clean               # Stop containers, clean artifacts
```

### Task Dependencies

```
frontend:start
  └── depends: backend:start
        └── depends: [_docker:check]

dev:start
  └── depends: [_docker:check]

db:shell
  └── depends: [_docker:check, _db:running]

db:entities
  └── depends: [_db:running]

rust:check, rust:clippy, rust:test
  └── depends: [_docker:check, _backend:running]

test:e2e
  └── depends: [dev:start]

webhook:ngrok, webhook:tailscale
  └── depends: [_backend:running]
```

### Hidden Utility Tasks

Prefixed with `_` (not shown in `mise tasks`):

- `_docker:check` - Verify Docker is running
- `_db:running` - Verify PostgreSQL container is healthy
- `_backend:running` - Verify backend container is healthy
- `_backend:wait` - Wait for backend to become healthy

## Environment Management

### Non-Secret Variables (in .mise.toml)

```toml
[env]
POSTGRES_DB = "hr_system"
POSTGRES_USER = "postgres"
HOST = "127.0.0.1"
RUST_LOG = "info,hr_graphql_server=debug"
RUST_BACKTRACE = "1"

[env.development]
PORT = "4000"
ENVIRONMENT = "development"

[env.test]
PORT = "4001"
ENVIRONMENT = "test"
```

### Secrets (stay in .env)

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `SERVICE_AUTH_KEY`
- `INTUIT_CLIENT_ID` / `INTUIT_CLIENT_SECRET`
- `SMTP_USERNAME` / `SMTP_PASSWORD`

mise automatically loads `.env` files, so secrets are available without duplication.

## Hybrid Execution Model

Default development mode uses native frontend with Docker backend for optimal DX.

| Component            | Execution                    | Rationale                                |
| -------------------- | ---------------------------- | ---------------------------------------- |
| Frontend (SvelteKit) | Native via mise-managed Node | Faster HMR, sub-second reloads           |
| Backend (Rust)       | Docker container             | Complex dependencies, matches production |
| PostgreSQL           | Docker container             | Consistent schema, easy reset            |
| Redis                | Docker container             | No native install needed                 |

### Task Variants

- `dev:start` - Hybrid mode (recommended): Docker backend + native frontend
- `dev:start-docker` - Full Docker mode: all containers (for CI or debugging)
- `dev:start-native` - Native frontend only: assumes backend already running

## Migration Strategy

### Phase 1: Add mise alongside Makefile (Day 1)

1. Add `.mise.toml` with tool versions
2. Team installs mise, runs `mise install`
3. Makefile continues working unchanged
4. Validates mise works for everyone

### Phase 2: Migrate tasks incrementally (Week 1)

1. Add mise tasks one category at a time
2. Test each task against Makefile equivalent
3. Update `CLAUDE.md` with new commands

### Phase 3: Remove Makefile (Week 2)

1. Delete Makefile after all tasks migrated
2. Add mise to CI/CD pipeline
3. Update README with mise quickstart

## Team Onboarding

New developer flow:

```bash
# 1. Install mise (one-time)
curl https://mise.run | sh

# 2. Clone and setup
git clone <repo>
cd SvelteHR
mise install          # Installs Node 22, Rust, etc.
cp .env.example .env  # Fill in secrets
mise run dev          # Start everything
```

## CI/CD Integration

GitHub Actions example:

```yaml
- uses: jdx/mise-action@v2
- run: mise install
- run: mise run test:all
```

## Documentation Updates

- `README.md` - Add mise quickstart section
- `CLAUDE.md` - Replace npm/make commands with mise equivalents
- Delete Makefile after migration complete
