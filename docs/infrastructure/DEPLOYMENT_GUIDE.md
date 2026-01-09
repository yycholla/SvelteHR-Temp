# SvelteHR Kubernetes Deployment Guide

## What Was Fixed

### Critical Issues Resolved

1. **Missing ServiceAccount Resources** ✅
   - Created `k8s/base/serviceaccounts.yaml` with proper service accounts
   - Created `k8s/base/rbac.yaml` with minimal RBAC permissions
   - Added both to base kustomization

2. **Container Image Configuration** ✅
   - Fixed kustomization to use local image names (`sveltehr-frontend:latest`, `sveltehr-backend:latest`)
   - Created `k8s/scripts/build-images.sh` to build images in minikube's Docker environment

3. **ReadOnlyRootFilesystem Issues** ✅
   - Removed `readOnlyRootFilesystem: true` from both deployments
   - Added tmpfs volumes for `/tmp` and cache directories
   - Prevents container crashes from write operations

4. **PostgreSQL Secret Structure** ✅
   - Fixed postgres-cluster.yaml to use CloudNativePG-compatible secrets
   - Created `k8s/scripts/create-secrets.sh` with proper secret structure
   - Secrets now have correct keys: `username`, `password`, `database`

5. **Ingress Controller Conflict** ✅
   - Removed external NGINX ingress installation from deploy.sh
   - Now uses minikube's built-in ingress addon (enabled by setup-cluster.sh)
   - Fixed namespace references

6. **Kustomize Deprecated Syntax** ✅
   - Changed `bases:` to `resources:` in both development and production overlays
   - Updated to kustomize v1beta1 compatible syntax

7. **Operator Installation Improvements** ✅
   - Added proper CRD waits with `kubectl wait --for condition=established`
   - Improved error handling with fallback warnings
   - Better timing to prevent race conditions

## New Files Created

```
k8s/
├── base/
│   ├── serviceaccounts.yaml   # NEW: Service account definitions
│   └── rbac.yaml               # NEW: RBAC roles and bindings
├── scripts/                    # NEW: Helper scripts directory
│   ├── build-images.sh         # NEW: Build images for minikube
│   └── create-secrets.sh       # NEW: Create properly structured secrets
└── DEPLOYMENT_GUIDE.md         # NEW: This file
```

## Deployment Workflow

### Prerequisites

- Docker installed and running
- minikube installed
- kubectl installed
- At least 4GB RAM allocated to minikube

### Step 1: Setup Minikube Cluster

```bash
cd /home/yycholla/Documents/SvelteHR

# Start minikube and enable required addons
./k8s/setup-cluster.sh
```

This script will:

- Start minikube with 2 CPUs, 4GB RAM, 20GB disk
- Enable ingress addon
- Enable metrics-server addon
- Verify cluster is ready

### Step 2: Build Container Images

```bash
# Build images in minikube's Docker environment
./k8s/scripts/build-images.sh
```

This script will:

- Configure Docker to use minikube's Docker daemon
- Build frontend image: `sveltehr-frontend:latest`
- Build backend image: `sveltehr-backend:latest`
- Verify images are available

**Important:** Images are built inside minikube, so they're immediately available to Kubernetes without pushing to a registry.

### Step 3: Install Operators

```bash
# Install cert-manager, PostgreSQL, and Redis operators
./k8s/deploy.sh dev install
```

This will:

- Create namespaces (sveltehr-dev, sveltehr-prod, sveltehr-system)
- Install cert-manager
- Install CloudNativePG operator (PostgreSQL)
- Install Spotahome Redis operator
- Wait for CRDs to be ready

### Step 4: Deploy Application

```bash
# Deploy SvelteHR to development environment
./k8s/deploy.sh dev deploy
```

This will:

- Create secrets with proper structure
- Apply kustomize configuration
- Wait for PostgreSQL cluster to be ready
- Wait for Redis cluster to be ready
- Wait for backend deployment
- Wait for frontend deployment
- Show access information

### Step 5: Access Application

After successful deployment, you have three options:

#### Option 1: Minikube Tunnel (Recommended)

```bash
# Run in a separate terminal (requires sudo)
minikube tunnel
```

Then access at: http://localhost

#### Option 2: Port Forward Ingress

```bash
kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 8080:80
```

Then access at: http://localhost:8080

#### Option 3: Direct Service Access

```bash
# Backend GraphQL API
kubectl port-forward -n sveltehr-dev svc/sveltehr-backend 4000:4000

# Frontend
kubectl port-forward -n sveltehr-dev svc/sveltehr-frontend 3000:3000
```

## Verification Commands

### Check Pod Status

```bash
kubectl get pods -n sveltehr-dev
```

Expected output:

```
NAME                                 READY   STATUS    RESTARTS   AGE
sveltehr-backend-xxx                 1/1     Running   0          2m
sveltehr-frontend-xxx                1/1     Running   0          2m
sveltehr-postgres-1                  1/1     Running   0          3m
sveltehr-redis-xxx                   1/1     Running   0          3m
```

### Check Ingress

```bash
kubectl get ingress -n sveltehr-dev
```

### View Logs

```bash
# Backend logs
kubectl logs -f deployment/sveltehr-backend -n sveltehr-dev

# Frontend logs
kubectl logs -f deployment/sveltehr-frontend -n sveltehr-dev
```

### Check Database Cluster

```bash
kubectl get cluster -n sveltehr-dev
```

### Check Redis Cluster

```bash
kubectl get rediscluster -n sveltehr-dev
```

## Troubleshooting

### Issue: Pods stuck in "ImagePullBackOff"

**Solution:** Rebuild images using `./k8s/scripts/build-images.sh`

```bash
# Make sure you're using minikube's Docker daemon
eval $(minikube docker-env)

# Rebuild images
./k8s/scripts/build-images.sh

# Delete pods to force recreation
kubectl delete pods -n sveltehr-dev -l app=sveltehr-backend
kubectl delete pods -n sveltehr-dev -l app=sveltehr-frontend
```

### Issue: PostgreSQL cluster not starting

**Solution:** Check secrets structure

```bash
# Verify secrets exist
kubectl get secrets -n sveltehr-dev

# Check secret keys
kubectl get secret sveltehr-postgres-app-secret -n sveltehr-dev -o yaml
kubectl get secret sveltehr-postgres-superuser-secret -n sveltehr-dev -o yaml

# Recreate secrets if needed
kubectl delete secret sveltehr-postgres-app-secret -n sveltehr-dev
kubectl delete secret sveltehr-postgres-superuser-secret -n sveltehr-dev
./k8s/scripts/create-secrets.sh dev
```

### Issue: "CrashLoopBackOff" for backend or frontend

**Solution:** Check logs for specific errors

```bash
# Check backend logs
kubectl logs deployment/sveltehr-backend -n sveltehr-dev

# Check frontend logs
kubectl logs deployment/sveltehr-frontend -n sveltehr-dev

# Common causes:
# 1. Database not ready - wait for postgres cluster
# 2. Environment variables missing - check configmap
# 3. Connection refused - check service names
```

### Issue: Ingress not working

**Solution:** Verify ingress controller

```bash
# Check ingress controller is running
kubectl get pods -n ingress-nginx

# Check ingress resource
kubectl describe ingress sveltehr-ingress -n sveltehr-dev

# For minikube, ensure tunnel is running
minikube tunnel
```

### Issue: Operator CRDs not ready

**Solution:** Wait for operators to be fully installed

```bash
# Check operator pods
kubectl get pods -n cnpg-system
kubectl get pods -n operators

# Wait for CRDs to be established
kubectl wait --for condition=established --timeout=120s crd/clusters.postgresql.cnpg.io
kubectl wait --for condition=established --timeout=120s crd/redisclusters.databases.spotahome.com

# If still failing, reinstall operators
./k8s/deploy.sh dev install
```

## Cleanup

### Remove Application Only

```bash
./k8s/deploy.sh dev cleanup
```

This removes the application but preserves operators and system components.

### Remove Everything

```bash
# Delete the entire cluster
minikube delete
```

## Production Deployment Notes

For production deployment:

1. **Build and Push Images to Registry**
   - Don't use local minikube images
   - Push to a real container registry (Docker Hub, GitLab, etc.)
   - Update kustomization images with registry URLs

2. **Use External Secret Management**
   - AWS Secrets Manager
   - HashiCorp Vault
   - Kubernetes External Secrets Operator

3. **Configure Storage Classes**
   - Replace `storageClass: standard` with production-grade storage
   - Configure backup storage for PostgreSQL

4. **Set Up Proper Ingress**
   - Configure real domain names
   - Enable TLS with cert-manager
   - Set up proper ingress controller (not minikube addon)

5. **Adjust Resource Limits**
   - Review and adjust CPU/memory limits for production load
   - Configure horizontal pod autoscaling

6. **Enable Monitoring**
   - Deploy Prometheus and Grafana
   - Configure alerting
   - Set up log aggregation

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│              Minikube Cluster                   │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │         Ingress Controller                 │ │
│  │         (minikube addon)                   │ │
│  └─────────────┬─────────────────────────────┘ │
│                │                                 │
│                ├─────────► Frontend Service      │
│                │            └─► Frontend Pod     │
│                │                                 │
│                └─────────► Backend Service       │
│                             └─► Backend Pod      │
│                                  │               │
│                ┌─────────────────┼───────┐       │
│                │                 │       │       │
│                ▼                 ▼       ▼       │
│         PostgreSQL          Redis   ConfigMap   │
│         (3-node HA)         Cluster  Secrets    │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Summary of Changes

- ✅ All critical deployment blockers fixed
- ✅ Proper secret structure for CloudNativePG
- ✅ Local image build workflow for minikube
- ✅ Ingress controller conflict resolved
- ✅ RBAC resources created
- ✅ Improved operator installation with proper waits
- ✅ Updated to modern kustomize syntax
- ✅ Fixed container filesystem permissions

Your minikube deployment should now work correctly! 🎉
