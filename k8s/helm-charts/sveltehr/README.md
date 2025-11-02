# SvelteHR Helm Chart

A comprehensive Helm chart for deploying the SvelteHR application with PostgreSQL (CloudNativePG) and Redis on Kubernetes.

## Overview

This Helm chart deploys a complete SvelteHR stack including:
- **Backend**: Rust GraphQL server (async-graphql + SeaORM)
- **Frontend**: SvelteKit application
- **PostgreSQL**: High-availability database cluster via CloudNativePG
- **Redis**: In-memory cache with replication support
- **Migrations**: Automatic database migrations via Helm hooks
- **Seed Data**: Optional initial data seeding

## Chart Version

- **Chart Version**: 2.0.0
- **App Version**: 1.0.0

## Prerequisites

- Kubernetes 1.24+
- Helm 3.14+
- CloudNativePG operator (installed automatically via dependency)
- Persistent Volume provisioner (for PostgreSQL and Redis storage)

## Dependencies

This chart automatically installs the following dependencies:

| Name | Version | Repository | Description |
|------|---------|------------|-------------|
| cloudnative-pg | 0.18.2 | https://cloudnative-pg.github.io/charts | PostgreSQL operator |
| redis | 18.6.1 | https://charts.bitnami.com/bitnami | Redis with replication support |

## Installation

### Quick Start (Development)

```bash
# Navigate to Helm chart directory
cd k8s/helm-charts/sveltehr

# Update dependencies
helm dependency update

# Install to development environment
helm install sveltehr . \
  -f values-dev.yaml \
  -n sveltehr-dev \
  --create-namespace \
  --wait --timeout 10m
```

### Quick Start (Production)

```bash
# Install to production environment
helm install sveltehr . \
  -f values.yaml \
  -f values-prod.yaml \
  -n sveltehr-prod \
  --create-namespace \
  --wait --timeout 10m
```

### Using the Deployment Script

```bash
# Deploy to development
./k8s/deploy.sh dev deploy

# Deploy to production
./k8s/deploy.sh prod deploy

# Test configuration (dry-run)
./k8s/deploy.sh dev test
```

## Configuration

### Values Files

- **`values.yaml`**: Base values (shared across all environments)
- **`values-dev.yaml`**: Development overrides (single replica, minimal resources)
- **`values-prod.yaml`**: Production overrides (HA, backups, resource limits)

### Key Configuration Sections

#### Global Settings

```yaml
global:
  namespace: sveltehr-dev
  environment: development
```

#### PostgreSQL Configuration

```yaml
postgresql:
  enabled: true
  instances: 1  # or 3 for HA
  storage:
    size: 5Gi
    storageClass: local-path
  database: hr_system
  username: hr_user
  password: "your-password"
```

#### Redis Configuration

```yaml
redis:
  enabled: true
  architecture: standalone  # or 'replication' for HA
  auth:
    enabled: false  # true for production
```

#### Backend Configuration

```yaml
backend:
  enabled: true
  replicaCount: 1
  image:
    repository: ghcr.io/mountain-care-rx/sveltehr/backend-server
    tag: latest
  resources:
    requests:
      memory: 128Mi
      cpu: 100m
    limits:
      memory: 256Mi
      cpu: 200m
```

#### Frontend Configuration

```yaml
frontend:
  enabled: true
  replicaCount: 1
  service:
    port: 5173  # dev: 5173, prod: 3000
  image:
    repository: ghcr.io/mountain-care-rx/sveltehr/frontend
    tag: latest
```

## Container Images

This chart uses multi-target Docker builds for separation of concerns:

| Image | Target | Purpose |
|-------|--------|---------|
| `backend-server` | server | GraphQL API server |
| `backend-migration` | migration | Database migrations |
| `backend-seed` | seed | Initial data seeding |
| `frontend` | runtime | SvelteKit application |

## Deployment Flow

1. **Helm Install/Upgrade**
   - Dependencies installed (PostgreSQL operator, Redis)

2. **PostgreSQL Cluster Created**
   - CloudNativePG creates PostgreSQL pods
   - Secrets auto-generated

3. **Redis Deployment Created**
   - Standalone or replicated based on config

4. **Migration Job Runs** (Helm pre-install/pre-upgrade hook)
   - Waits for PostgreSQL readiness
   - Runs database migrations
   - Guaranteed to complete before backend starts

5. **Backend Deployment Starts**
   - Waits for PostgreSQL
   - Connects to migrated database

6. **Frontend Deployment Starts**
   - Waits for backend (optional)
   - Connects to backend API

## Upgrading

### Upgrade Existing Release

```bash
helm upgrade sveltehr . \
  -f values-dev.yaml \
  -n sveltehr-dev \
  --wait --timeout 10m
```

### Rollback

```bash
# List revisions
helm history sveltehr -n sveltehr-dev

# Rollback to previous version
helm rollback sveltehr -n sveltehr-dev

# Rollback to specific revision
helm rollback sveltehr 2 -n sveltehr-dev
```

## Testing

### Dry-Run Deployment

```bash
helm install sveltehr . \
  -f values-dev.yaml \
  -n sveltehr-dev \
  --dry-run --debug > /tmp/helm-output.yaml
```

### Template Validation

```bash
helm template sveltehr . \
  -f values-dev.yaml \
  --namespace sveltehr-dev \
  --debug
```

### Helm Test (Manual Seed Job)

```bash
# Run seed job manually
helm test sveltehr -n sveltehr-dev --filter name=seed
```

## Monitoring

### Check Deployment Status

```bash
# Helm release status
helm status sveltehr -n sveltehr-dev

# Get current values
helm get values sveltehr -n sveltehr-dev

# View all resources
kubectl get all -n sveltehr-dev

# Check PostgreSQL cluster
kubectl get cluster -n sveltehr-dev

# Check Redis
kubectl get pods -n sveltehr-dev -l app.kubernetes.io/name=redis
```

### Logs

```bash
# Backend logs
kubectl logs -f deployment/sveltehr-backend -n sveltehr-dev

# Frontend logs
kubectl logs -f deployment/sveltehr-frontend -n sveltehr-dev

# Migration job logs
kubectl logs job/sveltehr-migration -n sveltehr-dev
```

## Accessing the Application

### Development

```bash
# Port-forward frontend (Vite dev server)
kubectl port-forward -n sveltehr-dev svc/sveltehr-frontend 5173:5173

# Port-forward backend (GraphQL API)
kubectl port-forward -n sveltehr-dev svc/sveltehr-backend 4000:4000

# Access at:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:4000
```

### Production (with Ingress)

If ingress is enabled in `values-prod.yaml`:
```bash
# Get ingress host
kubectl get ingress -n sveltehr-prod

# Access at configured domain (e.g., https://hr.yycholla.com)
```

## Uninstallation

### Remove Application

```bash
# Uninstall Helm release
helm uninstall sveltehr -n sveltehr-dev

# Delete namespace (optional)
kubectl delete namespace sveltehr-dev
```

### Remove Operator (Optional)

```bash
# Remove CloudNativePG operator
helm uninstall cloudnative-pg -n cnpg-system
kubectl delete namespace cnpg-system
```

## Architecture

### Container Optimization

This chart benefits from optimized Docker builds:

- **Rust Backend**: cargo-chef + BuildKit = 60-80% faster builds
- **Frontend**: npm/Vite cache mounts = 50-70% faster builds
- **Multi-target builds**: Separate images for server, migration, seed

### High Availability (Production)

Production configuration includes:

- **PostgreSQL**: 3-instance cluster with automatic failover
- **Redis**: 3 replicas + 3 sentinels
- **Backend**: 3 replicas with anti-affinity
- **Frontend**: 2 replicas with rolling updates
- **Pod Disruption Budgets**: minAvailable configured

### Security

- Non-root users (UID 1001)
- Read-only root filesystem where possible
- Capability dropping
- Security contexts throughout
- External Secrets for production (Doppler)

## Advanced Configuration

### External Secrets (Production)

```yaml
externalSecrets:
  enabled: true
  doppler:
    serviceToken: "dp.st.prod.your-token"
    project: "sveltehr"
    config: "prod"
```

### Backup Configuration (Production)

```yaml
postgresql:
  backup:
    enabled: true
    destinationPath: "s3://sveltehr-backups/postgresql"
    retentionPolicy: "30d"
    schedule: "0 2 * * *"  # Daily at 2 AM
    s3Credentials:
      secretName: sveltehr-s3-backup-secret
```

### Custom Resource Limits

```yaml
backend:
  resources:
    requests:
      memory: 512Mi
      cpu: 250m
    limits:
      memory: 1Gi
      cpu: 500m
```

## Troubleshooting

### PostgreSQL Not Starting

```bash
# Check PostgreSQL cluster
kubectl get cluster -n sveltehr-dev

# Check PostgreSQL pods
kubectl get pods -n sveltehr-dev -l cnpg.io/cluster=sveltehr-postgres

# View operator logs
kubectl logs -n cnpg-system deployment/cloudnative-pg
```

### Migration Job Failed

```bash
# Check migration job
kubectl get jobs -n sveltehr-dev -l helm.sh/hook=pre-install

# View migration logs
kubectl logs job/sveltehr-migration -n sveltehr-dev

# Delete failed job and retry
kubectl delete job sveltehr-migration -n sveltehr-dev
helm upgrade sveltehr . -f values-dev.yaml -n sveltehr-dev
```

### Backend Can't Connect to Database

```bash
# Check PostgreSQL service
kubectl get svc -n sveltehr-dev | grep postgres

# Test connection from backend pod
kubectl exec -it deployment/sveltehr-backend -n sveltehr-dev -- sh
# psql "postgresql://hr_user:password@sveltehr-postgres-rw:5432/hr_system"
```

## GitOps with ArgoCD

### Install ArgoCD Application

```bash
# Development
kubectl apply -f k8s/argocd/sveltehr-dev-application.yaml

# Production
kubectl apply -f k8s/argocd/sveltehr-application.yaml
```

### Sync Application

```bash
# Manual sync
argocd app sync sveltehr-dev

# Watch status
argocd app get sveltehr-dev --watch
```

## Contributing

When modifying the chart:

1. Update version in `Chart.yaml`
2. Test with `helm lint`
3. Validate with `helm template`
4. Test deployment in dev environment
5. Update this README if adding new features

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:
- GitHub Issues: https://github.com/Mountain-Care-Rx/SvelteHR/issues
- Documentation: See `HELM-CHART-READY.md` for deployment guide
