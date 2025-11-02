# Helm Charts Configuration

This directory contains Helm values files for all operators and infrastructure components used in the SvelteHR deployment.

## Overview

All infrastructure is deployed using Helm for better lifecycle management, version control, and upgrade capabilities.

## Helm Charts Used

### 1. Prometheus Monitoring Stack
**Chart**: `prometheus-community/kube-prometheus-stack`
**Version**: Latest (Prometheus Operator + Prometheus + Grafana + Alertmanager)
**Namespace**: `monitoring`
**Values**: `kube-prometheus-stack-values.yaml`

**IMPORTANT**: This must be installed FIRST as it provides the PodMonitor and ServiceMonitor CRDs required by other operators.

Includes:
- Prometheus Operator with CRDs (PodMonitor, ServiceMonitor, PrometheusRule)
- Prometheus Server (metrics collection and storage)
- Grafana (visualization dashboards)
- Alertmanager (alert routing and notifications)
- Node Exporter (node-level metrics)
- Kube State Metrics (Kubernetes resource metrics)

**Access URLs** (NodePort):
- Prometheus: http://localhost:30090
- Grafana: http://localhost:30300 (admin/admin)
- Alertmanager: http://localhost:30093

### 2. CloudNativePG Operator
**Chart**: `cloudnative-pg/cloudnative-pg`
**Version**: 0.26.1 (App: v1.27.1)
**Namespace**: `cnpg-system`
**Values**: `cloudnative-pg-values.yaml`

Manages PostgreSQL clusters with:
- Automated backups and recovery
- High availability and replication
- Monitoring integration
- Declarative cluster management

### 2. Redis Operator
**Chart**: `redis-operator/redis-operator`
**Version**: Latest
**Namespace**: `operators`
**Values**: `redis-operator-values.yaml`

Manages Redis Sentinel clusters with:
- Automatic failover
- Persistent storage
- Metrics export
- High availability

### 3. ingress-nginx Controller
**Chart**: `ingress-nginx/ingress-nginx`
**Version**: 4.13.3 (App: v1.13.3)
**Namespace**: `ingress-nginx`
**Values**: `ingress-nginx-values.yaml`

**Note**: Only installed in production or when `INSTALL_INGRESS=true`

Provides:
- HTTP/HTTPS ingress routing
- TLS termination
- NodePort configuration for local dev (ports 30080/30443)
- Load balancing

### 4. cert-manager
**Chart**: `jetstack/cert-manager`
**Version**: 1.19.1 (App: v1.19.1)
**Namespace**: `cert-manager`
**Values**: `cert-manager-values.yaml`

**Note**: Only installed in production

Provides:
- Automated TLS certificate management
- Let's Encrypt integration
- Certificate renewal
- CRD-based certificate definitions

## Installation Order

**CRITICAL**: Components must be installed in this order due to CRD dependencies:

1. **Prometheus Stack** - Provides PodMonitor/ServiceMonitor CRDs
2. **CloudNativePG** - Requires PodMonitor CRDs
3. **Redis Operator** - Requires ServiceMonitor CRDs
4. **ingress-nginx** (optional) - Requires ServiceMonitor CRDs
5. **cert-manager** (prod only) - Requires ServiceMonitor CRDs

The deployment script handles this automatically.

## Usage

### Install All Operators

```bash
# Development environment
./k8s/deploy.sh dev install

# Production environment
./k8s/deploy.sh prod install

# Development with ingress
INSTALL_INGRESS=true ./k8s/deploy.sh dev install
```

### Access Monitoring Stack

After installation, access the monitoring components:

```bash
# Prometheus - metrics collection
# NodePort: http://localhost:30090
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090

# Grafana - visualization (login: admin/admin)
# NodePort: http://localhost:30300
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000

# Alertmanager - alert management
# NodePort: http://localhost:30093
kubectl port-forward -n monitoring svc/kube-prometheus-stack-alertmanager 9093
```

### Upgrade Individual Operators

```bash
# Upgrade Prometheus stack
helm upgrade kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values k8s/helm-values/kube-prometheus-stack-values.yaml

# Upgrade CloudNativePG
helm upgrade cloudnative-pg cloudnative-pg/cloudnative-pg \
  --namespace cnpg-system \
  --values k8s/helm-values/cloudnative-pg-values.yaml

# Upgrade Redis operator
helm upgrade redis-operator redis-operator/redis-operator \
  --namespace operators \
  --values k8s/helm-values/redis-operator-values.yaml

# Upgrade ingress-nginx
helm upgrade ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --values k8s/helm-values/ingress-nginx-values.yaml

# Upgrade cert-manager
helm upgrade cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --values k8s/helm-values/cert-manager-values.yaml
```

### List Installed Charts

```bash
# All Helm releases
helm list --all-namespaces

# Specific namespace
helm list -n monitoring
helm list -n cnpg-system
helm list -n operators
```

### View Metrics and Dashboards

```bash
# Check what's being monitored
kubectl get podmonitors --all-namespaces
kubectl get servicemonitors --all-namespaces

# View Prometheus targets
# Go to: http://localhost:30090/targets

# View Grafana dashboards
# Go to: http://localhost:30300
# Login: admin/admin
# Navigate to Dashboards > Browse
```

### Check Chart Status

```bash
helm status cloudnative-pg -n cnpg-system
helm status redis-operator -n operators
helm status ingress-nginx -n ingress-nginx
helm status cert-manager -n cert-manager
```

### Uninstall Charts

```bash
helm uninstall cloudnative-pg -n cnpg-system
helm uninstall redis-operator -n operators
helm uninstall ingress-nginx -n ingress-nginx
helm uninstall cert-manager -n cert-manager
```

## Customization

### Modifying Values

Edit the corresponding values file:
- `cloudnative-pg-values.yaml` - PostgreSQL operator settings
- `redis-operator-values.yaml` - Redis operator settings
- `ingress-nginx-values.yaml` - Ingress controller settings
- `cert-manager-values.yaml` - Certificate manager settings

After modifying, upgrade the chart:

```bash
helm upgrade <release-name> <chart> \
  --namespace <namespace> \
  --values k8s/helm-values/<values-file.yaml>
```

### Environment-Specific Overrides

You can create environment-specific value files:

```bash
# Create prod-specific values
cp cloudnative-pg-values.yaml cloudnative-pg-values-prod.yaml

# Install with override
helm upgrade cloudnative-pg cloudnative-pg/cloudnative-pg \
  --namespace cnpg-system \
  --values k8s/helm-values/cloudnative-pg-values.yaml \
  --values k8s/helm-values/cloudnative-pg-values-prod.yaml
```

## Troubleshooting

### Check CRD Installation

```bash
# CloudNativePG CRDs
kubectl get crd | grep cnpg

# Redis CRDs
kubectl get crd | grep redis

# cert-manager CRDs
kubectl get crd | grep cert-manager
```

### View Operator Logs

```bash
# CloudNativePG
kubectl logs -n cnpg-system deployment/cloudnative-pg -f

# Redis operator
kubectl logs -n operators deployment/redis-operator -f

# ingress-nginx
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller -f

# cert-manager
kubectl logs -n cert-manager deployment/cert-manager -f
```

### Helm Repository Updates

```bash
# Update all repos
helm repo update

# Add missing repos
helm repo add cloudnative-pg https://cloudnative-pg.github.io/charts
helm repo add redis-operator https://spotahome.github.io/redis-operator
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo add jetstack https://charts.jetstack.io
```

## Benefits of Helm Approach

1. **Version Management** - Pin specific chart versions for reproducible deployments
2. **Configuration as Code** - All settings in version-controlled YAML files
3. **Easy Upgrades** - Simple `helm upgrade` commands with rollback capability
4. **Dependency Management** - Helm handles CRD installation and ordering
5. **Environment Flexibility** - Same charts, different values for dev/prod
6. **Lifecycle Management** - Easy install, upgrade, and uninstall operations
7. **CRD Size Limits** - Helm avoids kubectl's CRD annotation size limits

## Version History

Track chart versions used:

```bash
# Show chart history
helm history cloudnative-pg -n cnpg-system
helm history redis-operator -n operators

# Rollback if needed
helm rollback cloudnative-pg -n cnpg-system
helm rollback redis-operator -n operators
```
