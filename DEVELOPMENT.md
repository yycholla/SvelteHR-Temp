# SvelteHR Development Guide

## 🚀 Quick Start (Everything in Containers)

Your development environment runs **entirely in Docker containers** for maximum consistency across machines.

### Daily Workflow

```bash
# Start ALL containers (backend, frontend, database, redis)
make dev

# That's it! Everything is running.
# Open your browser to http://localhost:5173
```

### Stop Development

```bash
# Stop all containers
make dev-down
```

## 📋 Common Commands

| Command | Description |
|---------|-------------|
| `make dev` | Start ALL containers (recommended) |
| `make backend` | Start only backend containers (db + redis + API) |
| `make frontend` | Start only frontend container |
| `make dev-down` | Stop all containers |
| `make dev-logs` | View container logs (live tail) |
| `make dev-rebuild` | Rebuild containers (when Dockerfile changes) |
| `make help` | Show all available commands |

## 🗄️ Database Operations

```bash
# Open PostgreSQL shell
make db-shell

# Check migration status
make db-status

# Reset database (WARNING: deletes all data)
make db-reset
```

### Manual Database Access

```bash
# PostgreSQL connection details
Host: localhost
Port: 5433
Database: hr_system
User: postgres
Password: postgres123
```

## 🧪 Testing

```bash
# Run all tests
make test

# Run only unit tests
make test-unit

# Run only E2E tests
make test-e2e
```

## 🔌 SSH into Containers (For Debugging)

Both containers have SSH + Neovim installed:

```bash
# SSH into backend container
make ssh-backend
# User: dev | Password: dev
# Backend code: /home/dev/backend

# SSH into frontend container
make ssh-frontend
# User: dev | Password: dev
# Frontend code: /home/dev/frontend
```

Inside the container, you can:
- Edit files with `nvim` (your host ~/.config/nvim is mounted)
- Restart services manually
- Run `npm` commands
- Debug issues

## 🐛 Troubleshooting

### "Port 4000/5173 Already in Use"

**Problem**: Containers won't start due to port conflicts

**Solution**:
```bash
# Check what's using the ports
docker ps

# Stop all SvelteHR containers
make dev-down

# Start fresh
make dev
```

### Container Build Fails

**Problem**: Docker build errors

**Solution**:
```bash
# Rebuild from scratch (no cache)
make dev-rebuild

# If that fails, clean everything
make clean
make dev
```

### Missing Node Modules

**Problem**: Frontend shows "Cannot find module 'xyz'" error

**Solution**:
```bash
# Install dependencies inside container
docker exec sveltehr-frontend-dev bash -c "cd /home/dev/frontend && npm install"

# Or rebuild the container
make dev-rebuild
make dev
```

### Database Connection Issues

**Problem**: Backend can't connect to database

**Solution**:
```bash
# Check database health
docker ps | grep postgres

# View database logs
docker logs sveltehr-postgres-dev

# Reset database if needed
make db-reset
```

### Frontend Shows Blank Page

**Problem**: Frontend loads but shows errors

**Solution**:
```bash
# Check frontend logs
docker logs sveltehr-frontend-dev --tail 50

# Restart frontend container
docker restart sveltehr-frontend-dev

# View live logs
make dev-logs
```

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  Docker Containers (All Services)               │
│                                                 │
│  ┌──────────────────┐                          │
│  │ Frontend         │  Port: 5173 (Vite)       │
│  │ (SvelteKit)      │  SSH:  2223              │
│  └──────────────────┘                          │
│           ↓ API calls to backend-dev           │
│  ┌──────────────────┐                          │
│  │ Backend          │  Port: 4000 (GraphQL)    │
│  │ (PostGraphile)   │  Port: 5000 (GraphiQL)   │
│  │                  │  SSH:  2222              │
│  └──────────────────┘                          │
│           ↓                                     │
│  ┌──────────────────┐  ┌────────────┐          │
│  │ PostgreSQL       │  │ Redis      │          │
│  │ Port: 5433       │  │ Port: 6380 │          │
│  └──────────────────┘  └────────────┘          │
│                                                 │
│  All connected via: sveltehr-dev-network        │
└─────────────────────────────────────────────────┘
```

### Key Features

- **Hot Reload**: Both frontend and backend support hot module replacement
- **Shared Network**: All containers communicate via Docker network
- **Persistent Data**: Database and Redis use named volumes (data persists)
- **Ephemeral Builds**: Frontend `.svelte-kit` and `node_modules` use volumes
- **SSH Access**: Both frontend and backend containers have SSH + Neovim

## 📝 Differences Between Machines

### Why `make dev` Works Differently

**Old Setup** (your other computer):
- ❌ Frontend ran on **host** (not containerized)
- ❌ Confusing Makefile with 88 commands
- ❌ Port conflicts between host and containers

**New Setup** (this machine):
- ✅ Frontend runs in **container** (fully containerized)
- ✅ Clean Makefile with 17 focused commands
- ✅ No port conflicts, everything isolated

### What Changed in the Makefile?

| Old Command | New Command | What It Does |
|-------------|-------------|--------------|
| `make server-dev` ❌ | `make dev` ✅ | Start all containers |
| `npm run dev` ❌ | Built-in to container | Frontend auto-starts |
| 88 total commands | 17 total commands | Removed bloat |

## 🎯 Container Details

### Frontend Container (`sveltehr-frontend-dev`)

- **Base Image**: `node:20-bullseye`
- **Volumes**:
  - Source code mounted from host (live editing)
  - `node_modules` in named volume (performance)
  - `.svelte-kit` in named volume (build cache)
- **Ports**: 5173 (Vite), 2223 (SSH)
- **Auto-starts**: `npm run dev -- --host 0.0.0.0`

### Backend Container (`sveltehr-backend-dev`)

- **Base Image**: `node:20-bullseye`
- **Volumes**:
  - Backend code mounted from host
- **Ports**: 4000 (GraphQL), 5000 (GraphiQL), 2222 (SSH)
- **Auto-starts**: `npm run start:dev`

### Database Container (`sveltehr-postgres-dev`)

- **Base Image**: `postgres:15-alpine`
- **Volumes**:
  - Data: `sveltehr_postgres_dev_data` (persistent)
  - Migrations: Auto-applied from `/migrations` on startup
- **Ports**: 5433 (PostgreSQL)
- **Healthcheck**: Ensures DB is ready before backend starts

### Redis Container (`sveltehr-redis-dev`)

- **Base Image**: `redis:7-alpine`
- **Volumes**: `sveltehr_redis_dev_data` (persistent)
- **Ports**: 6380 (Redis)
- **Persistence**: AOF (append-only file) enabled

## 📚 Service URLs

Once `make dev` completes, access:

- **Frontend**: http://localhost:5173
- **Backend GraphQL**: http://localhost:4000/graphql
- **GraphiQL IDE**: http://localhost:5000/graphiql
- **PostgreSQL**: `psql -h localhost -p 5433 -U postgres -d hr_system`
- **Redis**: `redis-cli -p 6380`

## 🔧 Advanced Usage

### Rebuild Specific Container

```bash
# Rebuild just frontend
cd dev-containers && docker-compose -f docker-compose.dev.yml build frontend-dev

# Rebuild just backend
cd dev-containers && docker-compose -f docker-compose.dev.yml build backend-dev

# Start after rebuild
make dev
```

### View Logs for Specific Container

```bash
# Frontend only
docker logs -f sveltehr-frontend-dev

# Backend only
docker logs -f sveltehr-backend-dev

# Database only
docker logs -f sveltehr-postgres-dev
```

### Run Commands Inside Containers

```bash
# Run npm command in frontend
docker exec sveltehr-frontend-dev bash -c "cd /home/dev/frontend && npm run build"

# Run database query
docker exec sveltehr-postgres-dev psql -U postgres -d hr_system -c "SELECT COUNT(*) FROM employees;"

# Check Redis keys
docker exec sveltehr-redis-dev redis-cli KEYS '*'
```

### Clean Slate (Nuclear Option)

```bash
# Stop containers, delete volumes, clean Docker cache
make clean

# Rebuild everything
make dev-rebuild

# Start fresh
make dev
```

## 💡 Pro Tips

1. **First Time Setup**: Just run `make dev` - everything installs automatically
2. **Daily Usage**: `make dev` to start, `make dev-down` to stop
3. **Check Status**: `docker ps` shows all running containers
4. **View Logs**: `make dev-logs` shows all container logs (Ctrl+C to exit)
5. **Database Access**: `make db-shell` for quick PostgreSQL access
6. **Edit in Container**: `make ssh-frontend` or `make ssh-backend` to use Neovim inside

## 🆘 Still Having Issues?

1. Run `make help` to see all commands
2. Run `docker ps` to check container status
3. Run `make dev-logs` to see what's failing
4. Check `Makefile.backup` if you need the old Makefile back

---

**Everything working?** Your app should be running at http://localhost:5173 after `make dev`.
