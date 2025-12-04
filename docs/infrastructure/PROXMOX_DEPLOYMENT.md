# SvelteHR Proxmox Deployment Guide

Complete guide for deploying SvelteHR on Proxmox 8.4.14 with K3s for both development and production environments.

## Table of Contents

1. [VM Creation in Proxmox](#1-vm-creation-in-proxmox)
2. [Ubuntu Server Setup](#2-ubuntu-server-setup)
3. [K3s Installation](#3-k3s-installation)
4. [Docker Image Registry](#4-docker-image-registry)
5. [Deploy SvelteHR](#5-deploy-sveltehr)
6. [Access & Monitoring](#6-access--monitoring)

---

## 1. VM Creation in Proxmox

### 1.1 Download Ubuntu Server ISO

In Proxmox web UI:

1. Navigate to your storage (e.g., `local`)
2. Go to **ISO Images** → **Download from URL**
3. URL: `https://releases.ubuntu.com/24.04/ubuntu-24.04.1-live-server-amd64.iso`

### 1.2 Create VM

**Proxmox Web UI** → **Create VM**:

```
General:
  VM ID: 100 (or your preference)
  Name: sveltehr-k3s

OS:
  ISO: ubuntu-24.04.1-live-server-amd64.iso
  Type: Linux
  Version: 6.x - 2.6 Kernel

System:
  QEMU Agent: ✅ Enabled
  BIOS: Default (SeaBIOS)
  Machine: q35

Disks:
  Bus/Device: SCSI
  Storage: local-lvm (or your storage)
  Disk size: 100 GB (minimum 50GB for full stack)
  Cache: Write back
  Discard: ✅ Enabled (for SSD TRIM)

CPU:
  Cores: 4 (minimum 2)
  Type: host

Memory:
  Memory: 8192 MB (8GB minimum for dev+prod)
  Ballooning: Disabled

Network:
  Bridge: vmbr0 (your network bridge)
  Model: VirtIO (paravirtualized)
  Firewall: ✅ Enabled (if desired)
```

### 1.3 Network Configuration (Optional Static IP)

If you want a static IP for your VM:

1. After VM creation, note the MAC address from Hardware → Network Device
2. Configure DHCP reservation on your router/DHCP server, OR
3. Configure static IP during Ubuntu installation

---

## 2. Ubuntu Server Setup

### 2.1 Install Ubuntu

Boot the VM and follow Ubuntu installer:

```bash
# Installation options:
- Language: English
- Keyboard: Your layout
- Network: Configure static IP or use DHCP
- Storage: Use entire disk (default)
- Profile:
    Name: k3s-admin (or your preference)
    Server name: sveltehr-k3s
    Username: k3s-admin
    Password: <secure password>
- SSH Setup: ✅ Install OpenSSH server
- Featured Server Snaps: None needed (we'll install manually)
```

### 2.2 Post-Installation Setup

SSH into your new VM:

```bash
ssh k3s-admin@<VM_IP>
```

Update system and install prerequisites:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y \
    curl \
    wget \
    git \
    qemu-guest-agent \
    nfs-common \
    open-iscsi \
    htop \
    net-tools

# Enable QEMU guest agent
sudo systemctl enable qemu-guest-agent
sudo systemctl start qemu-guest-agent

# Reboot to apply kernel updates
sudo reboot
```

### 2.3 Configure Firewall (UFW)

```bash
# Enable firewall
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow K3s API server
sudo ufw allow 6443/tcp

# Allow HTTP/HTTPS for ingress
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow NodePort range (optional, for NodePort services)
sudo ufw allow 30000:32767/tcp

# Check status
sudo ufw status verbose
```

---

## 3. K3s Installation

### 3.1 Install K3s

```bash
# Install K3s with embedded registry disabled (we'll use local Docker)
curl -sfL https://get.k3s.io | sh -s - \
    --disable traefik \
    --write-kubeconfig-mode 644 \
    --node-name sveltehr-k3s

# Verify installation
sudo systemctl status k3s

# Check nodes
sudo k3s kubectl get nodes
```

### 3.2 Configure kubectl Access

```bash
# Create .kube directory
mkdir -p ~/.kube

# Copy K3s config
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config

# Verify kubectl works
kubectl get nodes
kubectl cluster-info
```

### 3.3 Install Helm (for operator management)

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify
helm version
```

---

## 4. Docker Image Registry

You have two options for container images:

### Option A: Local Docker Registry on VM (Recommended for Development)

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Start local registry
docker run -d -p 5000:5000 --restart=always --name registry registry:2

# Configure K3s to use insecure registry
sudo mkdir -p /etc/rancher/k3s
sudo tee /etc/rancher/k3s/registries.yaml > /dev/null <<EOF
mirrors:
  "localhost:5000":
    endpoint:
      - "http://localhost:5000"
EOF

# Restart K3s
sudo systemctl restart k3s
```

### Option B: GitLab/GitHub Container Registry (Recommended for Production)

Configure registry credentials in k8s secrets (see deployment section).

---

## 5. Deploy SvelteHR

### 5.1 Clone Repository on VM

```bash
# Install Git LFS (if needed for large files)
sudo apt install git-lfs
git lfs install

# Clone your repository
cd ~
git clone https://github.com/yourusername/SvelteHR.git
cd SvelteHR
```

### 5.2 Build Docker Images Locally

Create a build script:

```bash
# k8s/scripts/build-and-push-local.sh
#!/bin/bash

REGISTRY="localhost:5000"
VERSION="${1:-latest}"

# Build backend image
echo "Building backend image..."
docker build -t ${REGISTRY}/sveltehr-backend:${VERSION} \
    -f ../graphql-rust-server/Dockerfile \
    ../graphql-rust-server/

# Build frontend image
echo "Building frontend image..."
docker build -t ${REGISTRY}/sveltehr-frontend:${VERSION} \
    -f Dockerfile \
    .

# Push to local registry
echo "Pushing images to local registry..."
docker push ${REGISTRY}/sveltehr-backend:${VERSION}
docker push ${REGISTRY}/sveltehr-frontend:${VERSION}

echo "Images built and pushed successfully!"
```

Make it executable and run:

```bash
chmod +x k8s/scripts/build-and-push-local.sh
./k8s/scripts/build-and-push-local.sh latest
```

### 5.3 Update Kustomization for Local Registry

Edit `k8s/base/kustomization.yaml`:

```yaml
images:
  - name: registry.gitlab.com/your-project/sveltehr/backend
    newName: localhost:5000/sveltehr-backend
    newTag: latest
  - name: registry.gitlab.com/your-project/sveltehr/frontend
    newName: localhost:5000/sveltehr-frontend
    newTag: latest
```

### 5.4 Install K8s Operators

```bash
cd ~/SvelteHR

# Install operators (PostgreSQL, Redis)
./k8s/deploy.sh dev install

# Wait for operators to be ready
kubectl wait --for=condition=available --timeout=300s \
    deployment/cnpg-controller-manager -n cnpg-system
```

### 5.5 Deploy Development Environment

```bash
# Deploy to dev namespace
./k8s/deploy.sh dev deploy

# Monitor deployment
kubectl get pods -n sveltehr-dev -w
```

### 5.6 Deploy Production Environment

```bash
# Deploy to prod namespace
./k8s/deploy.sh prod deploy

# Monitor deployment
kubectl get pods -n sveltehr-prod -w
```

---

## 6. Access & Monitoring

### 6.1 Install Traefik Ingress Controller

Since we disabled Traefik during K3s install, let's install it properly:

```bash
# Install Traefik via Helm
helm repo add traefik https://traefik.github.io/charts
helm repo update

# Install Traefik
helm install traefik traefik/traefik \
    --namespace kube-system \
    --set ports.web.nodePort=30080 \
    --set ports.websecure.nodePort=30443

# Verify
kubectl get svc -n kube-system traefik
```

### 6.2 Access Applications

**Development Environment:**

```bash
# Port forward frontend
kubectl port-forward -n sveltehr-dev svc/sveltehr-frontend 3000:3000

# Port forward backend
kubectl port-forward -n sveltehr-dev svc/sveltehr-backend 4000:4000

# Access:
# Frontend: http://<VM_IP>:3000
# Backend GraphQL: http://<VM_IP>:4000/graphql
```

**Production Environment:**

```bash
# Port forward frontend
kubectl port-forward -n sveltehr-prod svc/sveltehr-frontend 3001:3000

# Port forward backend
kubectl port-forward -n sveltehr-prod svc/sveltehr-backend 4001:4000

# Access:
# Frontend: http://<VM_IP>:3001
# Backend GraphQL: http://<VM_IP>:4001/graphql
```

### 6.3 Configure Ingress (Domain-Based Access)

Create an ingress for both environments:

```yaml
# k8s/ingress-all.yaml
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sveltehr-dev
  namespace: sveltehr-dev
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web
spec:
  rules:
    - host: dev.sveltehr.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: sveltehr-frontend
                port:
                  number: 3000
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: sveltehr-backend
                port:
                  number: 4000
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sveltehr-prod
  namespace: sveltehr-prod
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web
spec:
  rules:
    - host: sveltehr.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: sveltehr-frontend
                port:
                  number: 3000
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: sveltehr-backend
                port:
                  number: 4000
```

Apply ingress:

```bash
kubectl apply -f k8s/ingress-all.yaml
```

Add to your local `/etc/hosts`:

```
<VM_IP> dev.sveltehr.local
<VM_IP> sveltehr.local
```

Access:

- Dev: `http://dev.sveltehr.local`
- Prod: `http://sveltehr.local`

### 6.4 Monitoring Commands

```bash
# Get all resources in dev
kubectl get all -n sveltehr-dev

# Get all resources in prod
kubectl get all -n sveltehr-prod

# Check PostgreSQL cluster status
kubectl get cluster -n sveltehr-dev
kubectl get cluster -n sveltehr-prod

# Check Redis status
kubectl get redisfailover -n sveltehr-dev
kubectl get redisfailover -n sveltehr-prod

# View logs
kubectl logs -f deployment/sveltehr-frontend -n sveltehr-dev
kubectl logs -f deployment/sveltehr-backend -n sveltehr-dev

# Resource usage
kubectl top nodes
kubectl top pods -n sveltehr-dev
kubectl top pods -n sveltehr-prod
```

### 6.5 Install K9s (Optional but Recommended)

K9s is a terminal-based UI for Kubernetes:

```bash
# Install K9s
curl -sS https://webinstall.dev/k9s | bash
source ~/.config/envman/PATH.env

# Run K9s
k9s
```

---

## 7. Backup & Maintenance

### 7.1 Database Backups

CloudNativePG handles automatic backups. Configure S3/MinIO for backups:

```yaml
# Add to postgres-cluster.yaml
spec:
  backup:
    barmanObjectStore:
      destinationPath: s3://your-bucket/backups
      s3Credentials:
        accessKeyId:
          name: backup-credentials
          key: ACCESS_KEY_ID
        secretAccessKey:
          name: backup-credentials
          key: ACCESS_SECRET_KEY
```

### 7.2 VM Snapshots in Proxmox

Create snapshots before major changes:

```bash
# In Proxmox shell
qm snapshot <VMID> pre-deployment-$(date +%Y%m%d)
```

### 7.3 Update Applications

```bash
# Rebuild images
./k8s/scripts/build-and-push-local.sh v1.1.0

# Update kustomization.yaml with new tag
# Then apply
kubectl apply -k k8s/overlays/development
kubectl apply -k k8s/overlays/production

# Rolling restart
kubectl rollout restart deployment/sveltehr-frontend -n sveltehr-dev
kubectl rollout restart deployment/sveltehr-backend -n sveltehr-dev
```

---

## 8. Troubleshooting

### Pods not starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n sveltehr-dev

# Check events
kubectl get events -n sveltehr-dev --sort-by='.lastTimestamp'

# Check logs
kubectl logs <pod-name> -n sveltehr-dev --previous
```

### Image pull errors

```bash
# Check if registry is reachable
curl http://localhost:5000/v2/_catalog

# Manually pull image to debug
docker pull localhost:5000/sveltehr-frontend:latest
```

### Database connection issues

```bash
# Check PostgreSQL status
kubectl get cluster -n sveltehr-dev

# Check PostgreSQL logs
kubectl logs -n sveltehr-dev sveltehr-postgres-1

# Connect to PostgreSQL
kubectl exec -it -n sveltehr-dev sveltehr-postgres-1 -- psql -U app
```

### Network issues

```bash
# Test DNS resolution
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup sveltehr-backend.sveltehr-dev.svc.cluster.local

# Test service connectivity
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- curl http://sveltehr-backend.sveltehr-dev.svc.cluster.local:4000/health
```

---

## 9. Next Steps

1. **SSL/TLS**: Configure cert-manager for automatic HTTPS
2. **CI/CD**: Set up GitLab CI or GitHub Actions for automated deployments
3. **Monitoring**: Install Prometheus + Grafana for metrics
4. **Logging**: Set up EFK stack (Elasticsearch, Fluentd, Kibana)
5. **Backups**: Configure automated PostgreSQL backups to S3/MinIO

---

## Appendix: Resource Requirements

**Minimum VM Specs:**

- CPU: 2 cores
- RAM: 4GB
- Disk: 50GB

**Recommended VM Specs for Dev + Prod:**

- CPU: 4 cores
- RAM: 8GB
- Disk: 100GB
- Network: 1Gbps

**Per Environment Resource Usage (estimated):**

- PostgreSQL: 512MB-1GB RAM
- Redis: 256MB-512MB RAM
- Backend: 512MB-1GB RAM
- Frontend: 256MB-512MB RAM
- **Total per env**: ~2-3GB RAM

**With Dev + Prod + Operators**: 6-8GB RAM recommended
