# Kernel Module Issue Workaround

## Problem

Your Arch Linux kernel (6.17.3-arch2-1) is missing the `xt_comment` iptables module that Kubernetes CNI networking requires. This prevents the ingress controller from starting.

## Solution: Deploy Without Ingress

You can still deploy and use SvelteHR locally by skipping the ingress controller and using port-forwarding instead.

### Modified Deployment Steps

#### 1. Keep Current Minikube Cluster

```bash
# Your cluster is already running, just skip ingress
kubectl get nodes  # Should show minikube ready
```

#### 2. Build Images

```bash
./k8s/scripts/build-images.sh
```

#### 3. Install Operators (Skip Ingress Install)

```bash
# Manually install just the operators we need
kubectl apply -f k8s/base/namespaces.yaml

# Install CloudNativePG (PostgreSQL)
kubectl apply -f https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.22/releases/cnpg-1.22.1.yaml

# Wait for CNPG CRD
kubectl wait --for condition=established --timeout=120s crd/clusters.postgresql.cnpg.io

# Install Redis operator
kubectl apply -f https://raw.githubusercontent.com/spotahome/redis-operator/master/example/operator/all-redis-operator-resources.yaml

# Wait for Redis CRD
kubectl wait --for condition=established --timeout=120s crd/redisclusters.databases.spotahome.com
```

#### 4. Create Secrets

```bash
./k8s/scripts/create-secrets.sh dev
```

#### 5. Deploy Application (Without Ingress)

```bash
# Apply everything except ingress
kubectl apply -k k8s/overlays/development

# Wait for postgres
kubectl wait --for=condition=ready --timeout=600s cluster/sveltehr-postgres -n sveltehr-dev

# Wait for deployments
kubectl wait --for=condition=available --timeout=300s deployment/sveltehr-backend -n sveltehr-dev
kubectl wait --for=condition=available --timeout=300s deployment/sveltehr-frontend -n sveltehr-dev
```

#### 6. Access Application via Port-Forward

**Option A: Frontend Access**

```bash
kubectl port-forward -n sveltehr-dev svc/sveltehr-frontend 3000:3000
```

Then open: http://localhost:3000

**Option B: Backend GraphQL API**

```bash
kubectl port-forward -n sveltehr-dev svc/sveltehr-backend 4000:4000
```

Then access GraphQL at: http://localhost:4000/graphql

**Option C: Both (in separate terminals)**

```bash
# Terminal 1
kubectl port-forward -n sveltehr-dev svc/sveltehr-frontend 3000:3000

# Terminal 2
kubectl port-forward -n sveltehr-dev svc/sveltehr-backend 4000:4000
```

### Verification Commands

```bash
# Check all pods are running
kubectl get pods -n sveltehr-dev

# Check services
kubectl get svc -n sveltehr-dev

# Check postgres cluster
kubectl get cluster -n sveltehr-dev

# View logs
kubectl logs -f deployment/sveltehr-frontend -n sveltehr-dev
kubectl logs -f deployment/sveltehr-backend -n sveltehr-dev
```

## Long-Term Solutions

### Option 1: Update Kernel

Install a kernel that includes the `xt_comment` module:

```bash
# Install linux kernel with more modules
sudo pacman -S linux linux-headers

# Reboot
sudo reboot
```

### Option 2: Use K3s Instead

K3s has fewer kernel requirements and works on more systems:

```bash
# Install K3s (lightweight Kubernetes)
curl -sfL https://get.k3s.io | sh -

# K3s includes built-in ingress (Traefik)
# No iptables xt_comment module needed
```

### Option 3: Use Docker Compose

For local development, Docker Compose might be simpler:

```bash
# Use the existing docker-compose.yml
docker-compose -f dev-containers/docker-compose.dev.yml up
```

## Why This Happens

The `xt_comment` module is part of the netfilter iptables extensions. Some minimal or custom kernels don't include it. Kubernetes CNI (Container Network Interface) uses iptables with comment rules to track which pods own which network rules.

Your kernel configuration doesn't have:

```
CONFIG_NETFILTER_XT_MATCH_COMMENT=m
```

## Current Status

✅ Minikube cluster running
✅ DNS fixed (using 8.8.8.8)
✅ Core Kubernetes components working
✅ Can deploy applications
✅ Port-forwarding works
❌ Ingress controller blocked by kernel module

## Recommendation

**For local development: Use port-forwarding** (works perfectly)
**For production: Deploy to a cloud provider** (their kernels include all modules)
