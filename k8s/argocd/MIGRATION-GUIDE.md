# ArgoCD Migration Troubleshooting Guide

Quick reference for handling migration from manual Helm to ArgoCD-managed infrastructure.

## Expected Issue: Orphaned Resources

### What Are Orphaned Resources?

When migrating existing Helm releases to ArgoCD, you'll see warnings like:
```
OrphanedResourceWarning
Application has 133 orphaned resources
```

**This is EXPECTED and NOT an error!**

### Why This Happens

- Existing resources were created by manual `helm install`
- ArgoCD doesn't "own" these resources yet (no ArgoCD labels/annotations)
- ArgoCD detects them as "orphaned" (exist in cluster but not managed)

### How to Fix: Adopt Orphaned Resources

**Option 1: Sync with Replace (Recommended for Migration)**

```bash
# This tells ArgoCD to adopt existing resources
argocd app sync monitoring --replace

# Or force sync if there are minor differences
argocd app sync monitoring --force --replace
```

**Option 2: Manual Resource Adoption**

If sync fails, manually add ArgoCD labels to existing resources:

```bash
# Get list of orphaned resources
argocd app resources monitoring | grep -i orphan

# Add ArgoCD labels to adopt resources
kubectl label deployment prometheus-operator \
  -n monitoring \
  app.kubernetes.io/instance=monitoring \
  app.kubernetes.io/managed-by=Helm

# Then sync normally
argocd app sync monitoring
```

**Option 3: Fresh Install (Nuclear Option)**

If the above doesn't work, uninstall and let ArgoCD reinstall:

```bash
# Delete Helm release (WARNING: this deletes all resources!)
helm uninstall kube-prometheus-stack -n monitoring

# Sync ArgoCD app (creates everything fresh)
argocd app sync monitoring
```

---

## Comparison Error Fix

### Error Message
```
ComparisonError
Failed to load target state: failed to generate manifest for source 1 of 2
```

### Root Cause
Multi-source Applications require ArgoCD 2.6+

### Verify ArgoCD Version

```bash
argocd version

# Should show:
# argocd: v2.9.x or higher
# argocd-server: v2.9.x or higher
```

### Fix
The monitoring-app.yaml has been updated with correct multi-source syntax.

After committing the fix:
```bash
# Commit the updated manifests
git add k8s/argocd/infrastructure/
git commit -m "fix: Correct multi-source syntax for infrastructure apps"
git push

# Refresh the application
argocd app get monitoring --refresh --hard-refresh

# Sync with adoption
argocd app sync monitoring --replace
```

---

## Step-by-Step Migration Process

### 1. Commit All Fixes

```bash
cd /home/chanway/SvelteHR
git add k8s/argocd/
git commit -m "fix: ArgoCD multi-source syntax and migration handling"
git push origin main
```

### 2. Refresh ArgoCD App

```bash
# Hard refresh to pull latest Git changes
argocd app get monitoring --refresh --hard-refresh
```

### 3. Check Application Status

```bash
# Should now show "Synced" status (may show OutOfSync if resources differ)
argocd app get monitoring

# View diff between Git and cluster
argocd app diff monitoring
```

### 4. Sync with Resource Adoption

```bash
# Sync and adopt existing resources
argocd app sync monitoring --replace --prune=false

# Watch sync progress
argocd app get monitoring --watch
```

### 5. Verify Success

```bash
# Application should be "Synced" and "Healthy"
argocd app get monitoring

# Orphaned resource count should be 0
argocd app resources monitoring | grep -i orphan
```

---

## Common Pitfalls

### ❌ "Application has resources that are not tracked"

**Solution**: This is the orphaned resources issue. Use `--replace` flag when syncing.

### ❌ "Resource already exists"

**Solution**: Use `--force` flag to replace existing resources:
```bash
argocd app sync monitoring --force --replace
```

### ❌ "Helm release already exists"

**Solution**: Either:
1. Let ArgoCD adopt the existing release (use `--replace`)
2. Delete the Helm release first: `helm uninstall <release> -n <namespace>`

### ❌ Multi-source not supported

**Solution**: Upgrade ArgoCD to 2.6+:
```bash
helm upgrade argocd argo/argo-cd \
  -n argocd \
  -f k8s/helm-charts/argocd-values.yaml
```

---

## Migration Checklist

For each infrastructure component:

- [ ] Commit fixed Application manifest to Git
- [ ] Push to GitHub
- [ ] Refresh ArgoCD application: `argocd app get <name> --refresh --hard-refresh`
- [ ] Check diff: `argocd app diff <name>`
- [ ] Sync with adoption: `argocd app sync <name> --replace`
- [ ] Verify health: `argocd app get <name>`
- [ ] Check orphaned resources reduced to 0

---

## Quick Commands Reference

```bash
# Refresh app from Git
argocd app get <app-name> --refresh --hard-refresh

# View differences
argocd app diff <app-name>

# Sync with adoption
argocd app sync <app-name> --replace

# Force sync (override validation)
argocd app sync <app-name> --force --replace

# Watch sync progress
argocd app get <app-name> --watch

# View application tree
argocd app tree <app-name>

# Get application status
argocd app get <app-name>

# List all applications
argocd app list
```

---

## Next Steps After Monitoring Migration

Once monitoring is successfully migrated:

1. ✅ Monitoring (completed)
2. ⏭️ CloudNativePG: `kubectl apply -f k8s/argocd/infrastructure/cloudnative-pg-app.yaml`
3. ⏭️ Ingress NGINX: `kubectl apply -f k8s/argocd/infrastructure/ingress-nginx-app.yaml`
4. ⏭️ cert-manager: `kubectl apply -f k8s/argocd/infrastructure/cert-manager-app.yaml`
5. ⏭️ Tailscale: `kubectl apply -f k8s/argocd/infrastructure/tailscale-app.yaml`
6. ⏭️ External Secrets: `kubectl apply -f k8s/argocd/infrastructure/external-secrets-app.yaml`
7. ⏭️ MinIO: `kubectl apply -f k8s/argocd/infrastructure/minio-app.yaml`
8. ⏭️ Velero: `kubectl apply -f k8s/argocd/infrastructure/velero-app.yaml`

Follow the same process for each component!

---

**Last Updated:** 2025-11-03
