# Tilt Development Guide for SvelteHR

**Kubernetes Development with Hot Reloading HMR**

This guide explains how to use Tilt for rapid Kubernetes development with instant hot module replacement (HMR) for the SvelteHR application.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Daily Development Workflow](#daily-development-workflow)
- [Available Commands](#available-commands)
- [Tilt UI Dashboard](#tilt-ui-dashboard)
- [Troubleshooting](#troubleshooting)
- [Advanced Usage](#advanced-usage)
- [Performance Tips](#performance-tips)
- [FAQ](#faq)

---

## Overview

**What is Tilt?**

Tilt is a Kubernetes development tool that provides:

- ⚡ **Instant feedback** - File changes sync in <1 second
- 🔥 **Hot Module Replacement** - No container rebuilds needed
- 📊 **Visual dashboard** - See all services and logs in one place
- 🎯 **Smart rebuilds** - Only rebuilds what changed
- 🚀 **Production parity** - Uses real Helm charts and K8s resources

**Why Tilt for SvelteHR?**

Without Tilt:

```
Edit code → Rebuild container (60-120s) → Push image → K8s rollout → Test
Total: 2-3 minutes per change
```

With Tilt:

```
Edit code → File sync (<500ms) → Vite HMR (<1s) → Browser updates
Total: <2 seconds per change
```

**30-60x faster iteration speed!**

---

## Prerequisites

### Required

- ✅ **Kubernetes cluster** (K3s, minikube, Docker Desktop K8s, etc.)
  - K3s recommended for local development
  - Should have at least 4GB RAM available
- ✅ **kubectl** configured and pointing to your cluster
- ✅ **Helm 3** installed
- ✅ **Docker** running locally
- ✅ **Node.js 22+** and npm

### Verify Prerequisites

```bash
# Check Kubernetes cluster
kubectl cluster-info
kubectl get nodes

# Check Helm
helm version

# Check Docker
docker version

# Check Tilt (should already be installed)
tilt version
```

---

## Quick Start

### 1. Start Tilt

```bash
# From project root
npm run dev:k8s

# Or directly
tilt up
```

This will:

1. Build Docker images with development target
2. Deploy to Kubernetes using Helm charts
3. Set up file synchronization
4. Start watching for changes
5. Open dashboard at http://localhost:10350

### 2. Access Services

Once Tilt is running, access your services:

| Service      | URL                    | Description                |
| ------------ | ---------------------- | -------------------------- |
| **Tilt UI**  | http://localhost:10350 | Dashboard for all services |
| **Frontend** | http://localhost:5173  | SvelteKit app with HMR     |
| **Backend**  | http://localhost:4000  | Rust GraphQL API           |

### 3. Start Developing

Edit any file in `src/` and watch it instantly update in your browser!

```bash
# Try editing a page
vim src/routes/+page.svelte

# Changes sync automatically - no rebuild needed!
```

### 4. Stop Tilt

```bash
# Stop Tilt but keep K8s resources running
npm run dev:k8s:down

# Stop and delete all K8s resources
npm run dev:k8s:clean
```

---

## Architecture

### How Tilt Works

```
┌─────────────────────────────────────────────────────────────────┐
│                         Developer Machine                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Edit src/routes/+page.svelte                                  │
│         ↓                                                       │
│  Tilt detects change (inotify)                                 │
│         ↓                                                       │
│  Sync file to K8s pod (rsync-like)                            │
│                                                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Live Update (no rebuild)
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster (K3s)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Frontend Pod                                                   │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  /app/src/routes/+page.svelte (updated)                   │ │
│  │         ↓                                                  │ │
│  │  Vite dev server detects change                          │ │
│  │         ↓                                                  │ │
│  │  HMR WebSocket notification                              │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ WebSocket (ws://localhost:5173)
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                           Browser                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Page updates instantly (HMR) - no refresh needed!            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Total time: <2 seconds
```

### File Sync Strategy

Tilt uses **live_update** to sync specific files/directories:

```python
# From Tiltfile
live_update=[
  sync('./src', '/app/src'),              # Sync source code
  sync('./static', '/app/static'),         # Sync static assets
  sync('./package.json', '/app/package.json'),  # Sync package files

  # Run npm install only when package.json changes
  run('npm install', trigger=['./package.json']),
]
```

**What gets synced:**

- ✅ `src/` directory (all source code)
- ✅ `static/` directory (assets)
- ✅ Config files (vite.config.ts, svelte.config.js, etc.)

**What does NOT get synced (triggers rebuild):**

- ❌ `Dockerfile` changes
- ❌ `node_modules/` changes (only package.json triggers npm install)
- ❌ Build artifacts (`.svelte-kit/`, `build/`, etc.)

---

## Daily Development Workflow

### Morning Startup

```bash
# 1. Navigate to project
cd ~/SvelteHR

# 2. Start Tilt
npm run dev:k8s

# 3. Wait for services to be ready (watch Tilt UI)
# Green checkmarks = ready to develop!

# 4. Open your editor
code .

# 5. Start coding!
```

### During Development

**Edit source files:**

```bash
# Edit any file - changes sync automatically
vim src/routes/+page.svelte
vim src/lib/components/MyComponent.svelte
vim src/lib/stores/auth.ts
```

**Run tests (manual trigger in Tilt UI):**

- Click **"typecheck"** button in Tilt UI
- Click **"lint"** button
- Click **"test-unit"** button

Or use CLI:

```bash
tilt trigger typecheck
tilt trigger lint
tilt trigger test-unit
```

**View logs:**

```bash
# In Tilt UI - click on any resource to see logs
# Or use CLI:
npm run dev:k8s:logs sveltehr-dev-frontend
npm run dev:k8s:logs sveltehr-dev-backend
```

**Install new dependencies:**

```bash
# Edit package.json (add new dependency)
vim package.json

# Tilt will detect change and run npm install automatically
# Watch the "frontend" resource in Tilt UI for progress
```

### End of Day

```bash
# Keep cluster running (recommended)
npm run dev:k8s:down

# OR completely clean up
npm run dev:k8s:clean
```

---

## Available Commands

### NPM Scripts

| Command                   | Description                            |
| ------------------------- | -------------------------------------- |
| `npm run dev:k8s`         | Start Tilt and begin development       |
| `npm run dev:k8s:down`    | Stop Tilt (keep K8s resources)         |
| `npm run dev:k8s:clean`   | Stop Tilt and delete all K8s resources |
| `npm run dev:k8s:logs`    | View logs for a resource               |
| `npm run dev:k8s:ci`      | Run Tilt in CI mode (wait for success) |
| `npm run dev:k8s:trigger` | Manually trigger a resource rebuild    |

### Tilt CLI Commands

| Command                         | Description                      |
| ------------------------------- | -------------------------------- |
| `tilt up`                       | Start Tilt                       |
| `tilt down`                     | Stop Tilt (keep resources)       |
| `tilt down --delete-namespaces` | Stop and delete everything       |
| `tilt logs <resource>`          | View logs for specific resource  |
| `tilt trigger <resource>`       | Manually rebuild a resource      |
| `tilt get resources`            | List all resources               |
| `tilt describe <resource>`      | Get detailed info about resource |
| `tilt ci`                       | Run in CI mode (non-interactive) |

---

## Tilt UI Dashboard

Access the Tilt UI at **http://localhost:10350**

### Main Dashboard View

```
╔═════════════════════════════════════════════════════════════════╗
║                        Tilt Dashboard                           ║
╠═════════════════════════════════════════════════════════════════╣
║                                                                 ║
║  Resource Name              Status    Runtime    Build Time    ║
║  ──────────────────────────────────────────────────────────────║
║  ✅ sveltehr-dev-frontend    OK        2m 30s    1m 45s        ║
║  ✅ sveltehr-dev-backend     OK        3m 12s    2m 10s        ║
║  ✅ sveltehr-dev-postgres    OK        1m 45s    -             ║
║  ✅ sveltehr-dev-redis       OK        1m 20s    -             ║
║  ⚪ typecheck                -         -         Manual        ║
║  ⚪ lint                     -         -         Manual        ║
║  ⚪ test-unit                -         -         Manual        ║
║                                                                 ║
╚═════════════════════════════════════════════════════════════════╝
```

### Features

**1. Resource Status**

- 🟢 Green = Running successfully
- 🟡 Yellow = Building or updating
- 🔴 Red = Error (click for details)
- ⚪ Gray = Not started (manual resources)

**2. Logs Viewer**

- Click any resource to see live logs
- Auto-scroll to latest
- Search/filter logs

**3. Manual Triggers**

- Click button next to manual resources to run them
- Examples: typecheck, lint, test-unit

**4. Build History**

- See past builds and their status
- Click to see build logs

---

## Troubleshooting

### Common Issues

#### 1. "Cannot connect to Kubernetes cluster"

**Problem:** Tilt can't reach your K8s cluster

**Solution:**

```bash
# Verify kubectl is configured
kubectl cluster-info

# Check if cluster is running
kubectl get nodes

# If using K3s, ensure it's started
sudo systemctl status k3s

# Point kubectl to correct context
kubectl config get-contexts
kubectl config use-context <your-context>
```

#### 2. "Build failed: error building image"

**Problem:** Docker build is failing

**Solution:**

```bash
# Test Docker build manually
docker build --target development -t test:dev .

# Check Docker daemon is running
docker ps

# Clean Docker cache
docker builder prune
```

#### 3. "HMR not working - browser not updating"

**Problem:** File changes not triggering browser updates

**Solution:**

```bash
# 1. Check Tilt is detecting file changes (watch Tilt UI)
# 2. Check browser console for WebSocket errors
# 3. Try enabling polling in vite.config.ts:
#    Set VITE_USE_POLLING=true

# 4. Verify frontend pod is running
kubectl get pods -n sveltehr-dev | grep frontend

# 5. Check frontend logs
tilt logs sveltehr-dev-frontend
```

#### 4. "Pod keeps restarting"

**Problem:** Frontend pod in CrashLoopBackOff

**Solution:**

```bash
# Check pod status
kubectl get pods -n sveltehr-dev

# Check pod logs
kubectl logs -n sveltehr-dev <pod-name>

# Common causes:
# - Missing environment variables
# - npm install failed
# - Port already in use
# - Health check timeout too aggressive

# Increase health check timeout in tilt-values.yaml:
# livenessProbe:
#   initialDelaySeconds: 300  # Give more time
```

#### 5. "Port forwarding failed"

**Problem:** Can't access http://localhost:5173

**Solution:**

```bash
# Check if port is already in use
lsof -i :5173
# Kill process if needed

# Manual port-forward
kubectl port-forward -n sveltehr-dev svc/sveltehr-dev-frontend 5173:5173

# Restart Tilt
tilt down && tilt up
```

#### 6. "npm install not running"

**Problem:** Dependencies not updating after package.json change

**Solution:**

```bash
# Manually trigger rebuild
tilt trigger sveltehr-dev-frontend

# Or exec into pod and run manually
kubectl exec -n sveltehr-dev -it <frontend-pod> -- npm install
```

---

## Advanced Usage

### Custom Namespace

```bash
# Use custom namespace
tilt up -- --namespace=my-custom-dev

# Or edit Tiltfile:
namespace = 'my-custom-dev'
```

### Multiple Developers

**Option 1: Separate namespaces**

```bash
# Alice
tilt up -- --namespace=sveltehr-dev-alice

# Bob
tilt up -- --namespace=sveltehr-dev-bob
```

**Option 2: Local K3s clusters**

```bash
# Each developer runs own K3s
k3d cluster create sveltehr-dev-alice
```

### Debugging Inside Containers

```bash
# Get shell in frontend pod
kubectl exec -n sveltehr-dev -it <frontend-pod> -- sh

# Inside pod:
npm list              # Check installed packages
ls -la /app/src       # Verify synced files
ps aux                # Check running processes
```

### Performance Profiling

```bash
# Time a full rebuild
time tilt down --delete-namespaces && tilt up

# Monitor resource usage
kubectl top pods -n sveltehr-dev

# Tilt analytics
tilt analytics
```

---

## Performance Tips

### 1. Optimize .tiltignore

Exclude unnecessary files to speed up sync:

```bash
# Add to .tiltignore
large-dataset/
*.mp4
*.zip
```

### 2. Use Persistent Volumes for Caches

Vite cache is already configured as PersistentVolumeClaim in production setup.

For development, emptyDir is faster but non-persistent.

### 3. Limit Resource Watching

Only watch files you're actively working on:

```python
# In Tiltfile
only=[
  './src',          # Watch source
  './static',       # Watch static
  # Don't watch node_modules, build artifacts, etc.
]
```

### 4. Disable Unnecessary Services

Comment out services you're not using:

```python
# In Tiltfile
# k8s_resource('sveltehr-dev-redis', ...)  # Comment if not needed
```

---

## FAQ

### Q: Do I need to run Tilt all the time?

**A:** No! You can still use `npm run dev` locally for pure frontend work. Use Tilt when you need:

- Full K8s environment (backend, database, etc.)
- Testing production-like setup
- Working on features that need all services

### Q: Does Tilt work with remote K8s clusters?

**A:** Yes! Tilt works with any K8s cluster kubectl can access. However, file sync may be slower over network.

### Q: Can I use Tilt in CI/CD?

**A:** Yes! Use `tilt ci` mode for automated testing:

```bash
tilt ci  # Runs until all resources are ready, then exits
```

### Q: How do I update Tilt?

**A:** Reinstall with the same command:

```bash
curl -fsSL https://raw.githubusercontent.com/tilt-dev/tilt/master/scripts/install.sh | bash
```

### Q: Does Tilt replace ArgoCD?

**A:** No! Tilt is for **development only**. ArgoCD still manages production deployments.

- Tilt: Dev environment (namespace: sveltehr-dev)
- ArgoCD: Production (namespace: sveltehr-prod)

### Q: Can I disable live updates and use normal rebuilds?

**A:** Yes! Set `trigger_mode=TRIGGER_MODE_MANUAL` in Tiltfile, then manually trigger rebuilds.

---

## Additional Resources

- **Tilt Documentation:** https://docs.tilt.dev
- **Tilt Best Practices:** https://docs.tilt.dev/best_practices.html
- **SvelteKit HMR:** https://kit.svelte.dev/docs/cli#vite-hmr
- **Kubernetes Local Dev:** https://kubernetes.io/docs/tasks/debug/

---

## Support

If you encounter issues:

1. Check this guide's [Troubleshooting](#troubleshooting) section
2. View Tilt UI logs for detailed error messages
3. Ask the team in Slack #dev channel
4. Create an issue in the repository

---

**Happy Developing! 🚀**

_Last updated: 2025-11-02_
