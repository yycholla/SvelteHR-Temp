# Tilt Quick Reference Card

**SvelteHR Kubernetes Development with HMR**

---

## 🚀 Quick Start

```bash
# Start development
npm run dev:k8s

# Access services
open http://localhost:10350  # Tilt UI Dashboard
open http://localhost:5173   # Frontend (SvelteKit + HMR)
open http://localhost:4000   # Backend (GraphQL API)

# Stop (keep cluster)
npm run dev:k8s:down

# Stop and cleanup
npm run dev:k8s:clean
```

---

## 📝 Common Commands

| Task | Command |
|------|---------|
| Start Tilt | `npm run dev:k8s` or `tilt up` |
| Stop Tilt | `npm run dev:k8s:down` or `tilt down` |
| Full cleanup | `npm run dev:k8s:clean` |
| View logs | `tilt logs <resource-name>` |
| Manual trigger | `tilt trigger <resource-name>` |
| List resources | `tilt get resources` |

---

## 🔧 Development Workflow

```
1. npm run dev:k8s           # Start Tilt
2. Wait for green ✅ in UI   # All services ready
3. Edit src/routes/*.svelte  # Make changes
4. Watch browser update      # Instant HMR (<2s)
5. npm run dev:k8s:down      # Stop when done
```

---

## 🎯 What Gets Live-Synced?

**✅ Instant sync (no rebuild):**
- `src/` - All source code
- `static/` - Static assets
- `*.config.js` - Config files

**⚠️ Triggers rebuild:**
- `Dockerfile` changes
- `package.json` dependencies

---

## 🐛 Quick Fixes

**HMR not working?**
```bash
# Check frontend logs
tilt logs sveltehr-dev-frontend

# Restart Tilt
tilt down && tilt up
```

**Pod keeps restarting?**
```bash
# Check pod status
kubectl get pods -n sveltehr-dev

# View pod logs
kubectl logs -n sveltehr-dev <pod-name>
```

**Port already in use?**
```bash
# Find and kill process
lsof -i :5173
kill -9 <PID>
```

**Can't connect to K8s?**
```bash
# Verify cluster
kubectl cluster-info
kubectl get nodes

# Check context
kubectl config get-contexts
```

---

## 📊 Tilt UI (http://localhost:10350)

**Status Indicators:**
- 🟢 Green = Running OK
- 🟡 Yellow = Building/Updating
- 🔴 Red = Error (click for details)
- ⚪ Gray = Manual trigger

**Features:**
- Click resource → View logs
- Click button → Trigger manual action
- Watch build progress in real-time

---

## 🏗️ Project Structure

```
SvelteHR/
├── Tiltfile                           # Main Tilt configuration
├── .tiltignore                        # Files to exclude
├── k8s/helm-charts/sveltehr/
│   ├── tilt-values.yaml              # Tilt-specific Helm values
│   └── values-dev.yaml               # Base dev values
├── vite.config.ts                    # Vite with K8s HMR support
├── Dockerfile (development stage)    # Optimized for Tilt
└── TILT_DEVELOPMENT_GUIDE.md        # Full documentation
```

---

## 💡 Pro Tips

1. **Use the Tilt UI** - Visual feedback is faster than CLI
2. **Watch logs in UI** - Real-time updates without CLI commands
3. **Manual triggers** - Run tests/lint on-demand via UI buttons
4. **Keep cluster running** - Use `tilt down` not `--delete` between sessions
5. **Check .tiltignore** - Exclude large files for faster sync

---

## 🆘 Need Help?

1. See [TILT_DEVELOPMENT_GUIDE.md](./TILT_DEVELOPMENT_GUIDE.md) for detailed docs
2. Check Tilt UI logs for error details
3. Ask team in Slack #dev channel
4. Official docs: https://docs.tilt.dev

---

## ⚡ Performance Stats

| Metric | Before Tilt | With Tilt | Improvement |
|--------|-------------|-----------|-------------|
| Code change → Live | 60-120s | <2s | **30-60x faster** |
| Container rebuild | Every change | Never* | **∞ faster** |
| Feedback loop | Minutes | Seconds | **Game changer** |

*Rebuilds only on Dockerfile or major changes

---

**Happy Coding! 🚀**

*Tilt v0.35.2 - Last updated: 2025-11-02*
