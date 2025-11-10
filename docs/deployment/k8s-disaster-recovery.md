# Kubernetes Disaster Recovery & Operations Guide

**Version**: 1.0.0
**Date**: 2025-11-10
**Environment**: Production Kubernetes Cluster

---

## Table of Contents

1. [Disaster Recovery Scenarios](#disaster-recovery-scenarios)
2. [Complete Cluster Rebuild](#complete-cluster-rebuild)
3. [Partial Recovery Operations](#partial-recovery-operations)
4. [Backup Verification Procedures](#backup-verification-procedures)
5. [Common Maintenance Operations](#common-maintenance-operations)
6. [Emergency Procedures](#emergency-procedures)

---

## Disaster Recovery Scenarios

### Scenario 1: Complete Server Failure

**Impact**: Total cluster loss, all data at risk
**Recovery Time**: 2-4 hours
**Procedure**: Complete cluster rebuild from Velero backups

### Scenario 2: Namespace Corruption

**Impact**: Single environment (dev/prod) affected
**Recovery Time**: 30-60 minutes
**Procedure**: Namespace-specific restore from Velero

### Scenario 3: Database Corruption

**Impact**: Database data loss, applications functional
**Recovery Time**: 15-30 minutes
**Procedure**: PostgreSQL PVC restore from Velero

### Scenario 4: Configuration Drift

**Impact**: Applications out of sync with Git
**Recovery Time**: 5-10 minutes
**Procedure**: ArgoCD forced sync from Git repository

---

## Complete Cluster Rebuild

### Prerequisites

- [ ] New server or freshly installed OS
- [ ] Access to GitHub repository
- [ ] All critical secrets (Doppler token, Tailscale OAuth, GHCR token)
- [ ] DNS records pointing to new server
- [ ] Existing Velero backups accessible in MinIO

### Step 1: Base System Setup (30 minutes)

```bash
# Follow Phase 1-2 from k8s-production-setup.md

# SSH into new server
ssh root@hr.example.com

# Update system
apt update && apt upgrade -y

# Install essential tools
apt install -y curl wget git vim htop net-tools

# Disable swap
swapoff -a
sed -i '/ swap / s/^/#/' /etc/fstab

# Configure kernel modules
cat <<EOF | tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

modprobe overlay
modprobe br_netfilter

# Configure sysctl
cat <<EOF | tee /etc/sysctl.d/k8s.conf
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

### Step 2: Install Kubernetes (20 minutes)

```bash
# Add Kubernetes repository
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.30/deb/Release.key | \
  gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.30/deb/ /' | \
  tee /etc/apt/sources.list.d/kubernetes.list

# Install Kubernetes components
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
kubectl wait --for=condition=ready pod -l app=flannel -n kube-flannel --timeout=300s

# Allow control plane scheduling
kubectl taint nodes --all node-role.kubernetes.io/control-plane-

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Add Helm repositories
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add cloudnative-pg https://cloudnative-pg.github.io/charts
helm repo add traefik https://traefik.github.io/charts
helm repo add jetstack https://charts.jetstack.io
helm repo add external-secrets https://charts.external-secrets.io
helm repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo add minio https://charts.min.io/
helm repo update
```

### Step 3: Install ArgoCD (10 minutes)

```bash
# Create ArgoCD namespace
kubectl create namespace argocd

# Install ArgoCD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for ArgoCD to be ready
kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd
kubectl wait --for=condition=available --timeout=300s deployment/argocd-repo-server -n argocd

# Install ArgoCD CLI
curl -sSL -o /usr/local/bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x /usr/local/bin/argocd

# Get admin password
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
echo "ArgoCD Admin Password: $ARGOCD_PASSWORD"

# Login to ArgoCD
kubectl port-forward svc/argocd-server -n argocd 8080:443 --address 0.0.0.0 &
argocd login localhost:8080 --username admin --password "$ARGOCD_PASSWORD" --insecure
```

### Step 4: Restore Critical Secrets (5 minutes)

```bash
# Create namespaces
kubectl create namespace sveltehr-prod
kubectl create namespace sveltehr-dev
kubectl create namespace backup-system
kubectl create namespace tailscale

# Create Doppler token secret (CRITICAL - replace with actual token)
kubectl create secret generic doppler-token-secret \
  --from-literal=dopplerToken="dp.st.prod.YOUR_ACTUAL_TOKEN" \
  --namespace sveltehr-prod

# Create Tailscale OAuth secret (replace with actual credentials)
kubectl create secret generic operator-oauth \
  --from-literal=client_id="YOUR_CLIENT_ID" \
  --from-literal=client_secret="YOUR_CLIENT_SECRET" \
  --namespace tailscale

# Create GHCR pull secrets
kubectl create secret docker-registry ghcr-pull-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USERNAME \
  --docker-password=YOUR_GITHUB_PAT \
  --namespace sveltehr-prod

kubectl create secret docker-registry ghcr-pull-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USERNAME \
  --docker-password=YOUR_GITHUB_PAT \
  --namespace sveltehr-dev

# Verify secrets
kubectl get secrets -n sveltehr-prod | grep -E "doppler|ghcr"
kubectl get secrets -n tailscale | grep operator-oauth
```

### Step 5: Deploy Infrastructure with ArgoCD (40 minutes)

```bash
# Clone repository
git clone https://github.com/Mountain-Care-Rx/SvelteHR.git /root/SvelteHR
cd /root/SvelteHR

# Apply ArgoCD projects
kubectl apply -f k8s/argocd/projects/infrastructure.yaml
kubectl apply -f k8s/argocd/projects/applications.yaml
kubectl apply -f k8s/argocd/projects/security.yaml

# Apply infrastructure app-of-apps
kubectl apply -f k8s/argocd/apps/infrastructure.yaml
argocd app sync infrastructure
argocd app wait infrastructure --timeout 300

# Sync infrastructure components (wave-based)
# Wave 0
argocd app sync monitoring
argocd app wait monitoring --health --timeout 600

# Wave 1
argocd app sync cloudnative-pg
argocd app sync traefik
argocd app sync cert-manager
argocd app sync tailscale
argocd app sync external-secrets
argocd app wait cloudnative-pg --health --timeout 300
argocd app wait traefik --health --timeout 300
argocd app wait cert-manager --health --timeout 300
argocd app wait tailscale --health --timeout 300
argocd app wait external-secrets --health --timeout 300

# Wave 2
argocd app sync minio
argocd app sync velero
argocd app wait minio --health --timeout 300
argocd app wait velero --health --timeout 300

# Wave 3
argocd app sync loki-stack
argocd app wait loki-stack --health --timeout 300

# Verify all infrastructure is healthy
argocd app list | grep -E "monitoring|cloudnative|traefik|cert-manager|tailscale|external-secrets|minio|velero|loki"
```

### Step 6: Restore Data from Velero Backup (30 minutes)

```bash
# Install Velero CLI
wget https://github.com/vmware-tanzu/velero/releases/latest/download/velero-linux-amd64.tar.gz
tar -xvf velero-linux-amd64.tar.gz
mv velero-linux-amd64/velero /usr/local/bin/
rm -rf velero-linux-amd64*

# Verify Velero can access existing backups
velero backup-location get
velero backup get

# Find latest backup
LATEST_BACKUP=$(velero backup get -o json | jq -r '.items | sort_by(.status.startTimestamp) | last | .metadata.name')
echo "Latest backup: $LATEST_BACKUP"

# Restore from backup
velero restore create full-cluster-restore \
  --from-backup $LATEST_BACKUP \
  --wait

# Monitor restore progress
velero restore describe full-cluster-restore
velero restore logs full-cluster-restore

# Check restore status
kubectl get all --all-namespaces | grep -vE "kube-system|kube-public|argocd|monitoring"
```

### Step 7: Deploy Applications (15 minutes)

```bash
# Deploy dev apps
kubectl apply -f k8s/argocd/apps/dev-apps.yaml
argocd app sync dev-apps
argocd app sync sveltehr-dev
argocd app wait sveltehr-dev --health --timeout 600

# Deploy prod apps
kubectl apply -f k8s/argocd/apps/prod-apps.yaml
argocd app sync prod-apps
argocd app sync sveltehr-prod
argocd app wait sveltehr-prod --health --timeout 600

# Verify applications
kubectl get pods -n sveltehr-prod
kubectl get pods -n sveltehr-dev
```

### Step 8: Verification (10 minutes)

```bash
# Check all ArgoCD applications
argocd app list

# Check database connectivity
kubectl exec -it -n sveltehr-prod sveltehr-prod-postgres-cluster-1 -- psql -U postgres -d hr_system -c "\dt"

# Check ingress and TLS
kubectl get ingressroute -n sveltehr-prod
kubectl get certificate -n sveltehr-prod

# Test HTTPS access
curl -I https://hr.example.com

# Verify backup schedules
kubectl get schedules -n backup-system

# Check monitoring
kubectl get pods -n monitoring | grep prometheus
```

### Total Recovery Time Estimate

| Phase | Time | Description |
|-------|------|-------------|
| System Setup | 30 min | OS configuration, containerd |
| Kubernetes Install | 20 min | kubeadm, CNI, Helm |
| ArgoCD Install | 10 min | ArgoCD deployment and CLI |
| Secrets Configuration | 5 min | Critical secrets creation |
| Infrastructure Deployment | 40 min | All platform components |
| Data Restore | 30 min | Velero backup restore |
| Application Deployment | 15 min | Dev/prod apps |
| Verification | 10 min | Health checks |
| **Total** | **2h 40min** | **Complete cluster rebuild** |

---

## Partial Recovery Operations

### Restore Single Namespace (30 minutes)

```bash
# List available backups
velero backup get

# Restore specific namespace (e.g., production only)
velero restore create sveltehr-prod-restore \
  --from-backup velero-daily-backup-20241110020000 \
  --include-namespaces sveltehr-prod \
  --wait

# Verify restoration
kubectl get all -n sveltehr-prod
velero restore describe sveltehr-prod-restore
velero restore logs sveltehr-prod-restore
```

### Restore Only PostgreSQL Database (15 minutes)

```bash
# Scale down applications using the database
kubectl scale deployment sveltehr-prod-backend -n sveltehr-prod --replicas=0
kubectl scale deployment sveltehr-prod-frontend -n sveltehr-prod --replicas=0

# Restore PostgreSQL PVCs
velero restore create postgres-restore \
  --from-backup velero-daily-backup-20241110020000 \
  --include-resources persistentvolumeclaims,persistentvolumes \
  --include-namespaces sveltehr-prod \
  --selector cnpg.io/cluster=sveltehr-prod-postgres-cluster \
  --wait

# Restart PostgreSQL cluster
kubectl delete pod -n sveltehr-prod -l cnpg.io/cluster=sveltehr-prod-postgres-cluster

# Wait for PostgreSQL to be ready
kubectl wait --for=condition=ready pod -l cnpg.io/cluster=sveltehr-prod-postgres-cluster -n sveltehr-prod --timeout=300s

# Scale applications back up
kubectl scale deployment sveltehr-prod-backend -n sveltehr-prod --replicas=2
kubectl scale deployment sveltehr-prod-frontend -n sveltehr-prod --replicas=2
```

### Restore Specific Resources

```bash
# Restore only ConfigMaps and Secrets
velero restore create config-restore \
  --from-backup velero-daily-backup-20241110020000 \
  --include-resources configmaps,secrets \
  --include-namespaces sveltehr-prod \
  --wait

# Restore only Deployments
velero restore create deployment-restore \
  --from-backup velero-daily-backup-20241110020000 \
  --include-resources deployments \
  --include-namespaces sveltehr-prod \
  --wait
```

---

## Backup Verification Procedures

### Monthly Backup Validation (Recommended)

```bash
# 1. Create a test namespace
kubectl create namespace backup-test

# 2. Restore latest backup to test namespace
LATEST_BACKUP=$(velero backup get -o json | jq -r '.items | sort_by(.status.startTimestamp) | last | .metadata.name')

velero restore create backup-validation-test \
  --from-backup $LATEST_BACKUP \
  --include-namespaces sveltehr-prod \
  --namespace-mappings sveltehr-prod:backup-test \
  --wait

# 3. Verify restored resources
kubectl get all -n backup-test

# 4. Test database connectivity
kubectl exec -it -n backup-test backup-test-postgres-cluster-1 -- psql -U postgres -d hr_system -c "SELECT COUNT(*) FROM employees;"

# 5. Cleanup test namespace
kubectl delete namespace backup-test
```

### Backup Size Monitoring

```bash
# Check backup sizes
velero backup get -o json | jq -r '.items[] | "\(.metadata.name) - \(.status.volumeSnapshotsAttempted) volumes - \(.status.progress.totalItems) items"'

# Check MinIO storage usage
kubectl exec -n backup-system deployment/minio -- \
  mc du minio/velero

# Alert if backup size deviates significantly from baseline
```

---

## Common Maintenance Operations

### Rolling Restart of Applications

```bash
# Restart production frontend
kubectl rollout restart deployment/sveltehr-prod-frontend -n sveltehr-prod
kubectl rollout status deployment/sveltehr-prod-frontend -n sveltehr-prod

# Restart production backend
kubectl rollout restart deployment/sveltehr-prod-backend -n sveltehr-prod
kubectl rollout status deployment/sveltehr-prod-backend -n sveltehr-prod

# Restart PostgreSQL cluster (one pod at a time, no downtime)
kubectl delete pod sveltehr-prod-postgres-cluster-1 -n sveltehr-prod
kubectl wait --for=condition=ready pod sveltehr-prod-postgres-cluster-1 -n sveltehr-prod --timeout=300s
```

### ArgoCD Application Refresh

```bash
# Hard refresh (fetch latest from Git)
argocd app get sveltehr-prod --hard-refresh

# Force sync (overwrite cluster state with Git)
argocd app sync sveltehr-prod --force

# Prune resources not in Git
argocd app sync sveltehr-prod --prune
```

### Manual Backup Creation

```bash
# Create on-demand backup before major changes
velero backup create pre-upgrade-backup-$(date +%Y%m%d-%H%M%S) \
  --include-namespaces sveltehr-prod \
  --wait

# Create full cluster backup
velero backup create manual-full-backup-$(date +%Y%m%d-%H%M%S) \
  --exclude-namespaces kube-system,kube-public,kube-node-lease \
  --wait

# Verify backup completed
velero backup describe <backup-name>
```

### Certificate Renewal

```bash
# Force certificate renewal (if near expiration)
kubectl delete certificate sveltehr-prod-tls -n sveltehr-prod

# cert-manager will automatically recreate and issue new certificate
kubectl wait --for=condition=ready certificate sveltehr-prod-tls -n sveltehr-prod --timeout=300s

# Verify new certificate
kubectl get certificate sveltehr-prod-tls -n sveltehr-prod
```

---

## Emergency Procedures

### Complete Application Shutdown

```bash
# Scale all applications to zero (emergency maintenance)
kubectl scale deployment --all --replicas=0 -n sveltehr-prod
kubectl scale deployment --all --replicas=0 -n sveltehr-dev

# Verify all pods are terminated
kubectl get pods -n sveltehr-prod
kubectl get pods -n sveltehr-dev
```

### Emergency Rollback

```bash
# Rollback to previous deployment version
kubectl rollout undo deployment/sveltehr-prod-backend -n sveltehr-prod
kubectl rollout undo deployment/sveltehr-prod-frontend -n sveltehr-prod

# Rollback to specific revision
kubectl rollout history deployment/sveltehr-prod-backend -n sveltehr-prod
kubectl rollout undo deployment/sveltehr-prod-backend -n sveltehr-prod --to-revision=3
```

### Database Emergency Stop

```bash
# Stop PostgreSQL cluster (emergency only)
kubectl scale cluster sveltehr-prod-postgres-cluster -n sveltehr-prod --replicas=0

# Restart PostgreSQL cluster
kubectl scale cluster sveltehr-prod-postgres-cluster -n sveltehr-prod --replicas=3
kubectl wait --for=condition=ready pod -l cnpg.io/cluster=sveltehr-prod-postgres-cluster -n sveltehr-prod --timeout=600s
```

### ArgoCD Pause Auto-Sync

```bash
# Pause auto-sync for emergency changes
argocd app set sveltehr-prod --sync-policy none

# Resume auto-sync after emergency
argocd app set sveltehr-prod --sync-policy automated --self-heal --auto-prune=false
```

---

## Recovery Testing Schedule

### Weekly

- [ ] Verify latest backup completed successfully
- [ ] Check backup sizes for anomalies
- [ ] Review Velero logs for errors

### Monthly

- [ ] Perform backup validation test (restore to test namespace)
- [ ] Test database restore procedure
- [ ] Review and update recovery documentation

### Quarterly

- [ ] Full disaster recovery drill (complete cluster rebuild in staging)
- [ ] Test all emergency procedures
- [ ] Update runbooks with lessons learned

---

## Emergency Contact Information

**DevOps Lead**: [Your Name] - [Email] - [Phone]
**Database Administrator**: [Name] - [Email] - [Phone]
**Security Team**: [Email] - [Phone]

**Vendor Support**:
- Kubernetes: https://kubernetes.io/docs/tasks/debug/
- ArgoCD: https://argo-cd.readthedocs.io/
- Velero: https://velero.io/docs/

---

**End of Disaster Recovery Guide**
