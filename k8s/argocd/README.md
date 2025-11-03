# ArgoCD GitOps Configuration

Complete cluster-wide GitOps management for SvelteHR using ArgoCD with the **App-of-Apps** pattern.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Directory Structure](#directory-structure)
- [Getting Started](#getting-started)
- [Migration Guide](#migration-guide)
- [Usage Patterns](#usage-patterns)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## Architecture Overview

### GitOps Hierarchy

```
root-app (manual sync)
├── infrastructure (app-of-apps, manual sync)
│   ├── monitoring (Prometheus stack) - Wave 0
│   ├── cloudnative-pg (PostgreSQL operator) - Wave 1
│   ├── ingress-nginx (Ingress controller) - Wave 1
│   ├── cert-manager (Certificate manager) - Wave 1
│   ├── tailscale (Tailscale operator) - Wave 1
│   ├── external-secrets (External Secrets Operator) - Wave 1
│   ├── minio (Backup storage) - Wave 2
│   └── velero (Backup operator) - Wave 2
├── dev-apps (app-of-apps, manual sync)
│   └── sveltehr-dev (tracks develop branch, manual sync)
└── prod-apps (app-of-apps, manual sync)
    └── sveltehr-prod (tracks main branch, auto-sync)
```

### AppProjects

| Project         | Purpose                        | Namespaces                      |
|-----------------|--------------------------------|---------------------------------|
| infrastructure  | Platform components & operators| monitoring, cnpg-system, ingress-nginx, cert-manager, tailscale, backup |
| applications    | SvelteHR applications          | sveltehr-dev, sveltehr-prod     |
| security        | Secrets management             | external-secrets                |

### Sync Waves

Sync waves ensure proper dependency ordering during deployment:

- **Wave 0**: Monitoring (provides CRDs)
- **Wave 1**: Operators (CloudNativePG, Ingress, cert-manager, Tailscale, External Secrets)
- **Wave 2**: Services (MinIO, Velero)
- **Wave 3**: Applications (SvelteHR dev/prod)

---

## Directory Structure

```
k8s/argocd/
├── README.md                          # This file
├── bootstrap/                         # ArgoCD self-management (future)
│   └── argocd-application.yaml        # NOT CREATED YET (deferred)
├── projects/                          # AppProjects (RBAC)
│   ├── infrastructure.yaml            # Infrastructure components project
│   ├── applications.yaml              # SvelteHR applications project
│   └── security.yaml                  # Secrets management project
├── apps/                              # App-of-Apps definitions
│   ├── root-app.yaml                  # Root application (top-level)
│   ├── infrastructure.yaml            # Infrastructure app-of-apps
│   ├── dev-apps.yaml                  # Dev environment app-of-apps
│   └── prod-apps.yaml                 # Prod environment app-of-apps
├── infrastructure/                    # Infrastructure application manifests
│   ├── monitoring-app.yaml            # kube-prometheus-stack
│   ├── cloudnative-pg-app.yaml        # CloudNativePG operator
│   ├── ingress-nginx-app.yaml         # NGINX Ingress Controller
│   ├── cert-manager-app.yaml          # cert-manager
│   ├── tailscale-app.yaml             # Tailscale operator
│   ├── external-secrets-app.yaml      # External Secrets Operator
│   ├── minio-app.yaml                 # MinIO (S3-compatible storage)
│   └── velero-app.yaml                # Velero (backup operator)
└── applications/                      # Application manifests
    ├── dev/
    │   └── sveltehr-dev-app.yaml      # Dev environment (develop branch)
    └── prod/
        └── sveltehr-prod-app.yaml     # Prod environment (main branch)
```

---

## Getting Started

### Prerequisites

1. **ArgoCD installed** in the cluster (already configured at `argocd.dropbear-elnath.ts.net`)
2. **kubectl** configured for cluster access
3. **argocd CLI** installed (optional but recommended)

### Install ArgoCD CLI

```bash
# macOS
brew install argocd

# Linux
curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x argocd
sudo mv argocd /usr/local/bin/

# Login to ArgoCD
argocd login argocd.dropbear-elnath.ts.net
```

### Access ArgoCD UI

```bash
# Via Tailscale (recommended)
open https://argocd.dropbear-elnath.ts.net

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d
```

---

## Migration Guide

### Phase 1: Apply AppProjects

```bash
cd /home/chanway/SvelteHR

# Apply all AppProjects
kubectl apply -f k8s/argocd/projects/

# Verify
kubectl get appprojects -n argocd
```

**Expected output:**
```
NAME             AGE
infrastructure   5s
applications     5s
security         5s
```

### Phase 2: Migrate Infrastructure (One by One)

**Important:** Migrate infrastructure components individually to ensure stability.

```bash
# Step 1: Monitoring (Wave 0 - provides CRDs)
kubectl apply -f k8s/argocd/infrastructure/monitoring-app.yaml
argocd app get monitoring --refresh
argocd app sync monitoring --prune=false

# Wait for monitoring to be healthy
argocd app wait monitoring --health

# Step 2: Operators (Wave 1)
kubectl apply -f k8s/argocd/infrastructure/cloudnative-pg-app.yaml
argocd app sync cloudnative-pg

kubectl apply -f k8s/argocd/infrastructure/ingress-nginx-app.yaml
argocd app sync ingress-nginx

kubectl apply -f k8s/argocd/infrastructure/cert-manager-app.yaml
argocd app sync cert-manager

kubectl apply -f k8s/argocd/infrastructure/tailscale-app.yaml
argocd app sync tailscale

kubectl apply -f k8s/argocd/infrastructure/external-secrets-app.yaml
argocd app sync external-secrets

# Step 3: Backup Infrastructure (Wave 2) - NEW COMPONENTS
kubectl apply -f k8s/argocd/infrastructure/minio-app.yaml
argocd app sync minio

kubectl apply -f k8s/argocd/infrastructure/velero-app.yaml
argocd app sync velero

# Verify all infrastructure apps
argocd app list | grep -E "monitoring|cloudnative|ingress|cert-manager|tailscale|external-secrets|minio|velero"
```

### Phase 3: Create Infrastructure App-of-Apps

```bash
# After all individual infrastructure apps are healthy
kubectl apply -f k8s/argocd/apps/infrastructure.yaml

# Verify the app-of-apps was created
argocd app get infrastructure
```

### Phase 4: Migrate Applications

```bash
# Backup current state (safety measure)
helm get values sveltehr -n sveltehr-prod > /tmp/prod-values-backup.yaml
helm get values sveltehr -n sveltehr-dev > /tmp/dev-values-backup.yaml

# Remove old Application definitions
kubectl delete application sveltehr-prod -n argocd
kubectl delete application sveltehr-dev -n argocd

# Apply new Application definitions
kubectl apply -f k8s/argocd/applications/prod/sveltehr-prod-app.yaml
kubectl apply -f k8s/argocd/applications/dev/sveltehr-dev-app.yaml

# Verify no drift (should show minimal differences)
argocd app diff sveltehr-prod
argocd app diff sveltehr-dev

# Sync applications
argocd app sync sveltehr-prod  # Auto-sync enabled (selfHeal=true, prune=false)
argocd app sync sveltehr-dev   # Manual sync
```

### Phase 5: Create App-of-Apps for Environments

```bash
# Create app-of-apps for dev and prod
kubectl apply -f k8s/argocd/apps/dev-apps.yaml
kubectl apply -f k8s/argocd/apps/prod-apps.yaml

# Verify
argocd app list
```

### Phase 6: Deploy Root Application (Final Step)

```bash
# ONLY after all other apps are stable and healthy
kubectl apply -f k8s/argocd/apps/root-app.yaml

# Sync the root app (creates/manages all app-of-apps)
argocd app sync root-app

# View the complete application tree
argocd app tree root-app
```

### Verification Checklist

After migration, verify:

- [ ] All AppProjects exist: `kubectl get appprojects -n argocd`
- [ ] All infrastructure apps healthy: `argocd app list | grep infrastructure`
- [ ] All application apps healthy: `argocd app list | grep sveltehr`
- [ ] App-of-apps created: `argocd app get root-app`
- [ ] No out-of-sync applications: `argocd app list | grep OutOfSync`
- [ ] Production is accessible and functional
- [ ] Dev environment is accessible and functional

---

## Usage Patterns

### Daily Development Workflow

#### 1. Make Code Changes

```bash
# Make changes to frontend/backend code
git checkout -b feature/new-feature
# ... make changes ...
git commit -m "Add new feature"
git push origin feature/new-feature
```

#### 2. Merge to develop → Deploy to Dev

```bash
# After PR approval, merge to develop
git checkout develop
git merge feature/new-feature
git push origin develop

# ArgoCD automatically detects the change (polls every 3 minutes)
# Or manually trigger sync:
argocd app sync sveltehr-dev
```

#### 3. Promote to Production

```bash
# Merge develop to main
git checkout main
git merge develop
git push origin main

# Production auto-syncs (automated: selfHeal=true, prune=false)
# Monitor deployment:
argocd app get sveltehr-prod --watch
```

### Managing Infrastructure

#### Add New Infrastructure Component

1. Create Helm values file: `k8s/helm-values/new-component-values.yaml`
2. Create Application manifest: `k8s/argocd/infrastructure/new-component-app.yaml`
3. Commit to Git
4. Apply Application: `kubectl apply -f k8s/argocd/infrastructure/new-component-app.yaml`
5. Sync: `argocd app sync new-component`

#### Update Infrastructure Component

```bash
# Update values file in Git
git add k8s/helm-values/monitoring-values.yaml
git commit -m "Update Prometheus retention to 14 days"
git push

# ArgoCD detects the change (manual sync required)
argocd app sync monitoring
```

### Rollback Procedures

#### Rollback Application

```bash
# View deployment history
argocd app history sveltehr-prod

# Rollback to specific revision
argocd app rollback sveltehr-prod 42

# Or rollback to previous revision
argocd app rollback sveltehr-prod
```

#### Rollback Infrastructure

```bash
# View history
argocd app history monitoring

# Rollback
argocd app rollback monitoring 10
```

### Emergency Procedures

#### Pause Auto-Sync (Production Emergency)

```bash
# Disable auto-sync temporarily
kubectl patch application sveltehr-prod -n argocd \
  --type=json \
  -p='[{"op": "remove", "path": "/spec/syncPolicy/automated"}]'

# Re-enable after emergency
kubectl patch application sveltehr-prod -n argocd \
  --type=json \
  -p='[{"op": "add", "path": "/spec/syncPolicy/automated", "value": {"prune": false, "selfHeal": true}}]'
```

#### Force Sync (Override Differences)

```bash
# Force sync and replace resources
argocd app sync sveltehr-prod --force --replace
```

---

## Troubleshooting

### Common Issues

#### 1. Application Stuck in "Progressing" State

```bash
# Check application health
argocd app get <app-name>

# View events
kubectl get events -n <namespace> --sort-by='.lastTimestamp'

# Check pod logs
kubectl logs -n <namespace> <pod-name>
```

#### 2. Out of Sync Status (Expected Drift)

```bash
# View differences
argocd app diff <app-name>

# If differences are expected, add to ignoreDifferences in Application manifest
# Example: HPA-managed replicas, webhook CA bundles
```

#### 3. Sync Failed

```bash
# View sync operation details
argocd app get <app-name> --show-operation

# View logs
argocd app logs <app-name>

# Retry sync
argocd app sync <app-name> --retry-limit 5
```

#### 4. CRD Installation Issues

```bash
# For monitoring (Prometheus Operator CRDs)
kubectl get crds | grep monitoring.coreos.com

# If missing, manually apply CRDs
kubectl apply -f https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/main/example/prometheus-operator-crd/monitoring.coreos.com_servicemonitors.yaml
```

#### 5. Webhook Certificate Issues

```bash
# Check webhook configurations
kubectl get validatingwebhookconfigurations
kubectl get mutatingwebhookconfigurations

# If CA bundle is missing, cert-manager should inject it
# Restart cert-manager:
kubectl rollout restart deployment cert-manager -n cert-manager
```

### Debugging Commands

```bash
# List all applications
argocd app list

# Get detailed application info
argocd app get <app-name>

# View application tree (dependencies)
argocd app tree <app-name>

# View sync history
argocd app history <app-name>

# View application logs
argocd app logs <app-name> --follow

# Refresh application (re-detect Git changes)
argocd app get <app-name> --refresh

# Hard refresh (bypass cache)
argocd app get <app-name> --hard-refresh
```

---

## Best Practices

### 1. Sync Policies

- **Infrastructure**: Manual sync (safer for critical components)
- **Applications (Dev)**: Manual sync (controlled testing)
- **Applications (Prod)**: Auto-sync with `selfHeal=true`, `prune=false`

### 2. Version Pinning

```yaml
# Always pin Helm chart versions for infrastructure
targetRevision: 65.x  # Good (semantic versioning)
targetRevision: "*"   # Bad (unpredictable upgrades)
```

### 3. Git Branching Strategy

- `develop` → Dev environment (fast iteration)
- `main` → Production environment (stable)
- Use tags for releases: `v1.2.3`

### 4. Resource Management

- Set resource limits for all workloads
- Use `priorityClassName` for critical workloads
- Enable PodDisruptionBudgets in production

### 5. Security

- Never commit secrets to Git (use External Secrets or Sealed Secrets)
- Rotate ArgoCD admin password regularly
- Use AppProjects for RBAC (not default project)
- Enable webhook verification for Git repositories

### 6. Monitoring

- Monitor ArgoCD metrics in Prometheus
- Set up alerts for:
  - Application OutOfSync for >15 minutes
  - Sync failures
  - Health status degraded
- Review ArgoCD logs regularly

### 7. Backup and Disaster Recovery

- Backup ArgoCD Application manifests: `kubectl get applications -n argocd -o yaml > argocd-backup.yaml`
- Use Velero for cluster-wide backups
- Test restore procedures quarterly
- Document recovery runbook

---

## Advanced Topics

### Enable ArgoCD Self-Management (Future)

After all applications are stable, enable ArgoCD to manage itself:

```bash
# Create bootstrap application (NOT CREATED YET)
kubectl apply -f k8s/argocd/bootstrap/argocd-application.yaml

# Verify ArgoCD manages itself
argocd app get argocd
```

### Multi-Cluster Support

To manage multiple clusters from a single ArgoCD instance:

```bash
# Add another cluster
argocd cluster add staging-cluster

# Update Application destination to target staging
# spec:
#   destination:
#     name: staging-cluster
#     namespace: sveltehr-staging
```

### Progressive Delivery with Argo Rollouts

Integrate with Argo Rollouts for blue/green and canary deployments:

```bash
# Install Argo Rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml
```

---

## References

- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [App of Apps Pattern](https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/)
- [Sync Waves and Hooks](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/)
- [Best Practices](https://argo-cd.readthedocs.io/en/stable/user-guide/best_practices/)

---

## Support

For issues or questions:

1. Check [Troubleshooting](#troubleshooting) section
2. Review ArgoCD logs: `kubectl logs -n argocd deployment/argocd-server`
3. Check GitHub Issues: https://github.com/Mountain-Care-Rx/SvelteHR/issues
4. Contact DevOps team

---

**Last Updated:** 2025-11-03
**ArgoCD Version:** 2.9.x
**Cluster:** K3s (development/production)
