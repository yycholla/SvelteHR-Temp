# SvelteHR Kubernetes Deployment

This directory contains the complete Kubernetes manifests for deploying SvelteHR using operators and best practices.

## Architecture

- **PostgreSQL**: CloudNativePG operator for high-availability PostgreSQL
- **Redis**: Spotahome Redis operator for clustered Redis
- **Ingress**: NGINX Ingress Controller for external access
- **Configuration**: Kustomize for environment-specific overlays

## Directory Structure

```
k8s/
├── base/                    # Base Kubernetes manifests
│   ├── kustomization.yaml   # Base configuration
│   ├── namespaces.yaml      # Namespace definitions
│   ├── configmap.yaml       # Application configuration
│   ├── secrets.yaml         # Secrets template
│   ├── postgres-cluster.yaml # PostgreSQL cluster
│   ├── redis-cluster.yaml   # Redis cluster
│   ├── backend-deployment.yaml # GraphQL backend
│   ├── frontend-deployment.yaml # SvelteKit frontend
│   ├── services.yaml        # Internal services
│   └── ingress.yaml         # Ingress routing
├── overlays/                # Environment-specific overlays
│   ├── development/         # Development environment
│   └── production/          # Production environment
└── operators/               # Operator installation guides
    ├── postgres/
    └── redis/
```

## Prerequisites

1. **Kubernetes Cluster**: k3s, minikube, or managed Kubernetes
2. **kubectl**: Configured to access your cluster
3. **kustomize**: For manifest customization (or kubectl 1.14+)
4. **Operators**: Install PostgreSQL and Redis operators first

## Quick Start (Proxmox K3s) ⚡

**🎯 One-Command Deployment:**

```bash
# Deploy both dev and prod environments
./k8s/proxmox-quickstart.sh

# Deploy only development
./k8s/proxmox-quickstart.sh --dev-only

# Deploy only production
./k8s/proxmox-quickstart.sh --prod-only
```

**📋 Prerequisites:**
- Proxmox VM with K3s installed
- Docker and local registry running
- kubectl configured

**📚 For complete Proxmox setup:** See [docs/PROXMOX_DEPLOYMENT.md](../docs/PROXMOX_DEPLOYMENT.md)

---

## Manual Deployment

### 1. Install Operators

```bash
# Automated operator installation
./k8s/deploy.sh dev install
```

This installs:
- CloudNativePG (PostgreSQL operator)
- Redis operator (Spotahome)

### 2. Build and Push Images

```bash
# Build for local registry
./k8s/scripts/build-and-push-local.sh latest

# Build for remote registry
./k8s/scripts/build-and-push-local.sh v1.0.0 registry.example.com
```

### 3. Deploy Environments

```bash
# Deploy development
./k8s/deploy.sh dev deploy

# Deploy production
./k8s/deploy.sh prod deploy
```

### 4. Access Applications

**Development:**

```bash
# Port forward services
kubectl port-forward -n sveltehr-dev svc/sveltehr-frontend 3000:3000
kubectl port-forward -n sveltehr-dev svc/sveltehr-backend 4000:4000

# Access at:
# Frontend: http://localhost:3000
# Backend GraphQL: http://localhost:4000/graphql
```

**Production:**

```bash
# Port forward services
kubectl port-forward -n sveltehr-prod svc/sveltehr-frontend 3001:3000
kubectl port-forward -n sveltehr-prod svc/sveltehr-backend 4001:4000
```

## Production Deployment

### Additional Prerequisites

1. **Domain**: Configure DNS for your domain
2. **SSL Certificate**: Set up cert-manager for automatic certificates
3. **Storage Classes**: Configure appropriate storage classes
4. **Backup Storage**: S3-compatible storage for database backups

### Deploy Production

```bash
# Create production secrets
kubectl create secret generic sveltehr-secrets \
  --namespace=sveltehr-prod \
  --from-literal=postgres-password=... \
  --from-literal=jwt-secret=... \
  --from-literal=jwt-refresh-secret=... \
  --from-literal=service-auth-key=...

# Create backup credentials
kubectl create secret generic sveltehr-backup-secret \
  --namespace=sveltehr-prod \
  --from-literal=ACCESS_KEY_ID=... \
  --from-literal=ACCESS_SECRET_KEY=...

# Deploy to production
kubectl apply -k k8s/overlays/production
```

## Configuration

### Environment Variables

All configuration is managed through ConfigMaps and Secrets. Key settings:

- **Database**: PostgreSQL connection via operator-generated services
- **Redis**: Redis cluster connection via operator-generated services
- **JWT**: Secrets for authentication tokens
- **Domains**: Configured in Ingress resources

### Scaling

- **Development**: Single replicas, minimal resources
- **Production**: Multiple replicas, higher resource limits
- **Database**: 3-node PostgreSQL cluster in production
- **Redis**: 3-node Redis cluster in production

### Monitoring

The setup includes:

- Pod monitors for Prometheus metrics collection
- Health checks for all services
- Resource monitoring and alerting

## Troubleshooting

### Common Issues

1. **Operator Not Ready**: Check operator pod logs
2. **Database Connection Failed**: Verify secrets and service names
3. **Ingress Not Working**: Check ingress class and controller status
4. **Certificate Issues**: Verify cert-manager installation and DNS

### Useful Commands

```bash
# Check pod status
kubectl get pods -n sveltehr-dev

# View logs
kubectl logs -f deployment/sveltehr-backend -n sveltehr-dev

# Check ingress
kubectl describe ingress sveltehr-ingress -n sveltehr-dev

# Port forward for debugging
kubectl port-forward svc/sveltehr-backend 4000:4000 -n sveltehr-dev
```

## Security Considerations

- **RBAC**: Service accounts with minimal permissions
- **Network Policies**: Isolation between namespaces
- **Secrets Management**: External secret stores for production
- **TLS**: Automatic certificate management with cert-manager
- **Pod Security**: Non-root containers with restricted capabilities

## Monitoring

The setup includes a complete monitoring stack:

- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization and dashboards
- **Node Exporter**: System-level metrics
- **Kube State Metrics**: Kubernetes object metrics

Access monitoring:

```bash
# Port forward Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090

# Port forward Grafana
kubectl port-forward -n monitoring svc/grafana 3000:3000
# Default login: admin/admin
```

## Next Steps

1. Configure backup and disaster recovery
2. Implement CI/CD pipeline updates
3. Add security policies and compliance checks
4. Set up log aggregation (Fluent Bit + Elasticsearch)

---

## Quick Reference

### Deployment Scripts

| Script | Purpose |
|--------|---------|
| `./k8s/proxmox-quickstart.sh` | One-command deployment for Proxmox K3s |
| `./k8s/deploy.sh dev install` | Install operators (PostgreSQL, Redis) |
| `./k8s/deploy.sh dev deploy` | Deploy development environment |
| `./k8s/deploy.sh prod deploy` | Deploy production environment |
| `./k8s/scripts/build-and-push-local.sh` | Build and push Docker images |
| `./k8s/setup-k3s.sh` | Configure kubectl for K3s |

### Common Commands

```bash
# View all pods
kubectl get pods -n sveltehr-dev
kubectl get pods -n sveltehr-prod

# View logs
kubectl logs -f deployment/sveltehr-frontend -n sveltehr-dev
kubectl logs -f deployment/sveltehr-backend -n sveltehr-dev

# Check database
kubectl get cluster -n sveltehr-dev
kubectl exec -it -n sveltehr-dev sveltehr-postgres-1 -- psql -U app

# Port forwarding
kubectl port-forward -n sveltehr-dev svc/sveltehr-frontend 3000:3000
kubectl port-forward -n sveltehr-dev svc/sveltehr-backend 4000:4000

# Resource usage
kubectl top nodes
kubectl top pods -n sveltehr-dev

# Restart deployments
kubectl rollout restart deployment/sveltehr-frontend -n sveltehr-dev
kubectl rollout restart deployment/sveltehr-backend -n sveltehr-dev
```

### Documentation

- **[Proxmox Deployment Guide](../docs/PROXMOX_DEPLOYMENT.md)** - Complete setup for Proxmox 8.4
- **[K8s Base Manifests](./base/)** - Core Kubernetes resources
- **[Environment Overlays](./overlays/)** - Dev/prod configurations
- **[Deployment Scripts](./scripts/)** - Helper scripts for deployment
