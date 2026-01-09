# Kubernetes Production Deployment via Backup Restore

**Version**: 1.0.0
**Date**: 2025-11-10
**Method**: Backup-First Deployment (Fastest Production Setup)
**Total Time**: ~1 hour 30 minutes

---

## Overview

This guide provides a **streamlined deployment approach** using existing Velero backups. Instead of deploying all applications via ArgoCD and then restoring data, we set up minimal infrastructure and restore everything from backup.

### When to Use This Method

✅ **Use backup-first deployment when**:

- You have recent Velero backups available
- Setting up a new production server to replace existing one
- Performing disaster recovery after complete server failure
- Migrating cluster to new hardware

❌ **Don't use backup-first when**:

- No backups exist yet (use full deployment guide)
- Backups are older than 7 days (data may be stale)
- Major Kubernetes version upgrade (incompatibility risk)

### Time Comparison

| Method           | Total Time   | When to Use                  |
| ---------------- | ------------ | ---------------------------- |
| **Backup-First** | **1h 30min** | Existing backups available   |
| Full Deployment  | 2h 40min     | First-time setup, no backups |

---

## Prerequisites

### Required Access & Credentials

- [ ] **Root/sudo access** to production server
- [ ] **Doppler service token**: `dp.st.prod.xxxxx`
- [ ] **Tailscale OAuth credentials** (Client ID + Secret)
- [ ] **GitHub Container Registry PAT** (for image pulls)
- [ ] **Access to existing MinIO backup storage** (S3 endpoint + credentials)

### Backup Information Needed

```bash
# You need to know:
MINIO_ENDPOINT="http://OLD_SERVER_IP:9000"  # or permanent MinIO URL
MINIO_ACCESS_KEY="your-minio-access-key"
MINIO_SECRET_KEY="your-minio-secret-key"
VELERO_BUCKET="velero"  # Default bucket name

# These should be available from your existing cluster or Doppler
```

### Server Requirements

Same as full deployment:

- 4+ CPU cores (8 recommended)
- 16+ GB RAM (32 GB recommended)
- 100+ GB SSD (250 GB recommended)
- Ubuntu 22.04 LTS or similar
- Static IP with DNS configured

---

## Quick Start: 3-Phase Backup Restore

### Phase 1: Base Infrastructure (45 minutes)

Install Kubernetes, ArgoCD, and minimal infrastructure needed for Velero.

### Phase 2: Restore from Backup (30 minutes)

Deploy Velero and restore all applications and data from backup.

### Phase 3: Verification & Cleanup (15 minutes)

Verify restored resources and configure ArgoCD for future GitOps.

---

## Phase 1: Base Infrastructure Setup

**Estimated Time**: 45 minutes

### Step 1.1: System Preparation (10 minutes)

```bash
# SSH into new production server
ssh root@hr.example.com

# Update system
apt update && apt upgrade -y

# Install essential tools
apt install -y curl wget git vim htop jq

# Disable swap (required for Kubernetes)
swapoff -a
sed -i '/ swap / s/^/#/' /etc/fstab

# Enable kernel modules
cat <<'EOF' | tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

modprobe overlay
modprobe br_netfilter

# Configure sysctl
cat <<'EOF' | tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

sysctl --system

# Install containerd
apt install -y containerd
mkdir -p /etc/containerd
containerd config default | tee /etc/containerd/config.toml
sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
systemctl restart containerd
systemctl enable containerd
```

### Step 1.2: Install Kubernetes (15 minutes)

```bash
# Add Kubernetes repository
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.30/deb/Release.key | \
  gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.30/deb/ /' | \
  tee /etc/apt/sources.list.d/kubernetes.list

# Install Kubernetes
apt update
apt install -y kubelet kubeadm kubectl
apt-mark hold kubelet kubeadm kubectl
systemctl enable kubelet

# Initialize cluster
kubeadm init \
  --pod-network-cidr=10.244.0.0/16 \
  --service-cidr=10.96.0.0/12 \
  --apiserver-advertise-address=$(hostname -I | awk '{print $1}')

# Configure kubectl
mkdir -p $HOME/.kube
cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
chown $(id -u):$(id -g) $HOME/.kube/config

# Install Flannel CNI
kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml

# Wait for CNI to be ready
kubectl wait --for=condition=ready pod -l app=flannel -n kube-flannel --timeout=300s

# Allow control plane to schedule workloads
kubectl taint nodes --all node-role.kubernetes.io/control-plane-

# Verify cluster is ready
kubectl get nodes  # Should show Ready
```

### Step 1.3: Install Helm (2 minutes)

```bash
# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Add required Helm repositories (only what we need for restore)
helm repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts
helm repo add minio https://charts.min.io/
helm repo update
```

### Step 1.4: Create Critical Namespaces (1 minute)

```bash
# Create namespaces that Velero restore will use
kubectl create namespace backup-system
kubectl create namespace sveltehr-prod
kubectl create namespace sveltehr-dev

# Note: Other namespaces will be created automatically by Velero restore
```

### Step 1.5: Deploy MinIO for Backup Access (10 minutes)

**CRITICAL**: MinIO must be deployed first so Velero can access existing backups.

```bash
# Clone repository for Helm values
git clone https://github.com/Mountain-Care-Rx/SvelteHR.git /root/SvelteHR
cd /root/SvelteHR

# Install MinIO using existing Helm chart
helm install minio minio/minio \
  --namespace backup-system \
  --values k8s/helm-values/minio-values.yaml \
  --wait \
  --timeout 10m

# Wait for MinIO to be ready
kubectl wait --for=condition=ready pod -l app=minio -n backup-system --timeout=300s

# Get MinIO endpoint (for Velero configuration)
kubectl get svc -n backup-system minio
# Note: MinIO will be accessible at http://minio.backup-system.svc.cluster.local:9000
```

### Step 1.6: Configure MinIO with Existing Backup Data (5 minutes)

**Option A: MinIO Already Has Data (Persistent Volume from Old Server)**

If you're using the same storage or migrated the PVC:

```bash
# Verify MinIO can see existing buckets
kubectl exec -n backup-system deployment/minio -- mc ls minio/

# You should see: velero/
# If you see the velero bucket, skip to Step 1.7
```

**Option B: MinIO Needs to Access External Backup Storage**

If backups are on a different MinIO instance or S3:

```bash
# Configure MinIO to replicate from old backup location
kubectl exec -n backup-system deployment/minio -- \
  mc alias set old-minio http://OLD_MINIO_IP:9000 OLD_ACCESS_KEY OLD_SECRET_KEY

# Mirror backups from old location to new MinIO
kubectl exec -n backup-system deployment/minio -- \
  mc mirror --watch old-minio/velero minio/velero

# Verify backups were copied
kubectl exec -n backup-system deployment/minio -- mc ls minio/velero/backups/
```

**Option C: Mount Existing MinIO PVC from Old Cluster**

If you have access to the PVC data from the old cluster:

```bash
# Copy PVC data to new cluster storage location
# (Method depends on your storage backend - NFS, local-path, etc.)

# Example for local-path storage:
# 1. Find old PVC data location (typically /var/lib/rancher/k3s/storage or /var/local-path-provisioner)
# 2. Copy to new cluster storage location
# 3. MinIO will automatically use the existing data
```

### Step 1.7: Create Velero Credentials Secret (2 minutes)

```bash
# Create Velero credentials for MinIO access
# These credentials must match your MinIO configuration

cat <<EOF > /tmp/velero-credentials
[default]
aws_access_key_id=$(kubectl get secret -n backup-system minio -o jsonpath='{.data.accesskey}' | base64 -d)
aws_secret_access_key=$(kubectl get secret -n backup-system minio -o jsonpath='{.data.secretkey}' | base64 -d)
EOF

# Create Kubernetes secret from credentials file
kubectl create secret generic velero-credentials \
  --from-file=cloud=/tmp/velero-credentials \
  --namespace backup-system

# Remove credentials file
rm /tmp/velero-credentials

# Verify secret created
kubectl get secret velero-credentials -n backup-system
```

---

## Phase 2: Restore from Backup

**Estimated Time**: 30 minutes

### Step 2.1: Install Velero (5 minutes)

```bash
cd /root/SvelteHR

# Install Velero using Helm
helm install velero vmware-tanzu/velero \
  --namespace backup-system \
  --values k8s/helm-values/velero-values.yaml \
  --wait \
  --timeout 10m

# Wait for Velero to be ready
kubectl wait --for=condition=available deployment/velero -n backup-system --timeout=300s

# Install Velero CLI
wget https://github.com/vmware-tanzu/velero/releases/latest/download/velero-linux-amd64.tar.gz
tar -xvf velero-linux-amd64.tar.gz
mv velero-linux-amd64/velero /usr/local/bin/
rm -rf velero-linux-amd64*

# Verify Velero can access MinIO
velero backup-location get

# Expected output:
# NAME      PROVIDER   BUCKET/PREFIX   PHASE       LAST VALIDATED   ...
# default   aws        velero          Available   <recent-time>    ...
```

### Step 2.2: List Available Backups (2 minutes)

```bash
# List all backups in MinIO
velero backup get

# Expected output (example):
# NAME                           STATUS      CREATED                         EXPIRES   STORAGE LOCATION   SELECTOR
# velero-daily-backup-20241110   Completed   2024-11-10 02:00:00 +0000 UTC   29d       default            <none>
# velero-weekly-metadata-...     Completed   2024-11-03 03:00:00 +0000 UTC   89d       default            <none>

# Choose the most recent daily backup
LATEST_BACKUP=$(velero backup get -o json | jq -r '.items | sort_by(.status.startTimestamp) | last | .metadata.name')
echo "Latest backup to restore: $LATEST_BACKUP"
```

### Step 2.3: Restore Entire Cluster from Backup (20 minutes)

```bash
# Restore from latest backup (FULL CLUSTER RESTORE)
velero restore create full-cluster-restore-$(date +%Y%m%d-%H%M%S) \
  --from-backup $LATEST_BACKUP \
  --wait

# Note: This will restore ALL namespaces and resources from the backup
# Restore time depends on backup size (typically 15-25 minutes)

# Monitor restore progress (in another terminal if needed)
watch -n 5 'velero restore get | tail -5'

# Once completed, check restore details
RESTORE_NAME=$(velero restore get -o json | jq -r '.items | sort_by(.status.startTimestamp) | last | .metadata.name')
velero restore describe $RESTORE_NAME
velero restore logs $RESTORE_NAME | tail -50
```

### Step 2.4: Verify Restored Resources (3 minutes)

```bash
# Check all namespaces were restored
kubectl get namespaces

# Expected namespaces (from backup):
# - sveltehr-prod
# - sveltehr-dev
# - monitoring
# - cnpg-system
# - traefik
# - cert-manager
# - tailscale
# - external-secrets-system
# - argocd (may already exist)

# Check pods in all namespaces
kubectl get pods --all-namespaces | grep -vE "kube-system|kube-public|backup-system"

# Check PostgreSQL clusters
kubectl get cluster -n sveltehr-prod
kubectl get cluster -n sveltehr-dev

# Check PVCs were restored
kubectl get pvc --all-namespaces | grep -vE "kube-system"
```

---

## Phase 3: Post-Restore Configuration

**Estimated Time**: 15 minutes

### Step 3.1: Apply Critical Secrets (5 minutes)

**IMPORTANT**: Some secrets may need to be recreated if they weren't in the backup or use node-specific values.

```bash
# Create Doppler token secret (CRITICAL for External Secrets)
kubectl create secret generic doppler-token-secret \
  --from-literal=dopplerToken="dp.st.prod.YOUR_ACTUAL_TOKEN" \
  --namespace sveltehr-prod \
  --dry-run=client -o yaml | kubectl apply -f -

# Create Tailscale OAuth secret
kubectl create secret generic operator-oauth \
  --from-literal=client_id="YOUR_CLIENT_ID" \
  --from-literal=client_secret="YOUR_CLIENT_SECRET" \
  --namespace tailscale \
  --dry-run=client -o yaml | kubectl apply -f -

# Create GHCR pull secrets
kubectl create secret docker-registry ghcr-pull-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USERNAME \
  --docker-password=YOUR_GITHUB_PAT \
  --namespace sveltehr-prod \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret docker-registry ghcr-pull-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USERNAME \
  --docker-password=YOUR_GITHUB_PAT \
  --namespace sveltehr-dev \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Step 3.2: Restart Critical Components (5 minutes)

```bash
# Restart External Secrets Operator (to pick up new Doppler token)
kubectl rollout restart deployment/external-secrets -n external-secrets-system
kubectl rollout status deployment/external-secrets -n external-secrets-system --timeout=300s

# Restart Tailscale Operator (to pick up new OAuth credentials)
kubectl rollout restart deployment/operator -n tailscale
kubectl rollout status deployment/operator -n tailscale --timeout=300s

# Restart applications to ensure they use updated secrets
kubectl rollout restart deployment -n sveltehr-prod
kubectl rollout restart deployment -n sveltehr-dev

# Wait for all pods to be ready
kubectl wait --for=condition=ready pod --all -n sveltehr-prod --timeout=600s
kubectl wait --for=condition=ready pod --all -n sveltehr-dev --timeout=600s
```

### Step 3.3: Install ArgoCD for Future GitOps (Optional, 5 minutes)

```bash
# ArgoCD may have been restored from backup, but if not:
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for ArgoCD to be ready
kubectl wait --for=condition=available deployment/argocd-server -n argocd --timeout=300s

# Get ArgoCD admin password
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
echo "ArgoCD Admin Password: $ARGOCD_PASSWORD"

# Install ArgoCD CLI
curl -sSL -o /usr/local/bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x /usr/local/bin/argocd

# Port-forward ArgoCD UI
kubectl port-forward svc/argocd-server -n argocd 8080:443 --address 0.0.0.0 &

# Login to ArgoCD
argocd login localhost:8080 --username admin --password "$ARGOCD_PASSWORD" --insecure
```

### Step 3.4: Apply ArgoCD Applications for Future Sync (Optional)

```bash
cd /root/SvelteHR

# Apply ArgoCD projects
kubectl apply -f k8s/argocd/projects/infrastructure.yaml
kubectl apply -f k8s/argocd/projects/applications.yaml
kubectl apply -f k8s/argocd/projects/security.yaml

# Apply app-of-apps (these will track existing deployed resources)
kubectl apply -f k8s/argocd/apps/infrastructure.yaml
kubectl apply -f k8s/argocd/apps/dev-apps.yaml
kubectl apply -f k8s/argocd/apps/prod-apps.yaml

# Sync to match current state with Git
argocd app sync infrastructure --prune=false
argocd app sync dev-apps --prune=false
argocd app sync prod-apps --prune=false

# Note: --prune=false ensures ArgoCD adopts existing resources without deleting anything
```

---

## Phase 4: Verification

**Estimated Time**: 10 minutes

### Step 4.1: Verify All Pods Running (3 minutes)

```bash
# Check all pods
kubectl get pods --all-namespaces | grep -vE "Running|Completed"

# If any pods are not Running, investigate:
kubectl describe pod <pod-name> -n <namespace>
kubectl logs <pod-name> -n <namespace>
```

### Step 4.2: Verify Database Connectivity (2 minutes)

```bash
# Connect to PostgreSQL
kubectl exec -it -n sveltehr-prod sveltehr-prod-postgres-cluster-1 -- \
  psql -U postgres -d hr_system

# Run test queries
\dt  # List tables
SELECT COUNT(*) FROM employees;  # Verify data exists
\q   # Quit
```

### Step 4.3: Verify Ingress and TLS (3 minutes)

```bash
# Check ingress routes
kubectl get ingressroute --all-namespaces

# Check TLS certificates
kubectl get certificate --all-namespaces

# Test HTTPS access
curl -I https://hr.example.com

# Expected: HTTP/2 200 with valid TLS certificate
```

### Step 4.4: Verify Backup Schedules Active (2 minutes)

```bash
# Check backup schedules
velero schedule get

# Expected output:
# NAME                     STATUS    SCHEDULE    LASTBACKUP   AGE     PAUSED
# velero-daily-backup      Enabled   0 2 * * *   <time>       <age>   false
# velero-weekly-metadata   Enabled   0 3 * * 0   <time>       <age>   false

# Verify next backup will run
velero schedule describe velero-daily-backup
```

---

## Troubleshooting Backup Restore

### Restore Hangs or Takes Too Long

```bash
# Check Velero logs
kubectl logs -n backup-system deployment/velero -f

# Check for errors
velero restore describe <restore-name>
velero restore logs <restore-name> | grep -i error

# Common issue: MinIO not accessible
kubectl exec -n backup-system deployment/velero -- \
  velero backup-location get

# If backup location is "Unavailable", check MinIO connectivity
kubectl logs -n backup-system deployment/minio
```

### Pods Not Starting After Restore

```bash
# Check if PVCs are bound
kubectl get pvc --all-namespaces | grep -v Bound

# If PVCs are Pending, check storage class
kubectl get storageclass

# Ensure storage provisioner is available
kubectl get pods -n kube-system | grep -E "local-path|nfs"

# If using local-path, verify node has sufficient disk space
df -h
```

### External Secrets Not Working

```bash
# Check ClusterSecretStore
kubectl get clustersecretstore

# Check ExternalSecrets
kubectl get externalsecret --all-namespaces

# Common issue: Doppler token not applied
kubectl get secret doppler-token-secret -n sveltehr-prod

# If missing, recreate (see Step 3.1)
# Then restart External Secrets Operator
kubectl rollout restart deployment/external-secrets -n external-secrets-system
```

### ArgoCD Shows Apps as Out of Sync

```bash
# This is expected after restore - apps exist but aren't tracked yet

# Option 1: Let ArgoCD adopt existing resources
argocd app sync <app-name> --prune=false

# Option 2: If resources differ from Git, force sync
argocd app sync <app-name> --force --replace

# Option 3: Delete ArgoCD app and reapply (nuclear option)
kubectl delete application <app-name> -n argocd
kubectl apply -f k8s/argocd/applications/<app-definition>.yaml
```

---

## Summary: Backup-First vs Full Deployment

| Step                      | Backup-First                    | Full Deployment            |
| ------------------------- | ------------------------------- | -------------------------- |
| System Setup              | ✅ Required (10 min)            | ✅ Required (10 min)       |
| Kubernetes Install        | ✅ Required (15 min)            | ✅ Required (15 min)       |
| Helm Install              | ✅ Required (2 min)             | ✅ Required (2 min)        |
| ArgoCD Install            | ⚠️ Optional (5 min)             | ✅ Required (10 min)       |
| Secret Configuration      | ✅ Minimal (5 min)              | ✅ Full (10 min)           |
| Infrastructure Deployment | ✅ MinIO + Velero only (15 min) | ✅ All components (40 min) |
| Data Restore              | ✅ Velero restore (20 min)      | ✅ Velero restore (30 min) |
| Application Deployment    | ❌ Restored from backup         | ✅ ArgoCD sync (15 min)    |
| Verification              | ✅ Required (10 min)            | ✅ Required (10 min)       |
| **TOTAL**                 | **~1h 30min**                   | **~2h 40min**              |

---

## When Backup Restore Won't Work

⚠️ **Backup restore may fail or cause issues in these scenarios**:

1. **Kubernetes version mismatch**: Backup from k8s 1.28, restore to 1.30 (API changes)
2. **Storage backend incompatibility**: Backup uses NFS, new cluster uses local-path
3. **Network configuration differs**: Different pod CIDR or service CIDR
4. **Node-specific resources**: DaemonSets, node selectors, taints may not match
5. **External dependencies changed**: Database endpoints, external APIs, DNS

**Mitigation**: Test restore in dev environment first before production.

---

## Best Practices

### Before Restore

- [ ] Verify backup is recent (< 24 hours old)
- [ ] Check backup completed successfully (`velero backup describe`)
- [ ] Ensure sufficient disk space on new server
- [ ] Have all secrets ready (Doppler, Tailscale, GHCR)

### During Restore

- [ ] Monitor Velero logs for errors
- [ ] Keep backup-system namespace isolated
- [ ] Don't interrupt restore process (can cause partial state)

### After Restore

- [ ] Test application functionality immediately
- [ ] Verify database data integrity
- [ ] Check TLS certificates are valid
- [ ] Configure ArgoCD for future GitOps
- [ ] Create immediate backup of new cluster

---

## Next Steps After Successful Restore

1. **Update DNS** if migrating to new server
2. **Configure monitoring alerts** (Prometheus Alertmanager)
3. **Test disaster recovery** procedure with new backup
4. **Document any customizations** made during restore
5. **Train team** on new cluster access and operations

---

**End of Backup-First Deployment Guide**
