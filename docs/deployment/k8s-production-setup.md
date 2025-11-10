# SvelteHR Kubernetes Production Server Setup Guide

**Version**: 1.0.0
**Date**: 2025-11-10
**Target Environment**: Production Kubernetes Cluster
**Architecture**: ArgoCD App-of-Apps Pattern with Automated GitOps

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Production Server Requirements](#production-server-requirements)
4. [Pre-Installation Checklist](#pre-installation-checklist)
5. [Phase 1: Initial Server Setup](#phase-1-initial-server-setup)
6. [Phase 2: Kubernetes Cluster Installation](#phase-2-kubernetes-cluster-installation)
7. [Phase 3: ArgoCD Installation](#phase-3-argocd-installation)
8. [Phase 4: Critical Secrets Configuration](#phase-4-critical-secrets-configuration)
9. [Phase 5: Infrastructure Deployment](#phase-5-infrastructure-deployment)
10. [Phase 6: Application Deployment](#phase-6-application-deployment)
11. [Phase 7: Production Verification](#phase-7-production-verification)
12. [Disaster Recovery & Backup Restore](#disaster-recovery--backup-restore)
13. [Monitoring & Maintenance](#monitoring--maintenance)
14. [Troubleshooting](#troubleshooting)
15. [Security Hardening](#security-hardening)

---

## Overview

This guide walks through setting up the SvelteHR Kubernetes cluster on a production server using:

- **ArgoCD App-of-Apps pattern** for hierarchical GitOps management
- **External Secrets Operator** integrated with Doppler for secret management
- **Velero + MinIO** for automated backups (daily/weekly schedules)
- **CloudNativePG** for managed PostgreSQL clusters
- **Traefik** for ingress with automatic TLS via cert-manager
- **Tailscale** for secure VPN access
- **Prometheus + Grafana + Loki** for comprehensive observability

### Architecture Hierarchy

```
root-app (ArgoCD top-level application)
├── infrastructure (app-of-apps)
│   ├── monitoring (Wave 0) - Prometheus, Grafana, Alertmanager
│   ├── cloudnative-pg (Wave 1) - PostgreSQL operator
│   ├── traefik (Wave 1) - Ingress controller
│   ├── cert-manager (Wave 1) - TLS certificate management
│   ├── tailscale (Wave 1) - VPN networking
│   ├── external-secrets (Wave 1) - Doppler secret sync
│   ├── minio (Wave 2) - S3-compatible backup storage
│   ├── velero (Wave 2) - Backup/restore operator
│   ├── argocd-image-updater (Wave 2) - Automated image updates
│   └── loki (Wave 3) - Log aggregation
├── dev-apps (app-of-apps)
│   └── sveltehr-dev (tracks develop branch)
└── prod-apps (app-of-apps)
    └── sveltehr-prod (tracks main branch, auto-sync enabled)
```

---

## Prerequisites

### Required Access & Credentials

- [ ] **Root or sudo access** to production server
- [ ] **GitHub repository access**: `github.com/Mountain-Care-Rx/SvelteHR`
- [ ] **Doppler account** with `sveltehr` project, `prod` config
- [ ] **Doppler service token**: `dp.st.prod.xxxxx`
- [ ] **Tailscale account** with OAuth credentials
- [ ] **GitHub Container Registry** PAT token (for image pulls)
- [ ] **Domain name** pointed to production server IP (for TLS certificates)

### Required Tools (Installation Covered Below)

- kubectl 1.27+
- helm 3.x
- ArgoCD CLI
- velero CLI (optional but recommended)

---

## Production Server Requirements

### Minimum Hardware Specifications

| Component | Minimum | Recommended | Notes |
|-----------|---------|-------------|-------|
| **CPU** | 4 cores | 8 cores | For infrastructure + applications |
| **RAM** | 16 GB | 32 GB | PostgreSQL, monitoring stack, applications |
| **Disk** | 100 GB SSD | 250 GB SSD | For persistent volumes (PVs) + backups |
| **Network** | 100 Mbps | 1 Gbps | For image pulls and external traffic |

### Operating System

- **Supported**: Ubuntu 22.04 LTS, Debian 12, Rocky Linux 9
- **Recommended**: Ubuntu 22.04 LTS Server
- **Kernel**: 5.15+ (for modern Kubernetes features)

### Network Requirements

- [ ] **Static IP address** or stable DHCP reservation
- [ ] **DNS A record** pointing to server IP (e.g., `hr.example.com`)
- [ ] **Firewall ports open**:
  - `22/tcp` - SSH (restrict to known IPs)
  - `80/tcp` - HTTP (for Let's Encrypt ACME challenge)
  - `443/tcp` - HTTPS (application traffic)
  - `6443/tcp` - Kubernetes API server (restrict to admin IPs)
- [ ] **Outbound internet access** for image pulls, package updates, Let's Encrypt

---

## Pre-Installation Checklist

### Gather Required Secrets

Create a secure document with these values (DO NOT commit to Git):

```bash
# Doppler Integration
DOPPLER_TOKEN="dp.st.prod.xxxxx"  # From login.doppler.com

# Tailscale OAuth
TAILSCALE_OAUTH_CLIENT_ID="kxxxxxxxxx"  # From login.tailscale.com/admin/settings/oauth
TAILSCALE_OAUTH_CLIENT_SECRET="tskey-client-xxxxx"

# GitHub Container Registry
GHCR_USERNAME="your-github-username"
GHCR_PAT_TOKEN="ghp_xxxxx"  # GitHub Personal Access Token with read:packages scope

# Production Domain
PRODUCTION_DOMAIN="hr.example.com"  # Your actual domain
TLS_EMAIL="admin@example.com"  # For Let's Encrypt notifications
```

### Verify Prerequisites

```bash
# 1. Verify server meets minimum requirements
free -h  # Check RAM (min 16GB)
df -h    # Check disk space (min 100GB free)
nproc    # Check CPU cores (min 4)

# 2. Verify network connectivity
ping -c 3 8.8.8.8  # Internet connectivity
dig +short hr.example.com  # DNS resolution (should return server IP)

# 3. Verify SSH access
ssh root@hr.example.com "uname -a"  # Should connect successfully
```

---

## Phase 1: Initial Server Setup

**Estimated Time**: 15-20 minutes

### 1.1 Update System Packages

```bash
# SSH into production server
ssh root@hr.example.com

# Update package lists and upgrade
apt update && apt upgrade -y

# Install essential tools
apt install -y \
  curl \
  wget \
  git \
  vim \
  htop \
  net-tools \
  software-properties-common \
  apt-transport-https \
  ca-certificates \
  gnupg \
  lsb-release
```

### 1.2 Configure System Settings

```bash
# Disable swap (required for Kubernetes)
swapoff -a
sed -i '/ swap / s/^/#/' /etc/fstab

# Enable kernel modules
cat <<EOF | tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

modprobe overlay
modprobe br_netfilter

# Configure sysctl for Kubernetes
cat <<EOF | tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

sysctl --system
```

### 1.3 Install Container Runtime (containerd)

```bash
# Install containerd
apt install -y containerd

# Configure containerd
mkdir -p /etc/containerd
containerd config default | tee /etc/containerd/config.toml

# Enable SystemdCgroup
sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml

# Restart containerd
systemctl restart containerd
systemctl enable containerd
systemctl status containerd  # Should be active (running)
```

---

## Phase 2: Kubernetes Cluster Installation

**Estimated Time**: 20-30 minutes

### 2.1 Install Kubernetes Components (kubeadm, kubelet, kubectl)

```bash
# Add Kubernetes apt repository
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.30/deb/Release.key | \
  gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.30/deb/ /' | \
  tee /etc/apt/sources.list.d/kubernetes.list

# Install Kubernetes
apt update
apt install -y kubelet kubeadm kubectl
apt-mark hold kubelet kubeadm kubectl

# Enable kubelet
systemctl enable kubelet
```

### 2.2 Initialize Kubernetes Control Plane

```bash
# Initialize cluster (single-node control plane)
kubeadm init \
  --pod-network-cidr=10.244.0.0/16 \
  --service-cidr=10.96.0.0/12 \
  --apiserver-advertise-address=$(hostname -I | awk '{print $1}')

# IMPORTANT: Save the output! It contains the join command and admin config.

# Configure kubectl for root user
mkdir -p $HOME/.kube
cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
chown $(id -u):$(id -g) $HOME/.kube/config

# Verify cluster status
kubectl cluster-info
kubectl get nodes  # Should show control-plane node (NotReady until CNI installed)
```

### 2.3 Install Pod Network (Flannel CNI)

```bash
# Install Flannel CNI
kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml

# Wait for CNI to be ready
kubectl wait --for=condition=ready pod -l app=flannel -n kube-flannel --timeout=300s

# Verify node is Ready
kubectl get nodes  # Should show Ready status
```

### 2.4 Allow Control Plane to Schedule Workloads (Single-Node Cluster)

```bash
# Remove taint from control plane (allows pods to run on this node)
kubectl taint nodes --all node-role.kubernetes.io/control-plane-

# Verify taint removed
kubectl describe node | grep Taints  # Should show: <none>
```

### 2.5 Install Helm

```bash
# Install Helm 3
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify installation
helm version  # Should show v3.x.x

# Add common Helm repositories
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

---

## Phase 3: ArgoCD Installation

**Estimated Time**: 10-15 minutes

### 3.1 Install ArgoCD

```bash
# Create ArgoCD namespace
kubectl create namespace argocd

# Install ArgoCD (stable release)
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for ArgoCD to be ready
kubectl wait --for=condition=available --timeout=300s \
  deployment/argocd-server -n argocd

kubectl wait --for=condition=available --timeout=300s \
  deployment/argocd-repo-server -n argocd

kubectl wait --for=condition=available --timeout=300s \
  deployment/argocd-applicationset-controller -n argocd
```

### 3.2 Install ArgoCD CLI

```bash
# Download ArgoCD CLI
curl -sSL -o /usr/local/bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64

# Make executable
chmod +x /usr/local/bin/argocd

# Verify installation
argocd version --client  # Should show client version
```

### 3.3 Access ArgoCD UI

```bash
# Get initial admin password
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d)

echo "ArgoCD Admin Password: $ARGOCD_PASSWORD"

# IMPORTANT: Save this password! You'll need it to log in.

# Port-forward to access ArgoCD UI (in a separate terminal or tmux session)
kubectl port-forward svc/argocd-server -n argocd 8080:443 --address 0.0.0.0 &

# Access ArgoCD UI at: https://<server-ip>:8080
# Username: admin
# Password: <ARGOCD_PASSWORD from above>
```

**Security Note**: For production, configure Traefik ingress for ArgoCD instead of port-forwarding (covered in Phase 5).

### 3.4 Login with ArgoCD CLI

```bash
# Login via CLI (use port-forward or configure ingress first)
argocd login localhost:8080 \
  --username admin \
  --password "$ARGOCD_PASSWORD" \
  --insecure

# Verify login
argocd cluster list  # Should show in-cluster
```

---

## Phase 4: Critical Secrets Configuration

**Estimated Time**: 10 minutes

### 4.1 Create Required Namespaces

```bash
# Create namespaces for secrets and applications
kubectl create namespace sveltehr-prod
kubectl create namespace sveltehr-dev
kubectl create namespace backup-system
kubectl create namespace tailscale
```

### 4.2 Configure Doppler Token Secret

**CRITICAL**: This secret must be created FIRST as External Secrets Operator depends on it.

```bash
# Create Doppler token secret (replace with your actual token)
kubectl create secret generic doppler-token-secret \
  --from-literal=dopplerToken="dp.st.prod.YOUR_ACTUAL_TOKEN_HERE" \
  --namespace sveltehr-prod

# Verify secret created
kubectl get secret doppler-token-secret -n sveltehr-prod
```

**Alternative: Apply from Git (if you've manually created the file)**

```bash
# Clone repository (if not already done)
git clone https://github.com/Mountain-Care-Rx/SvelteHR.git /root/SvelteHR
cd /root/SvelteHR

# Edit the secret file with your actual token
vim k8s/manifests/external-secrets/doppler-token-secret.yaml

# Apply the secret
kubectl apply -f k8s/manifests/external-secrets/doppler-token-secret.yaml
```

### 4.3 Configure Tailscale OAuth Secret

```bash
# Create Tailscale OAuth secret
kubectl create secret generic operator-oauth \
  --from-literal=client_id="kxxxxxxxxx" \
  --from-literal=client_secret="tskey-client-xxxxx" \
  --namespace tailscale

# Verify secret created
kubectl get secret operator-oauth -n tailscale
```

**Alternative: Apply from Git repository**

```bash
# Edit the secret file with your OAuth credentials
vim k8s/secrets/tailscale-oauth.yaml

# Apply the secret
kubectl apply -f k8s/secrets/tailscale-oauth.yaml
```

### 4.4 Configure GitHub Container Registry Pull Secret

```bash
# Create GHCR pull secret for production namespace
kubectl create secret docker-registry ghcr-pull-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USERNAME \
  --docker-password=YOUR_GITHUB_PAT_TOKEN \
  --namespace sveltehr-prod

# Create GHCR pull secret for dev namespace
kubectl create secret docker-registry ghcr-pull-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USERNAME \
  --docker-password=YOUR_GITHUB_PAT_TOKEN \
  --namespace sveltehr-dev

# Verify secrets created
kubectl get secret ghcr-pull-secret -n sveltehr-prod
kubectl get secret ghcr-pull-secret -n sveltehr-dev
```

### 4.5 Verify All Critical Secrets

```bash
# Check all required secrets
kubectl get secrets -n sveltehr-prod | grep -E "doppler|ghcr"
kubectl get secrets -n tailscale | grep operator-oauth

# Expected output:
# sveltehr-prod:
#   - doppler-token-secret
#   - ghcr-pull-secret
# tailscale:
#   - operator-oauth
```

---

## Phase 5: Infrastructure Deployment

**Estimated Time**: 40-60 minutes

### 5.1 Apply ArgoCD Projects

```bash
cd /root/SvelteHR

# Apply ArgoCD projects (RBAC for applications)
kubectl apply -f k8s/argocd/projects/infrastructure.yaml
kubectl apply -f k8s/argocd/projects/applications.yaml
kubectl apply -f k8s/argocd/projects/security.yaml

# Verify projects created
argocd proj list
```

### 5.2 Deploy Infrastructure App-of-Apps

```bash
# Apply infrastructure app-of-apps
kubectl apply -f k8s/argocd/apps/infrastructure.yaml

# Verify infrastructure app created
argocd app list | grep infrastructure

# Sync infrastructure (creates all child applications)
argocd app sync infrastructure

# Wait for sync to complete
argocd app wait infrastructure --timeout 300
```

### 5.3 Deploy Infrastructure Components (Wave-Based)

**IMPORTANT**: Components must be deployed in order due to CRD dependencies.

#### Wave 0: Monitoring Stack (Prometheus, Grafana, Alertmanager)

```bash
# Sync monitoring stack (provides CRDs for other components)
argocd app sync monitoring

# Wait for monitoring to be healthy
argocd app wait monitoring --health --timeout 600

# Verify Prometheus pods
kubectl get pods -n monitoring | grep prometheus

# Access Grafana (optional, for verification)
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80 &
# Grafana UI: http://<server-ip>:3000 (admin/prom-operator)
```

#### Wave 1: Core Infrastructure

```bash
# CloudNativePG (PostgreSQL operator)
argocd app sync cloudnative-pg
argocd app wait cloudnative-pg --health --timeout 300

# Traefik (Ingress controller)
argocd app sync traefik
argocd app wait traefik --health --timeout 300

# cert-manager (TLS certificate management)
argocd app sync cert-manager
argocd app wait cert-manager --health --timeout 300

# Tailscale (VPN networking)
argocd app sync tailscale
argocd app wait tailscale --health --timeout 300

# External Secrets Operator (CRITICAL - wait for healthy before proceeding)
argocd app sync external-secrets
argocd app wait external-secrets --health --timeout 300

# Verify External Secrets is pulling from Doppler
kubectl get clustersecretstore -n external-secrets-system
kubectl get externalsecrets --all-namespaces
```

**CHECKPOINT**: Verify all Wave 1 components are healthy before proceeding.

```bash
# Check all infrastructure apps
argocd app list | grep -E "monitoring|cloudnative-pg|traefik|cert-manager|tailscale|external-secrets"

# All should show "Healthy" status
```

#### Wave 2: Backup Infrastructure

```bash
# MinIO (S3-compatible backup storage)
argocd app sync minio
argocd app wait minio --health --timeout 300

# Velero (Backup operator - depends on MinIO)
argocd app sync velero
argocd app wait velero --health --timeout 300

# ArgoCD Image Updater (automated image updates)
argocd app sync argocd-image-updater
argocd app wait argocd-image-updater --health --timeout 300
```

#### Wave 3: Log Aggregation

```bash
# Loki Stack (Log aggregation with Grafana Loki)
argocd app sync loki-stack
argocd app wait loki-stack --health --timeout 300
```

### 5.4 Verify Infrastructure Health

```bash
# Check all infrastructure applications
argocd app list

# Expected output (all should show Healthy/Synced):
# NAME                   CLUSTER                         NAMESPACE                STATUS
# infrastructure         https://kubernetes.default.svc  argocd                   Synced
# monitoring             https://kubernetes.default.svc  monitoring               Healthy
# cloudnative-pg         https://kubernetes.default.svc  cnpg-system              Healthy
# traefik                https://kubernetes.default.svc  traefik                  Healthy
# cert-manager           https://kubernetes.default.svc  cert-manager             Healthy
# tailscale              https://kubernetes.default.svc  tailscale                Healthy
# external-secrets       https://kubernetes.default.svc  external-secrets-system  Healthy
# minio                  https://kubernetes.default.svc  backup-system            Healthy
# velero                 https://kubernetes.default.svc  backup-system            Healthy
# argocd-image-updater   https://kubernetes.default.svc  argocd                   Healthy
# loki-stack             https://kubernetes.default.svc  monitoring               Healthy

# Check Velero backup schedules
kubectl get schedules -n backup-system
# Expected:
#   velero-daily-backup (0 2 * * *)
#   velero-weekly-metadata (0 3 * * 0)
```

---

## Phase 6: Application Deployment

**Estimated Time**: 15-20 minutes

### 6.1 Deploy Development Application

```bash
# Apply dev-apps app-of-apps
kubectl apply -f k8s/argocd/apps/dev-apps.yaml

# Sync dev-apps
argocd app sync dev-apps
argocd app wait dev-apps --timeout 120

# Sync sveltehr-dev application
argocd app sync sveltehr-dev
argocd app wait sveltehr-dev --health --timeout 600

# Verify dev application
kubectl get pods -n sveltehr-dev
```

### 6.2 Deploy Production Application

```bash
# Apply prod-apps app-of-apps
kubectl apply -f k8s/argocd/apps/prod-apps.yaml

# Sync prod-apps
argocd app sync prod-apps
argocd app wait prod-apps --timeout 120

# Sync sveltehr-prod application (auto-sync enabled, but manual first time)
argocd app sync sveltehr-prod
argocd app wait sveltehr-prod --health --timeout 600

# Verify production application
kubectl get pods -n sveltehr-prod
```

### 6.3 Verify Application Deployments

```bash
# Check all application resources
kubectl get all -n sveltehr-prod
kubectl get all -n sveltehr-dev

# Check PostgreSQL cluster
kubectl get cluster -n sveltehr-prod
kubectl get cluster -n sveltehr-dev

# Check ingress routes
kubectl get ingressroute --all-namespaces
```

### 6.4 (Optional) Apply Root App for Full GitOps

```bash
# Once everything is stable, apply root-app for single management point
kubectl apply -f k8s/argocd/apps/root-app.yaml

# View entire application tree
argocd app tree root-app

# From now on, you can manage everything via root-app
# argocd app sync root-app (will sync all child apps)
```

---

## Phase 7: Production Verification

**Estimated Time**: 15 minutes

### 7.1 Verify All ArgoCD Applications

```bash
# List all applications
argocd app list

# Check for any degraded or out-of-sync apps
argocd app list | grep -vE "Healthy|Synced"

# If any apps are not healthy, investigate:
argocd app get <app-name>
argocd app logs <app-name>
```

### 7.2 Verify Database Connectivity

```bash
# Check PostgreSQL cluster status
kubectl get cluster -n sveltehr-prod

# Connect to PostgreSQL (should succeed)
kubectl exec -it -n sveltehr-prod sveltehr-prod-postgres-cluster-1 -- psql -U postgres -d hr_system

# Run a test query
\dt  # List tables
\q   # Quit
```

### 7.3 Verify Ingress and TLS

```bash
# Check Traefik ingress routes
kubectl get ingressroute -n sveltehr-prod

# Check TLS certificates (should be issued by cert-manager)
kubectl get certificate -n sveltehr-prod

# Test HTTPS access
curl -I https://hr.example.com  # Should return 200 OK with valid TLS
```

### 7.4 Verify Backup System

```bash
# Install Velero CLI (optional but recommended)
wget https://github.com/vmware-tanzu/velero/releases/latest/download/velero-linux-amd64.tar.gz
tar -xvf velero-linux-amd64.tar.gz
mv velero-linux-amd64/velero /usr/local/bin/
rm -rf velero-linux-amd64*

# Verify Velero installation
velero version

# Check backup storage location
velero backup-location get

# Check backup schedules
velero schedule get

# Create a test backup
velero backup create test-backup --wait

# Verify backup completed
velero backup describe test-backup
velero backup logs test-backup

# List all backups
velero backup get
```

### 7.5 Verify Monitoring Stack

```bash
# Port-forward Prometheus
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090 --address 0.0.0.0 &

# Port-forward Grafana
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80 --address 0.0.0.0 &

# Access monitoring:
# - Prometheus: http://<server-ip>:9090
# - Grafana: http://<server-ip>:3000 (admin/prom-operator)

# Check Prometheus targets (all should be UP)
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.health != "up")'
```

### 7.6 Run Application Health Checks

```bash
# Check frontend health
kubectl exec -n sveltehr-prod deployment/sveltehr-prod-frontend -- wget -q -O- http://localhost:3000/health

# Check backend health
kubectl exec -n sveltehr-prod deployment/sveltehr-prod-backend -- wget -q -O- http://localhost:8080/health

# Check external access
curl https://hr.example.com/health  # Should return healthy status
```

---

## Disaster Recovery & Backup Restore

### Backup Strategy

Your cluster has **automated backups** configured via Velero:

1. **Daily Full Backup**: 2 AM daily (30-day retention)
   - All namespaces except kube-system
   - Includes PV data via Kopia filesystem backup

2. **Weekly Metadata Backup**: 3 AM Sundays (90-day retention)
   - Metadata only, no volumes
   - For disaster recovery planning

### Restoring from Backup (Complete Cluster)

If you need to rebuild the entire cluster from scratch:

```bash
# 1. Complete Phase 1-4 (server setup, K8s, ArgoCD, secrets)

# 2. Install Velero infrastructure
argocd app sync infrastructure
argocd app sync minio
argocd app sync velero
argocd app wait velero --health --timeout 300

# 3. Verify Velero can see existing backups
velero backup-location get
velero backup get

# 4. List available backups
velero backup get

# 5. Restore from latest daily backup
LATEST_BACKUP=$(velero backup get -o json | jq -r '.items | sort_by(.status.startTimestamp) | last | .metadata.name')
echo "Restoring from backup: $LATEST_BACKUP"

velero restore create full-cluster-restore \
  --from-backup $LATEST_BACKUP \
  --wait

# 6. Check restore status
velero restore describe full-cluster-restore
velero restore logs full-cluster-restore

# 7. Verify restored resources
kubectl get all --all-namespaces
```

### Restoring Specific Namespace

```bash
# Restore only production application namespace
velero restore create sveltehr-prod-restore \
  --from-backup velero-daily-backup-20241110020000 \
  --include-namespaces sveltehr-prod \
  --wait

# Check restore status
velero restore describe sveltehr-prod-restore
```

### Restoring Only Database

```bash
# Restore PostgreSQL PVCs and data
velero restore create postgres-restore \
  --from-backup velero-daily-backup-20241110020000 \
  --include-resources persistentvolumeclaims,persistentvolumes \
  --include-namespaces sveltehr-prod \
  --wait
```

---

## Monitoring & Maintenance

### Daily Monitoring Tasks

```bash
# Check cluster health
kubectl get nodes
kubectl get pods --all-namespaces | grep -vE "Running|Completed"

# Check ArgoCD sync status
argocd app list | grep -vE "Healthy|Synced"

# Check recent backups
velero backup get | head -5

# Check disk usage
df -h | grep -E "/$|/var"
```

### Weekly Maintenance Tasks

```bash
# Review logs for errors
kubectl logs -n monitoring deployment/kube-prometheus-stack-operator --since=7d | grep -i error

# Check certificate expiration
kubectl get certificate --all-namespaces

# Review resource usage
kubectl top nodes
kubectl top pods --all-namespaces --sort-by=memory | head -20
```

### Monthly Maintenance Tasks

```bash
# Update Helm repositories
helm repo update

# Check for available upgrades
helm list --all-namespaces --output json | \
  jq -r '.[] | "\(.name) - \(.namespace) - \(.chart)"'

# Test disaster recovery (restore to dev environment)
# See "Disaster Recovery & Backup Restore" section

# Rotate secrets (if using manual secret management)
# Update Doppler token, Tailscale OAuth, GHCR tokens
```

---

## Troubleshooting

### ArgoCD Application Not Syncing

```bash
# Check application status
argocd app get <app-name>

# View application events
kubectl describe application <app-name> -n argocd

# Check ArgoCD logs
kubectl logs -n argocd deployment/argocd-application-controller

# Force refresh and sync
argocd app sync <app-name> --force
```

### External Secrets Not Pulling from Doppler

```bash
# Check ClusterSecretStore status
kubectl get clustersecretstore doppler-secret-store -o yaml

# Check ExternalSecret status
kubectl get externalsecret -n sveltehr-prod -o yaml

# Check External Secrets Operator logs
kubectl logs -n external-secrets-system deployment/external-secrets -f

# Verify Doppler token is correct
kubectl get secret doppler-token-secret -n sveltehr-prod -o jsonpath='{.data.dopplerToken}' | base64 -d
```

### Velero Backup Failing

```bash
# Check backup status
velero backup describe <backup-name>
velero backup logs <backup-name>

# Check Velero pod logs
kubectl logs -n backup-system deployment/velero -f

# Verify MinIO is accessible
kubectl exec -n backup-system deployment/velero -- velero backup-location get

# Check MinIO credentials
kubectl get secret velero-credentials -n backup-system -o yaml
```

### PostgreSQL Cluster Not Starting

```bash
# Check PostgreSQL cluster status
kubectl get cluster -n sveltehr-prod

# Check pod events
kubectl describe pod -n sveltehr-prod -l cnpg.io/cluster=sveltehr-prod-postgres-cluster

# Check CloudNativePG operator logs
kubectl logs -n cnpg-system deployment/cloudnative-pg

# Check PVC status
kubectl get pvc -n sveltehr-prod
```

### Traefik Ingress Not Working

```bash
# Check Traefik pods
kubectl get pods -n traefik

# Check IngressRoute status
kubectl get ingressroute -n sveltehr-prod

# Check Traefik logs
kubectl logs -n traefik deployment/traefik -f

# Verify cert-manager issued certificate
kubectl get certificate -n sveltehr-prod
kubectl describe certificate sveltehr-prod-tls -n sveltehr-prod
```

### Application Pods CrashLoopBackOff

```bash
# Check pod status
kubectl get pods -n sveltehr-prod

# Describe pod to see events
kubectl describe pod <pod-name> -n sveltehr-prod

# Check pod logs
kubectl logs <pod-name> -n sveltehr-prod
kubectl logs <pod-name> -n sveltehr-prod --previous  # Previous container instance

# Check resource limits
kubectl top pod <pod-name> -n sveltehr-prod
```

---

## Security Hardening

### Network Security

```bash
# Configure firewall (UFW example)
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp  # SSH
ufw allow 80/tcp  # HTTP (Let's Encrypt)
ufw allow 443/tcp # HTTPS
ufw allow 6443/tcp  # Kubernetes API (restrict to admin IPs in production)
ufw enable

# Restrict SSH to specific IPs (recommended)
ufw delete allow 22/tcp
ufw allow from <admin-ip> to any port 22 proto tcp
```

### Kubernetes RBAC

```bash
# Review cluster roles and bindings
kubectl get clusterroles
kubectl get clusterrolebindings

# Create read-only user for monitoring (example)
# See Kubernetes RBAC documentation for detailed setup
```

### Secret Rotation

```bash
# Rotate Doppler token (every 90 days recommended)
# 1. Generate new token in Doppler dashboard
# 2. Update Kubernetes secret
kubectl create secret generic doppler-token-secret \
  --from-literal=dopplerToken="NEW_TOKEN_HERE" \
  --namespace sveltehr-prod \
  --dry-run=client -o yaml | kubectl apply -f -

# 3. Restart External Secrets Operator
kubectl rollout restart deployment/external-secrets -n external-secrets-system

# Rotate Tailscale OAuth secret (similar process)
kubectl create secret generic operator-oauth \
  --from-literal=client_id="NEW_CLIENT_ID" \
  --from-literal=client_secret="NEW_CLIENT_SECRET" \
  --namespace tailscale \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl rollout restart deployment/operator -n tailscale
```

### TLS Certificate Management

```bash
# Check certificate expiration
kubectl get certificate --all-namespaces

# Force certificate renewal (if needed)
kubectl delete certificate sveltehr-prod-tls -n sveltehr-prod
# cert-manager will automatically recreate and issue new certificate

# Verify certificate validity
openssl s_client -connect hr.example.com:443 -servername hr.example.com < /dev/null 2>/dev/null | \
  openssl x509 -noout -dates
```

---

## Next Steps

After completing this setup:

1. **Configure Monitoring Alerts**: Set up Alertmanager notifications (email, Slack, PagerDuty)
2. **Set Up CI/CD**: Configure GitHub Actions for automated deployments
3. **Implement Logging**: Configure Loki log aggregation and Grafana dashboards
4. **Test Disaster Recovery**: Perform a full backup restore test to dev environment
5. **Document Custom Configurations**: Add any organization-specific settings to this guide
6. **Train Team**: Ensure team members understand ArgoCD, Velero, and troubleshooting procedures

---

## References

- **ArgoCD Documentation**: https://argo-cd.readthedocs.io/
- **Velero Documentation**: https://velero.io/docs/
- **CloudNativePG Documentation**: https://cloudnative-pg.io/documentation/
- **External Secrets Operator**: https://external-secrets.io/
- **Traefik Documentation**: https://doc.traefik.io/traefik/
- **cert-manager Documentation**: https://cert-manager.io/docs/
- **Kubernetes Best Practices**: https://kubernetes.io/docs/concepts/configuration/overview/

---

## Support & Troubleshooting

For issues not covered in this guide:

1. Check ArgoCD application logs: `argocd app logs <app-name>`
2. Check Kubernetes events: `kubectl get events --all-namespaces --sort-by='.lastTimestamp'`
3. Review component logs: `kubectl logs -n <namespace> deployment/<deployment-name>`
4. Consult official documentation for each component
5. Reach out to your team or infrastructure support

---

**End of Production Setup Guide**
