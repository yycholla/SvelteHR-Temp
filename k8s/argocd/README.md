# ArgoCD GitOps Setup for SvelteHR

This directory contains ArgoCD configuration for managing SvelteHR deployments using GitOps principles.

## What is ArgoCD?

ArgoCD is a declarative, GitOps continuous delivery tool for Kubernetes. It:
- Monitors your Git repository for changes
- Automatically syncs Kubernetes resources to match Git state
- Provides a Web UI for visualizing and managing deployments
- Ensures Git is the single source of truth

## Prerequisites

- ArgoCD installed in the cluster (see below)
- Git repository pushed to GitHub
- Tailscale operator (for remote access)

## Installation

ArgoCD is installed via Helm with custom values:

```bash
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update

helm install argocd argo/argo-cd \
  -n argocd \
  --create-namespace \
  -f k8s/helm-charts/argocd-values.yaml
```

## Access ArgoCD UI

### Via Tailscale (Recommended for Remote Access)

```bash
# ArgoCD is exposed via Tailscale at:
http://argocd.dropbear-elnath.ts.net

# Login credentials:
# Username: admin
# Password: (get with command below)
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

### Via Port Forward (Local Access)

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:80

# Access at: http://localhost:8080
```

## Deploy SvelteHR Application

Apply the ArgoCD Application resource:

```bash
kubectl apply -f k8s/argocd/sveltehr-application.yaml
```

This creates an ArgoCD Application that:
- Monitors the `main` branch of the SvelteHR Git repository
- Deploys the Helm chart from `k8s/helm-charts/sveltehr`
- Uses `values-prod.yaml` for production configuration
- Automatically syncs changes from Git
- Auto-heals manual kubectl changes (reverts to Git state)

## Sync Policies

The application is configured with:

- **Automated Sync**: Changes in Git trigger automatic deployment
- **Prune**: Resources removed from Git are deleted from cluster
- **Self-Heal**: Manual changes via kubectl are reverted to Git state
- **Retry**: Failed syncs retry up to 5 times with exponential backoff

## Manual Sync (Disable Automated Sync)

To require manual approval for deployments, edit `sveltehr-application.yaml` and remove the `automated` section:

```yaml
syncPolicy:
  syncOptions:
    - CreateNamespace=true
  # Remove this section for manual sync:
  # automated:
  #   prune: true
  #   selfHeal: true
```

Then sync manually via UI or CLI:

```bash
argocd app sync sveltehr-prod
```

## Managing Deployments

### View Application Status

```bash
# Via ArgoCD CLI
argocd app get sveltehr-prod

# Via kubectl
kubectl get application -n argocd sveltehr-prod -o yaml
```

### View Sync History

```bash
argocd app history sveltehr-prod
```

### Rollback to Previous Version

```bash
# Via ArgoCD CLI
argocd app rollback sveltehr-prod <revision-number>

# Via Git (recommended)
git revert <commit-sha>
git push
# ArgoCD will auto-sync the revert
```

### Manual Sync

```bash
argocd app sync sveltehr-prod
```

### View Diff (What Changed)

```bash
argocd app diff sveltehr-prod
```

## GitOps Workflow

### Making Changes

1. **Update Helm chart or values**:
   ```bash
   vim k8s/helm-charts/sveltehr/values-prod.yaml
   ```

2. **Commit and push to Git**:
   ```bash
   git add k8s/helm-charts/sveltehr/
   git commit -m "Update backend replicas to 5"
   git push origin main
   ```

3. **ArgoCD auto-detects change** (within 3 minutes):
   - Polls Git repository every 3 minutes
   - Detects diff between Git and cluster
   - Automatically syncs if automated sync enabled
   - Shows out-of-sync status in UI if manual sync required

4. **Verify deployment**:
   ```bash
   kubectl get pods -n sveltehr-prod
   # Or check ArgoCD UI
   ```

### Emergency Hotfix (Not Recommended)

For urgent fixes, you can temporarily bypass GitOps:

```bash
# Apply change directly
kubectl edit deployment sveltehr-backend -n sveltehr-prod

# ArgoCD will show "Out of Sync" status
# Self-heal will revert this change within 5 minutes

# To preserve the change, commit it to Git immediately:
vim k8s/helm-charts/sveltehr/values-prod.yaml
git add . && git commit -m "Emergency: increase backend memory" && git push
```

## Monitoring

ArgoCD provides:

- **Health Status**: GREEN (healthy), YELLOW (progressing), RED (degraded)
- **Sync Status**: Synced, Out of Sync, Unknown
- **Resource Tree**: Visual graph of all Kubernetes resources
- **Events**: Deployment history with timestamps and Git commits
- **Notifications**: Webhook/Slack alerts on sync failures (configure separately)

## Security Best Practices

1. **Delete initial admin secret** after creating a new admin password:
   ```bash
   argocd account update-password
   kubectl delete secret argocd-initial-admin-secret -n argocd
   ```

2. **Enable RBAC**: Configure ArgoCD users with limited permissions

3. **Use Git branch protection**: Require PR reviews before merging to main

4. **Use signed commits**: Verify Git commit authenticity

## Troubleshooting

### Application stuck in "Progressing" state

```bash
# Check pod status
kubectl get pods -n sveltehr-prod

# Check events
kubectl get events -n sveltehr-prod --sort-by='.lastTimestamp'

# Force sync
argocd app sync sveltehr-prod --force
```

### Out of Sync but no visible diff

```bash
# Clear app cache and refresh
argocd app get sveltehr-prod --refresh --hard-refresh
```

### Sync fails with permission error

```bash
# Check ArgoCD controller logs
kubectl logs -n argocd deployment/argocd-application-controller
```

## Uninstall

To remove ArgoCD Application (keeps ArgoCD server running):

```bash
kubectl delete application sveltehr-prod -n argocd
```

To completely uninstall ArgoCD:

```bash
helm uninstall argocd -n argocd
kubectl delete namespace argocd
```

## References

- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [GitOps Principles](https://opengitops.dev/)
- [ArgoCD Best Practices](https://argo-cd.readthedocs.io/en/stable/user-guide/best_practices/)
