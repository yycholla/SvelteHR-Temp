# Quick Start Guide - Optimized Development Workflow

## ⚡ Fast Development Startup

### First Time Setup

```bash
make quick-start
```

### Daily Development (Fastest)

```bash
# Option 1: Start everything together (recommended)
make dev

# Option 2: Start backend quickly, then frontend separately
make dev-quick        # Starts backend instantly (no rebuild)
npm run dev           # In another terminal
```

### When to Rebuild

```bash
# Only when you change Dockerfile or backend dependencies
make dev-rebuild
```

## 🎯 What Changed?

**Before (Slow):**

- Every `make dev` rebuilt containers: ~60-90 seconds
- Blocking health checks: ~30-60 seconds
- Total startup time: **~2 minutes**

**After (Fast):**

- Skips rebuild if image exists: ~2 seconds
- No blocking health checks: Docker handles it
- Total startup time: **~5 seconds**

## 🚀 Available Commands

### Development Startup

| Command             | Use Case             | Speed             |
| ------------------- | -------------------- | ----------------- |
| `make dev`          | Complete environment | ⚡ Fast (5s)      |
| `make dev-quick`    | Backend only         | ⚡⚡ Instant (3s) |
| `make backend-dev`  | Backend services     | ⚡ Fast (5s)      |
| `make frontend-dev` | Frontend only        | ⚡⚡ Instant (1s) |

### Maintenance

| Command            | Use Case                                    |
| ------------------ | ------------------------------------------- |
| `make dev-rebuild` | Rebuild containers after Dockerfile changes |
| `make dev-health`  | Check if services are ready                 |
| `make dev-logs`    | View container logs                         |
| `make dev-stop`    | Stop all containers                         |
| `make clean`       | Full cleanup                                |

## 🔧 Service Readiness

Services start in background and become available within 10-20 seconds:

**Check Status:**

```bash
make dev-health
```

**View Logs:**

```bash
make dev-logs
```

## 📡 Service URLs

- **Backend API**: http://localhost:4000
- **GraphiQL**: http://localhost:5000
- **Frontend**: http://localhost:5173
- **PostgreSQL**: localhost:5433
- **Redis**: localhost:6380

## 🔑 SSH Access

```bash
ssh dev@localhost -p 2222  # Backend container
ssh dev@localhost -p 2223  # Frontend container
# Password: dev
```

## 💡 Pro Tips

1. **Use `dev-quick` for rapid iteration** - starts backend instantly
2. **Only run `dev-rebuild` when needed** - saves significant time
3. **Run `dev-health` if services seem slow** - verifies readiness
4. **Use separate terminals** for backend and frontend for better log visibility

## 🐛 Troubleshooting

**Services not responding?**

```bash
make dev-health  # Check status
make dev-logs    # View logs
```

**Need fresh start?**

```bash
make dev-stop
make dev
```

**Dependencies changed?**

```bash
make dev-rebuild
```
