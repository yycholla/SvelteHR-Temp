# Quick Start - SvelteHR on Minikube (Arch Linux)

## Current Status

✅ Minikube cluster is running
✅ DNS is configured (8.8.8.8, 1.1.1.1)
✅ Metrics-server addon enabled
⚠️ Ingress addon unavailable (kernel module issue - see KERNEL_ISSUE_WORKAROUND.md)

## Deploy Now (3 Steps)

### Step 1: Build Images

```bash
cd /home/yycholla/Documents/SvelteHR

# Build images in minikube's Docker environment
./k8s/scripts/build-images.sh
```

### Step 2: Install Operators & Deploy

```bash
# Install PostgreSQL and Redis operators
./k8s/deploy.sh dev install

# Deploy the application
./k8s/deploy.sh dev deploy
```

### Step 3: Access Application

Since ingress isn't available, use port-forwarding:

```bash
# Option A: Frontend only (most common)
kubectl port-forward -n sveltehr-dev svc/sveltehr-frontend 3000:3000
# Open http://localhost:3000

# Option B: Backend API only
kubectl port-forward -n sveltehr-dev svc/sveltehr-backend 4000:4000
# Open http://localhost:4000/graphql

# Option C: Both (run in separate terminals)
# Terminal 1:
kubectl port-forward -n sveltehr-dev svc/sveltehr-frontend 3000:3000

# Terminal 2:
kubectl port-forward -n sveltehr-dev svc/sveltehr-backend 4000:4000
```

## Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n sveltehr-dev

# Should show:
# sveltehr-backend-xxx     1/1     Running
# sveltehr-frontend-xxx    1/1     Running
# sveltehr-postgres-1      1/1     Running
# sveltehr-redis-xxx       1/1     Running

# Check services
kubectl get svc -n sveltehr-dev

# View logs
kubectl logs -f deployment/sveltehr-backend -n sveltehr-dev
kubectl logs -f deployment/sveltehr-frontend -n sveltehr-dev
```

## Common Issues

### Issue: Pods stuck in Pending

**Solution:** Check if images are built

```bash
eval $(minikube docker-env)
docker images | grep sveltehr
```

### Issue: PostgreSQL cluster not ready

**Solution:** Check cluster status

```bash
kubectl get cluster -n sveltehr-dev
kubectl describe cluster sveltehr-postgres -n sveltehr-dev
```

### Issue: Backend CrashLoopBackOff

**Solution:** Check if database is ready first

```bash
kubectl wait --for=condition=ready --timeout=600s cluster/sveltehr-postgres -n sveltehr-dev
```

### Issue: Port-forward connection refused

**Solution:** Ensure pods are running first

```bash
kubectl get pods -n sveltehr-dev
kubectl logs deployment/sveltehr-frontend -n sveltehr-dev
```

## Cleanup

```bash
# Remove application
./k8s/deploy.sh dev cleanup

# Or delete entire cluster
minikube delete
```

## About the Ingress Issue

Your Arch Linux kernel (6.17.3-arch2-1) is missing the `xt_comment` iptables module that Kubernetes networking requires. This prevents the ingress controller from working.

**Solutions:**

1. **Use port-forwarding** (works great for local dev) ✅
2. **Install linux kernel**: `sudo pacman -S linux && sudo reboot`
3. **Use K3s instead**: Lighter weight, fewer kernel requirements
4. **Deploy to cloud**: Their VMs have complete kernels

For local development, port-forwarding is actually more convenient than ingress!

## Next Steps

1. Follow the 3 steps above to deploy
2. Access via port-forward on http://localhost:3000
3. Develop and test your application
4. When ready for production, deploy to a cloud provider

## Useful Commands

```bash
# Get minikube status
minikube status

# SSH into minikube
minikube ssh

# View cluster resources
kubectl get all -n sveltehr-dev

# Delete and recreate deployment
kubectl delete deployment sveltehr-frontend -n sveltehr-dev
kubectl apply -k k8s/overlays/development

# Restart a deployment
kubectl rollout restart deployment/sveltehr-frontend -n sveltehr-dev

# Get pod logs (last 100 lines)
kubectl logs --tail=100 deployment/sveltehr-backend -n sveltehr-dev

# Execute command in pod
kubectl exec -it deployment/sveltehr-frontend -n sveltehr-dev -- sh

# Port forward PostgreSQL for debugging
kubectl port-forward -n sveltehr-dev svc/sveltehr-postgres-rw 5432:5432
# Connect with: psql -h localhost -U hr_user -d hr_system
```
