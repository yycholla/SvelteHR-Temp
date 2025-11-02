# Complete System Teardown and Initialization Guide

## Overview

This guide covers the complete teardown and fresh initialization of the SvelteHR system, including infrastructure and application components.

---

## 🗑️ Complete Teardown (Reverse Order)

**Important:** Teardown in **reverse order** of installation to avoid orphaned resources.

### Step 1: Remove All Applications

```bash
# List all Helm releases across all namespaces
helm list --all-namespaces

# Option A: Remove specific application
helm uninstall sveltehr -n sveltehr-dev
helm uninstall sveltehr -n sveltehr-prod

# Option B: Quick script to remove all sveltehr releases
helm list --all-namespaces | grep sveltehr | awk '{print $1, $2}' | while read release namespace; do
  helm uninstall $release -n $namespace
done

# Verify applications are gone
helm list --all-namespaces | grep sveltehr
```

**Expected Output:**
```
release "sveltehr" uninstalled
```

### Step 2: Delete Application Namespaces

```bash
# Delete dev namespace
kubectl delete namespace sveltehr-dev

# Delete prod namespace
kubectl delete namespace sveltehr-prod

# Verify namespaces are gone (may take 30-60 seconds)
kubectl get namespaces | grep sveltehr
```

**Note:** Namespace deletion can take time if PVCs need to be cleaned up.

### Step 3: Remove Operators (If Installed)

```bash
# Remove CloudNativePG operator
helm uninstall cloudnative-pg -n cnpg-system

# Delete operator namespace
kubectl delete namespace cnpg-system

# Verify CRDs are removed (optional - may want to keep for next install)
kubectl get crd | grep cnpg
kubectl delete crd clusters.postgresql.cnpg.io --ignore-not-found=true
kubectl delete crd backups.postgresql.cnpg.io --ignore-not-found=true
kubectl delete crd scheduledbackups.postgresql.cnpg.io --ignore-not-found=true
kubectl delete crd poolers.postgresql.cnpg.io --ignore-not-found=true
```

### Step 4: Remove Infrastructure Components (Optional)

**⚠️ Warning:** Only do this if you want to tear down **ALL** infrastructure (affects all apps in cluster).

```bash
# Remove monitoring stack
helm uninstall prometheus -n monitoring 2>/dev/null || true
helm uninstall kube-prometheus-stack -n monitoring 2>/dev/null || true
kubectl delete namespace monitoring

# Remove ingress controller
helm uninstall ingress-nginx -n ingress-nginx 2>/dev/null || true
kubectl delete namespace ingress-nginx

# Remove cert-manager
helm uninstall cert-manager -n cert-manager 2>/dev/null || true
kubectl delete namespace cert-manager

# Remove cert-manager CRDs (required for clean reinstall)
kubectl delete crd certificates.cert-manager.io --ignore-not-found=true
kubectl delete crd certificaterequests.cert-manager.io --ignore-not-found=true
kubectl delete crd challenges.acme.cert-manager.io --ignore-not-found=true
kubectl delete crd clusterissuers.cert-manager.io --ignore-not-found=true
kubectl delete crd issuers.cert-manager.io --ignore-not-found=true
kubectl delete crd orders.acme.cert-manager.io --ignore-not-found=true

# Remove External Secrets Operator (if installed)
helm uninstall external-secrets -n external-secrets-system 2>/dev/null || true
kubectl delete namespace external-secrets-system
```

### Step 5: Clean Up Persistent Volumes (Critical!)

```bash
# List all PVCs (should be empty after namespace deletion)
kubectl get pvc --all-namespaces | grep sveltehr

# List all PVs
kubectl get pv

# Delete orphaned PVs if any (be careful!)
kubectl get pv | grep Released | awk '{print $1}' | xargs -r kubectl delete pv

# If using local-path storage (k3s), clean up local directories
# SSH to each node and run:
sudo rm -rf /var/lib/rancher/k3s/storage/pvc-*
```

**⚠️ Warning:** This deletes **ALL DATA**. Make backups if needed!

### Step 6: Verify Complete Cleanup

```bash
# Check for any remaining sveltehr resources
kubectl get all --all-namespaces | grep sveltehr

# Check for remaining namespaces
kubectl get namespaces | grep -E "sveltehr|cnpg|monitoring|ingress|cert-manager"

# Check for remaining PVs
kubectl get pv

# Check for remaining Helm releases
helm list --all-namespaces

# Check for remaining secrets
kubectl get secrets --all-namespaces | grep sveltehr
```

**Expected:** All commands should return no results.

---

## 🚀 Fresh Initialization (Installation Order)

### Prerequisites Check

```bash
# Verify kubectl is working
kubectl cluster-info

# Verify Helm is installed
helm version

# Verify cluster has enough resources
kubectl top nodes  # (if metrics-server installed)

# Check available storage classes
kubectl get storageclass
```

### Step 1: Add Helm Repositories

```bash
# Add all required Helm repositories
helm repo add cloudnative-pg https://cloudnative-pg.github.io/charts
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo add jetstack https://charts.jetstack.io
helm repo add external-secrets https://charts.external-secrets.io

# Update all repositories
helm repo update

# Verify repositories
helm repo list
```

**Expected Output:**
```
NAME                    URL
cloudnative-pg          https://cloudnative-pg.github.io/charts
bitnami                 https://charts.bitnami.com/bitnami
prometheus-community    https://prometheus-community.github.io/helm-charts
ingress-nginx           https://kubernetes.github.io/ingress-nginx
jetstack                https://charts.jetstack.io
external-secrets        https://charts.external-secrets.io
```

### Step 2: Install Infrastructure (Optional but Recommended)

#### 2a. Install Monitoring Stack (Optional)

```bash
# Install Prometheus + Grafana + Alertmanager
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --wait \
  --timeout 10m

# Verify installation
kubectl get pods -n monitoring

# Access Grafana (default: admin/prom-operator)
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80
# Open: http://localhost:3000
```

#### 2b. Install Ingress Controller (Optional)

```bash
# Install ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --wait \
  --timeout 5m

# Verify installation
kubectl get pods -n ingress-nginx

# Check ingress class
kubectl get ingressclass
```

#### 2c. Install Cert-Manager (Optional)

```bash
# Install cert-manager with CRDs
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true \
  --wait \
  --timeout 5m

# Verify installation
kubectl get pods -n cert-manager

# Verify CRDs
kubectl get crd | grep cert-manager
```

#### 2d. Install External Secrets Operator (Optional for Production)

```bash
# Install External Secrets Operator
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace \
  --wait \
  --timeout 5m

# Verify installation
kubectl get pods -n external-secrets-system
```

### Step 3: Install CloudNativePG Operator (Required)

```bash
# Install CloudNativePG operator
helm install cloudnative-pg cloudnative-pg/cloudnative-pg \
  --namespace cnpg-system \
  --create-namespace \
  --wait \
  --timeout 5m

# Verify installation
kubectl get pods -n cnpg-system

# Verify CRDs
kubectl get crd | grep cnpg

# Check operator is ready
kubectl wait --for=condition=available --timeout=120s \
  deployment/cloudnative-pg -n cnpg-system
```

**Expected Output:**
```
NAME                             READY   STATUS    RESTARTS   AGE
cloudnative-pg-xxxxx-xxxxx       1/1     Running   0          30s
```

### Step 4: Deploy SvelteHR Application

#### Option A: Using Deploy Script (Recommended)

```bash
# Navigate to k8s directory
cd /home/chanway/SvelteHR/k8s

# Deploy to development
./deploy.sh dev deploy

# Expected output:
# - Dependencies updated
# - Operator installed
# - Application deployed
# - Access information shown
```

#### Option B: Manual Helm Installation

```bash
# Navigate to Helm chart
cd /home/chanway/SvelteHR/k8s/helm-charts/sveltehr

# Update dependencies
helm dependency update

# Verify dependencies downloaded
ls -la charts/

# Install to development
helm install sveltehr . \
  -f values-dev.yaml \
  -n sveltehr-dev \
  --create-namespace \
  --wait \
  --timeout 10m \
  --debug

# Or install to production
helm install sveltehr . \
  -f values.yaml \
  -f values-prod.yaml \
  -n sveltehr-prod \
  --create-namespace \
  --wait \
  --timeout 10m \
  --debug
```

### Step 5: Verify Application Deployment

```bash
# Check Helm release
helm list -n sveltehr-dev

# Check all resources
kubectl get all -n sveltehr-dev

# Check PostgreSQL cluster
kubectl get cluster -n sveltehr-dev

# Check pods status
kubectl get pods -n sveltehr-dev

# Check migration job (should be completed)
kubectl get jobs -n sveltehr-dev -l helm.sh/hook=pre-install

# View migration logs
kubectl logs job/sveltehr-migration -n sveltehr-dev

# Check backend logs
kubectl logs -f deployment/sveltehr-backend -n sveltehr-dev

# Check frontend logs
kubectl logs -f deployment/sveltehr-frontend -n sveltehr-dev
```

**Expected Pods:**
```
NAME                                 READY   STATUS      RESTARTS   AGE
sveltehr-backend-xxxxx-xxxxx         1/1     Running     0          2m
sveltehr-frontend-xxxxx-xxxxx        1/1     Running     0          2m
sveltehr-migration-xxxxx             0/1     Completed   0          3m
sveltehr-postgres-1                  1/1     Running     0          3m
sveltehr-redis-master-0              1/1     Running     0          3m
```

### Step 6: Access Application

```bash
# Port-forward frontend (development)
kubectl port-forward -n sveltehr-dev svc/sveltehr-frontend 5173:5173

# Open browser
# http://localhost:5173

# Port-forward backend (for GraphQL playground)
kubectl port-forward -n sveltehr-dev svc/sveltehr-backend 4000:4000

# Open browser
# http://localhost:4000
```

### Step 7: Run Seed Job (Optional)

```bash
# Run seed job manually (creates initial admin user)
helm test sveltehr -n sveltehr-dev --filter name=seed

# Check seed job status
kubectl get jobs -n sveltehr-dev | grep seed

# View seed logs
kubectl logs job/sveltehr-seed -n sveltehr-dev

# Clean up seed job after completion
kubectl delete job sveltehr-seed -n sveltehr-dev
```

---

## 🔧 Complete Teardown and Reinitialize Script

### All-in-One Teardown Script

Create this script: `k8s/scripts/complete-teardown.sh`

```bash
#!/bin/bash
set -e

echo "🗑️  Complete System Teardown"
echo "=============================="
echo ""

# Confirm with user
read -p "⚠️  This will DELETE EVERYTHING. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

# Remove applications
echo "1. Removing applications..."
helm uninstall sveltehr -n sveltehr-dev 2>/dev/null || true
helm uninstall sveltehr -n sveltehr-prod 2>/dev/null || true

# Delete namespaces
echo "2. Deleting namespaces..."
kubectl delete namespace sveltehr-dev --ignore-not-found=true
kubectl delete namespace sveltehr-prod --ignore-not-found=true

# Remove operators
echo "3. Removing operators..."
helm uninstall cloudnative-pg -n cnpg-system 2>/dev/null || true
kubectl delete namespace cnpg-system --ignore-not-found=true

# Optional: Remove infrastructure
read -p "Remove infrastructure (monitoring, ingress, cert-manager)? (yes/no): " remove_infra
if [ "$remove_infra" = "yes" ]; then
  echo "4. Removing infrastructure..."
  helm uninstall kube-prometheus-stack -n monitoring 2>/dev/null || true
  kubectl delete namespace monitoring --ignore-not-found=true

  helm uninstall ingress-nginx -n ingress-nginx 2>/dev/null || true
  kubectl delete namespace ingress-nginx --ignore-not-found=true

  helm uninstall cert-manager -n cert-manager 2>/dev/null || true
  kubectl delete namespace cert-manager --ignore-not-found=true
fi

# Clean up PVs
echo "5. Cleaning up persistent volumes..."
kubectl get pv | grep Released | awk '{print $1}' | xargs -r kubectl delete pv

echo ""
echo "✅ Teardown complete!"
echo ""
echo "To reinitialize, run:"
echo "  ./deploy.sh dev deploy"
```

### All-in-One Initialize Script

Create this script: `k8s/scripts/complete-initialize.sh`

```bash
#!/bin/bash
set -e

echo "🚀 Complete System Initialization"
echo "=================================="
echo ""

# Add Helm repos
echo "1. Adding Helm repositories..."
helm repo add cloudnative-pg https://cloudnative-pg.github.io/charts 2>/dev/null || true
helm repo add bitnami https://charts.bitnami.com/bitnami 2>/dev/null || true
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts 2>/dev/null || true
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx 2>/dev/null || true
helm repo add jetstack https://charts.jetstack.io 2>/dev/null || true
helm repo update

# Install infrastructure (optional)
read -p "Install infrastructure (monitoring, ingress, cert-manager)? (yes/no): " install_infra
if [ "$install_infra" = "yes" ]; then
  echo "2. Installing infrastructure..."

  helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
    --namespace monitoring \
    --create-namespace \
    --wait --timeout 10m || true

  helm install ingress-nginx ingress-nginx/ingress-nginx \
    --namespace ingress-nginx \
    --create-namespace \
    --wait --timeout 5m || true

  helm install cert-manager jetstack/cert-manager \
    --namespace cert-manager \
    --create-namespace \
    --set installCRDs=true \
    --wait --timeout 5m || true
fi

# Install CloudNativePG operator
echo "3. Installing CloudNativePG operator..."
helm install cloudnative-pg cloudnative-pg/cloudnative-pg \
  --namespace cnpg-system \
  --create-namespace \
  --wait --timeout 5m

# Deploy application
echo "4. Deploying SvelteHR application..."
cd "$(dirname "$0")/.."
./deploy.sh dev deploy

echo ""
echo "✅ Initialization complete!"
echo ""
echo "Access application:"
echo "  kubectl port-forward -n sveltehr-dev svc/sveltehr-frontend 5173:5173"
echo "  Open: http://localhost:5173"
```

---

## 🎯 Quick Reference Commands

### Check System Status

```bash
# All Helm releases
helm list --all-namespaces

# All namespaces
kubectl get namespaces

# All pods
kubectl get pods --all-namespaces | grep -E "sveltehr|cnpg|monitoring|ingress"

# All PVs
kubectl get pv

# Storage usage
kubectl get pvc --all-namespaces
```

### Emergency Stop (Quick)

```bash
# Stop just the application (keep data)
kubectl scale deployment sveltehr-backend -n sveltehr-dev --replicas=0
kubectl scale deployment sveltehr-frontend -n sveltehr-dev --replicas=0

# Restart application
kubectl scale deployment sveltehr-backend -n sveltehr-dev --replicas=1
kubectl scale deployment sveltehr-frontend -n sveltehr-dev --replicas=1
```

### Data Backup Before Teardown

```bash
# Backup PostgreSQL data
kubectl exec -n sveltehr-dev sveltehr-postgres-1 -- \
  pg_dump -U hr_user hr_system > backup-$(date +%Y%m%d).sql

# Backup Redis data (if persistence enabled)
kubectl exec -n sveltehr-dev sveltehr-redis-master-0 -- \
  redis-cli SAVE

# Copy backup
kubectl cp sveltehr-dev/sveltehr-redis-master-0:/data/dump.rdb \
  redis-backup-$(date +%Y%m%d).rdb
```

---

## 🐛 Troubleshooting

### Namespace Stuck in "Terminating"

```bash
# Force delete namespace
kubectl get namespace sveltehr-dev -o json \
  | jq '.spec = {"finalizers":[]}' \
  | kubectl replace --raw /api/v1/namespaces/sveltehr-dev/finalize -f -
```

### PV Stuck in "Released"

```bash
# Remove claimRef to make it Available again
kubectl patch pv <pv-name> -p '{"spec":{"claimRef": null}}'

# Or delete it
kubectl delete pv <pv-name>
```

### CRDs Not Deleting

```bash
# Force delete CRD
kubectl patch crd <crd-name> -p '{"metadata":{"finalizers":[]}}' --type=merge
kubectl delete crd <crd-name>
```

### Helm Release Stuck

```bash
# Force delete Helm release
helm uninstall sveltehr -n sveltehr-dev --no-hooks

# Delete Helm secrets manually
kubectl delete secrets -n sveltehr-dev -l owner=helm
```

---

## 📋 Checklist

### Teardown Checklist
- [ ] Backup data if needed
- [ ] Uninstall Helm releases
- [ ] Delete application namespaces
- [ ] Remove operators
- [ ] Remove infrastructure (optional)
- [ ] Clean up PVs
- [ ] Verify all resources gone

### Initialization Checklist
- [ ] Cluster is accessible
- [ ] Helm repos added
- [ ] Infrastructure installed (optional)
- [ ] CloudNativePG operator installed
- [ ] Application deployed
- [ ] Pods are running
- [ ] Migration completed
- [ ] Application accessible
- [ ] Seed data loaded (optional)

---

## 🎉 Summary

**Teardown Order:**
1. Applications (Helm uninstall)
2. Namespaces (kubectl delete)
3. Operators (Helm uninstall)
4. Infrastructure (Helm uninstall - optional)
5. PVs (kubectl delete)

**Initialization Order:**
1. Helm repos (helm repo add)
2. Infrastructure (Helm install - optional)
3. Operators (Helm install)
4. Application (Helm install or ./deploy.sh)
5. Verify (kubectl get pods)

**Time Estimates:**
- Teardown: 5-10 minutes
- Initialization: 10-15 minutes
- Total cycle: 15-25 minutes
