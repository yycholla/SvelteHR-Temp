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

## Quick Start

### 1. Install Operators

```bash
# Install CloudNativePG (PostgreSQL operator)
kubectl apply -f https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.22/releases/cnpg-1.22.1.yaml

# Install Redis operator
kubectl apply -f https://raw.githubusercontent.com/spotahome/redis-operator/master/example/operator/all-redis-operator-resources.yaml

# Install NGINX Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.4/deploy/static/provider/cloud/deploy.yaml
```

### 2. Create Secrets

```bash
# Create secrets for development
kubectl create secret generic sveltehr-secrets \
  --namespace=sveltehr-dev \
  --from-literal=postgres-password=your-db-password \
  --from-literal=jwt-secret=your-jwt-secret \
  --from-literal=jwt-refresh-secret=your-refresh-secret \
  --from-literal=service-auth-key=your-service-key
```

### 3. Deploy Development Environment

```bash
# Deploy to development
kubectl apply -k k8s/overlays/development

# Wait for deployments
kubectl wait --for=condition=available --timeout=300s deployment/sveltehr-backend -n sveltehr-dev
kubectl wait --for=condition=available --timeout=300s deployment/sveltehr-frontend -n sveltehr-dev
```

### 4. Access Application

```bash
# Port forward for local access
kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 8080:80

# Access at http://localhost:8080
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
