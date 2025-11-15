#!/bin/bash

################################################################################
# Kubernetes Backup-First Deployment Script
#
# This script automates the deployment of a Kubernetes cluster using existing
# Velero backups for data restoration.
#
# Version: 1.0.0
# Date: 2025-11-10
# Estimated Time: 1 hour 30 minutes
#
# Prerequisites:
#   - Ubuntu 22.04 LTS (or compatible)
#   - Root or sudo access
#   - Internet connectivity
#   - All required secrets ready (see config section below)
#
# Usage:
#   1. Edit the CONFIGURATION section below with your values
#   2. Run as root: sudo bash k8s-backup-restore-deploy.sh
#   3. Monitor progress and follow prompts
#
################################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

################################################################################
# CONFIGURATION - EDIT THESE VALUES BEFORE RUNNING
################################################################################

# Server Configuration
export PRODUCTION_DOMAIN="hr.mtncarerx.com"  # Your production domain
export TLS_EMAIL="chanway@hey.com"  # Email for Let's Encrypt notifications

# Kubernetes Configuration
export POD_NETWORK_CIDR="10.244.0.0/16"
export SERVICE_CIDR="10.96.0.0/12"

# Doppler Configuration (CRITICAL - manage most secrets)
export DOPPLER_TOKEN="dp.st.prod.mjZd22kkphrTEmaFXViwhxbRpachx0H0Zlz6NDi0kIn"  # dp.st.prod.xxxxx

# Tailscale OAuth Credentials
export TAILSCALE_CLIENT_ID="kAr6h6fe5811CNTRL"  # kxxxxxxxxx
export TAILSCALE_CLIENT_SECRET="tskey-client-kAr6h6fe5811CNTRL-S799JBkiof2gFEJ6Cs1uf28NnL55T9mVj"  # tskey-client-xxxxx

# GitHub Container Registry Credentials
export GHCR_USERNAME="yycholla"
export GHCR_PAT="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"  # ghp_xxxxx

# MinIO Backup Access (for accessing existing backups)
# Leave empty if MinIO data is on persistent storage already
export OLD_MINIO_ENDPOINT="minio-console.dropbear-elnath.ts.net"  # e.g., http://old-server-ip:9000
export OLD_MINIO_ACCESS_KEY="velero"
export OLD_MINIO_SECRET_KEY="HaR9HH4pD3BPeoGgQIMs6TLnhCRpio4="

# GitHub Repository
export GITHUB_REPO="https://github.com/Mountain-Care-Rx/SvelteHR.git"
export REPO_BRANCH="main"

# Script Behavior
export AUTO_CONFIRM=false  # Set to true to skip confirmation prompts
export VERBOSE=true  # Set to false for less output

################################################################################
# DO NOT EDIT BELOW THIS LINE UNLESS YOU KNOW WHAT YOU'RE DOING
################################################################################

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log file
LOG_FILE="/var/log/k8s-backup-restore-$(date +%Y%m%d-%H%M%S).log"

################################################################################
# HELPER FUNCTIONS
################################################################################

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1" | tee -a "$LOG_FILE"
}

confirm() {
    if [ "$AUTO_CONFIRM" = true ]; then
        return 0
    fi

    read -p "$1 (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_error "Operation cancelled by user"
        exit 1
    fi
}

check_prerequisite() {
    local cmd=$1
    local package=$2

    if ! command -v "$cmd" &> /dev/null; then
        log_error "$cmd is not installed. Please install $package first."
        exit 1
    fi
}

wait_for_pods() {
    local namespace=$1
    local label=$2
    local timeout=${3:-300}

    log_info "Waiting for pods with label '$label' in namespace '$namespace' to be ready (timeout: ${timeout}s)..."

    if kubectl wait --for=condition=ready pod -l "$label" -n "$namespace" --timeout="${timeout}s"; then
        log "Pods are ready"
        return 0
    else
        log_error "Pods did not become ready within timeout"
        return 1
    fi
}

################################################################################
# VALIDATION
################################################################################

validate_config() {
    log "Validating configuration..."

    local errors=0

    # Check required variables
    if [[ "$DOPPLER_TOKEN" == "REPLACE_WITH_ACTUAL_DOPPLER_TOKEN" ]]; then
        log_error "DOPPLER_TOKEN not configured"
        errors=$((errors + 1))
    fi

    if [[ "$TAILSCALE_CLIENT_ID" == "REPLACE_WITH_CLIENT_ID" ]]; then
        log_error "TAILSCALE_CLIENT_ID not configured"
        errors=$((errors + 1))
    fi

    if [[ "$TAILSCALE_CLIENT_SECRET" == "REPLACE_WITH_CLIENT_SECRET" ]]; then
        log_error "TAILSCALE_CLIENT_SECRET not configured"
        errors=$((errors + 1))
    fi

    if [[ "$GHCR_USERNAME" == "REPLACE_WITH_GITHUB_USERNAME" ]]; then
        log_error "GHCR_USERNAME not configured"
        errors=$((errors + 1))
    fi

    if [[ "$GHCR_PAT" == "REPLACE_WITH_GITHUB_PAT" ]]; then
        log_error "GHCR_PAT not configured"
        errors=$((errors + 1))
    fi

    if [ $errors -gt 0 ]; then
        log_error "Configuration validation failed with $errors error(s)"
        log_error "Please edit the CONFIGURATION section in this script"
        exit 1
    fi

    log "Configuration validated successfully"
}

check_prerequisites() {
    log "Checking prerequisites..."

    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        log_error "This script must be run as root"
        exit 1
    fi

    # Check OS
    if [ ! -f /etc/os-release ]; then
        log_error "Cannot detect OS version"
        exit 1
    fi

    source /etc/os-release
    if [[ ! "$ID" =~ ^(ubuntu|debian)$ ]]; then
        log_warning "This script is designed for Ubuntu/Debian. You're running $ID"
        confirm "Continue anyway?"
    fi

    # Check disk space
    local available_gb=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$available_gb" -lt 100 ]; then
        log_warning "Less than 100GB free disk space available (${available_gb}GB)"
        confirm "Continue anyway?"
    fi

    # Check RAM
    local total_ram_gb=$(free -g | awk 'NR==2 {print $2}')
    if [ "$total_ram_gb" -lt 16 ]; then
        log_warning "Less than 16GB RAM available (${total_ram_gb}GB)"
        confirm "Continue anyway?"
    fi

    log "Prerequisites check completed"
}

################################################################################
# PHASE 1: BASE INFRASTRUCTURE
################################################################################

install_base_packages() {
    log "Installing base packages..."

    export DEBIAN_FRONTEND=noninteractive

    apt-get update
    apt-get upgrade -y
    apt-get install -y \
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
        lsb-release \
        jq

    log "Base packages installed"
}

configure_system() {
    log "Configuring system for Kubernetes..."

    # Disable swap
    swapoff -a
    sed -i '/ swap / s/^/#/' /etc/fstab

    # Enable kernel modules
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

    log "System configured"
}

install_containerd() {
    log "Installing containerd..."

    apt-get install -y containerd

    mkdir -p /etc/containerd
    containerd config default | tee /etc/containerd/config.toml

    # Enable SystemdCgroup
    sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml

    systemctl restart containerd
    systemctl enable containerd

    # Verify containerd is running
    if systemctl is-active --quiet containerd; then
        log "containerd installed and running"
    else
        log_error "containerd failed to start"
        exit 1
    fi
}

install_kubernetes() {
    log "Installing Kubernetes components..."

    # Add Kubernetes repository
    curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.30/deb/Release.key | \
        gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

    echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.30/deb/ /' | \
        tee /etc/apt/sources.list.d/kubernetes.list

    apt-get update
    apt-get install -y kubelet kubeadm kubectl
    apt-mark hold kubelet kubeadm kubectl

    systemctl enable kubelet

    log "Kubernetes components installed"
}

initialize_cluster() {
    log "Initializing Kubernetes cluster..."

    local advertise_address=$(hostname -I | awk '{print $1}')

    kubeadm init \
        --pod-network-cidr="$POD_NETWORK_CIDR" \
        --service-cidr="$SERVICE_CIDR" \
        --apiserver-advertise-address="$advertise_address"

    # Configure kubectl for root
    mkdir -p $HOME/.kube
    cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
    chown $(id -u):$(id -g) $HOME/.kube/config

    log "Kubernetes cluster initialized"
    log_info "Cluster API server: https://$advertise_address:6443"
}

install_cni() {
    log "Installing Flannel CNI..."

    kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml

    wait_for_pods "kube-flannel" "app=flannel" 300

    log "Flannel CNI installed"
}

configure_single_node() {
    log "Configuring single-node cluster (removing control-plane taint)..."

    kubectl taint nodes --all node-role.kubernetes.io/control-plane- || true

    # Wait for node to be Ready
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if kubectl get nodes | grep -q "Ready"; then
            log "Node is Ready"
            return 0
        fi

        attempt=$((attempt + 1))
        sleep 10
    done

    log_error "Node did not become Ready within timeout"
    exit 1
}

install_helm() {
    log "Installing Helm..."

    curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

    # Add required Helm repositories
    helm repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts
    helm repo add minio https://charts.min.io/
    helm repo update

    log "Helm installed and repositories added"
}

create_namespaces() {
    log "Creating required namespaces..."

    kubectl create namespace backup-system
    kubectl create namespace sveltehr-prod
    kubectl create namespace sveltehr-dev

    log "Namespaces created"
}

deploy_minio() {
    log "Deploying MinIO for backup storage..."

    # Clone repository if not exists
    if [ ! -d "/root/SvelteHR" ]; then
        log_info "Cloning GitHub repository..."
        git clone "$GITHUB_REPO" /root/SvelteHR
        cd /root/SvelteHR
        git checkout "$REPO_BRANCH"
    else
        cd /root/SvelteHR
        git pull origin "$REPO_BRANCH"
    fi

    # Install MinIO
    helm install minio minio/minio \
        --namespace backup-system \
        --values k8s/helm-values/minio-values.yaml \
        --wait \
        --timeout 10m

    wait_for_pods "backup-system" "app=minio" 300

    log "MinIO deployed"
}

configure_minio_backup_access() {
    log "Configuring MinIO to access existing backups..."

    if [ -n "$OLD_MINIO_ENDPOINT" ] && [ -n "$OLD_MINIO_ACCESS_KEY" ] && [ -n "$OLD_MINIO_SECRET_KEY" ]; then
        log_info "Mirroring backups from old MinIO instance..."

        # Configure mc alias for old MinIO
        kubectl exec -n backup-system deployment/minio -- \
            mc alias set old-minio "$OLD_MINIO_ENDPOINT" "$OLD_MINIO_ACCESS_KEY" "$OLD_MINIO_SECRET_KEY"

        # Mirror backups
        kubectl exec -n backup-system deployment/minio -- \
            mc mirror old-minio/velero minio/velero

        log "Backups mirrored from old MinIO"
    else
        log_info "Assuming MinIO already has backup data (persistent storage)"
    fi

    # Verify backups exist
    if kubectl exec -n backup-system deployment/minio -- mc ls minio/velero/ &>/dev/null; then
        log "Verified: MinIO has access to backup data"
    else
        log_error "MinIO does not have access to backup data"
        log_error "Please check OLD_MINIO_* configuration or verify persistent storage"
        exit 1
    fi
}

create_velero_credentials() {
    log "Creating Velero credentials secret..."

    # Extract MinIO credentials
    local access_key=$(kubectl get secret -n backup-system minio -o jsonpath='{.data.accesskey}' | base64 -d)
    local secret_key=$(kubectl get secret -n backup-system minio -o jsonpath='{.data.secretkey}' | base64 -d)

    # Create credentials file
    cat <<EOF > /tmp/velero-credentials
[default]
aws_access_key_id=$access_key
aws_secret_access_key=$secret_key
EOF

    # Create Kubernetes secret
    kubectl create secret generic velero-credentials \
        --from-file=cloud=/tmp/velero-credentials \
        --namespace backup-system

    # Remove credentials file
    rm /tmp/velero-credentials

    log "Velero credentials created"
}

################################################################################
# PHASE 2: RESTORE FROM BACKUP
################################################################################

install_velero() {
    log "Installing Velero..."

    cd /root/SvelteHR

    helm install velero vmware-tanzu/velero \
        --namespace backup-system \
        --values k8s/helm-values/velero-values.yaml \
        --wait \
        --timeout 10m

    wait_for_pods "backup-system" "app.kubernetes.io/name=velero" 300

    # Install Velero CLI
    log_info "Installing Velero CLI..."
    wget -q https://github.com/vmware-tanzu/velero/releases/latest/download/velero-linux-amd64.tar.gz
    tar -xzf velero-linux-amd64.tar.gz
    mv velero-linux-amd64/velero /usr/local/bin/
    chmod +x /usr/local/bin/velero
    rm -rf velero-linux-amd64*

    # Verify Velero can access backups
    if velero backup-location get | grep -q "Available"; then
        log "Velero installed and backup location is available"
    else
        log_error "Velero backup location is not available"
        exit 1
    fi
}

restore_from_backup() {
    log "Restoring cluster from Velero backup..."

    # List available backups
    log_info "Available backups:"
    velero backup get

    # Get latest backup
    local latest_backup=$(velero backup get -o json | jq -r '.items | sort_by(.status.startTimestamp) | last | .metadata.name')

    if [ -z "$latest_backup" ] || [ "$latest_backup" = "null" ]; then
        log_error "No backups found in MinIO"
        exit 1
    fi

    log_info "Latest backup: $latest_backup"

    confirm "Restore from backup '$latest_backup'?"

    # Create restore
    local restore_name="full-cluster-restore-$(date +%Y%m%d-%H%M%S)"

    log "Starting restore: $restore_name"
    velero restore create "$restore_name" \
        --from-backup "$latest_backup" \
        --wait

    # Check restore status
    if velero restore describe "$restore_name" | grep -q "Phase: Completed"; then
        log "Restore completed successfully"
    else
        log_error "Restore failed or partially failed"
        log_error "Check logs with: velero restore logs $restore_name"
        exit 1
    fi
}

verify_restored_resources() {
    log "Verifying restored resources..."

    # Check namespaces
    log_info "Restored namespaces:"
    kubectl get namespaces | grep -vE "kube-|default|backup-system"

    # Check pods
    log_info "Checking pods in all namespaces..."
    local pending_pods=$(kubectl get pods --all-namespaces | grep -cE "Pending|Init|ContainerCreating" || true)

    if [ "$pending_pods" -gt 0 ]; then
        log_warning "$pending_pods pods are not yet Running"
        log_info "Waiting for pods to start (this may take 5-10 minutes)..."
        sleep 60
    fi

    # Check PostgreSQL clusters
    if kubectl get cluster --all-namespaces &>/dev/null; then
        log_info "PostgreSQL clusters:"
        kubectl get cluster --all-namespaces
    fi

    # Check PVCs
    log_info "Persistent Volume Claims:"
    kubectl get pvc --all-namespaces | grep -vE "kube-system"

    log "Resource verification completed"
}

################################################################################
# PHASE 3: POST-RESTORE CONFIGURATION
################################################################################

apply_critical_secrets() {
    log "Applying critical secrets..."

    # Doppler token
    log_info "Creating Doppler token secret..."
    kubectl create secret generic doppler-token-secret \
        --from-literal=dopplerToken="$DOPPLER_TOKEN" \
        --namespace sveltehr-prod \
        --dry-run=client -o yaml | kubectl apply -f -

    # Tailscale OAuth
    log_info "Creating Tailscale OAuth secret..."
    kubectl create secret generic operator-oauth \
        --from-literal=client_id="$TAILSCALE_CLIENT_ID" \
        --from-literal=client_secret="$TAILSCALE_CLIENT_SECRET" \
        --namespace tailscale \
        --dry-run=client -o yaml | kubectl apply -f -

    # GHCR pull secrets
    log_info "Creating GHCR pull secrets..."
    for ns in sveltehr-prod sveltehr-dev; do
        kubectl create secret docker-registry ghcr-pull-secret \
            --docker-server=ghcr.io \
            --docker-username="$GHCR_USERNAME" \
            --docker-password="$GHCR_PAT" \
            --namespace "$ns" \
            --dry-run=client -o yaml | kubectl apply -f -
    done

    log "Critical secrets applied"
}

restart_components() {
    log "Restarting critical components..."

    # Restart External Secrets Operator
    if kubectl get deployment external-secrets -n external-secrets-system &>/dev/null; then
        log_info "Restarting External Secrets Operator..."
        kubectl rollout restart deployment/external-secrets -n external-secrets-system
        kubectl rollout status deployment/external-secrets -n external-secrets-system --timeout=300s
    fi

    # Restart Tailscale Operator
    if kubectl get deployment operator -n tailscale &>/dev/null; then
        log_info "Restarting Tailscale Operator..."
        kubectl rollout restart deployment/operator -n tailscale
        kubectl rollout status deployment/operator -n tailscale --timeout=300s
    fi

    # Restart application deployments
    log_info "Restarting application deployments..."
    kubectl rollout restart deployment --all -n sveltehr-prod || true
    kubectl rollout restart deployment --all -n sveltehr-dev || true

    # Wait for pods to be ready
    log_info "Waiting for production pods to be ready (timeout: 10 minutes)..."
    kubectl wait --for=condition=ready pod --all -n sveltehr-prod --timeout=600s || log_warning "Some production pods did not become ready"

    log_info "Waiting for development pods to be ready (timeout: 10 minutes)..."
    kubectl wait --for=condition=ready pod --all -n sveltehr-dev --timeout=600s || log_warning "Some development pods did not become ready"

    log "Components restarted"
}

install_argocd() {
    log "Installing ArgoCD (optional)..."

    if ! confirm "Install ArgoCD for GitOps management?"; then
        log_info "Skipping ArgoCD installation"
        return 0
    fi

    kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -

    kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

    wait_for_pods "argocd" "app.kubernetes.io/name=argocd-server" 300

    # Get admin password
    local argocd_password=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)

    log "ArgoCD installed"
    log_info "ArgoCD Admin Password: $argocd_password"
    log_info "Save this password securely!"

    # Install ArgoCD CLI
    log_info "Installing ArgoCD CLI..."
    curl -sSL -o /usr/local/bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
    chmod +x /usr/local/bin/argocd

    log_info "To access ArgoCD UI:"
    log_info "  kubectl port-forward svc/argocd-server -n argocd 8080:443 --address 0.0.0.0"
    log_info "  Then browse to https://<server-ip>:8080"
}

################################################################################
# VERIFICATION
################################################################################

verify_deployment() {
    log "Verifying deployment..."

    local errors=0

    # Check nodes
    if kubectl get nodes | grep -q "Ready"; then
        log "✓ Node is Ready"
    else
        log_error "✗ Node is not Ready"
        errors=$((errors + 1))
    fi

    # Check system pods
    local system_pods_not_running=$(kubectl get pods -n kube-system | grep -vcE "Running|Completed" || true)
    if [ "$system_pods_not_running" -eq 1 ]; then  # Header line counts as 1
        log "✓ All system pods are running"
    else
        log_error "✗ Some system pods are not running"
        errors=$((errors + 1))
    fi

    # Check MinIO
    if kubectl get pods -n backup-system -l app=minio | grep -q "Running"; then
        log "✓ MinIO is running"
    else
        log_error "✗ MinIO is not running"
        errors=$((errors + 1))
    fi

    # Check Velero
    if kubectl get pods -n backup-system -l app.kubernetes.io/name=velero | grep -q "Running"; then
        log "✓ Velero is running"
    else
        log_error "✗ Velero is not running"
        errors=$((errors + 1))
    fi

    # Check backup schedules
    if velero schedule get | grep -q "Enabled"; then
        log "✓ Backup schedules are active"
    else
        log_warning "⚠ Backup schedules may not be active"
    fi

    # Check PostgreSQL
    if kubectl get cluster -n sveltehr-prod &>/dev/null; then
        log "✓ PostgreSQL cluster exists in production"
    else
        log_error "✗ PostgreSQL cluster not found in production"
        errors=$((errors + 1))
    fi

    # Check production pods
    local prod_pods_running=$(kubectl get pods -n sveltehr-prod | grep -c "Running" || true)
    if [ "$prod_pods_running" -gt 0 ]; then
        log "✓ Production application pods are running ($prod_pods_running pods)"
    else
        log_error "✗ No production pods running"
        errors=$((errors + 1))
    fi

    if [ $errors -eq 0 ]; then
        log "Verification completed successfully!"
        return 0
    else
        log_error "Verification completed with $errors error(s)"
        return 1
    fi
}

################################################################################
# MAIN EXECUTION
################################################################################

main() {
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║   Kubernetes Backup-First Deployment Script                   ║"
    echo "║   Version: 1.0.0                                               ║"
    echo "║   Estimated Time: 1 hour 30 minutes                            ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""

    log "Starting deployment at $(date)"
    log "Log file: $LOG_FILE"

    # Pre-deployment checks
    validate_config
    check_prerequisites

    confirm "Continue with deployment?"

    # Phase 1: Base Infrastructure (45 minutes)
    log "=== PHASE 1: BASE INFRASTRUCTURE (45 minutes) ==="
    install_base_packages
    configure_system
    install_containerd
    install_kubernetes
    initialize_cluster
    install_cni
    configure_single_node
    install_helm
    create_namespaces
    deploy_minio
    configure_minio_backup_access
    create_velero_credentials

    # Phase 2: Restore from Backup (30 minutes)
    log "=== PHASE 2: RESTORE FROM BACKUP (30 minutes) ==="
    install_velero
    restore_from_backup
    verify_restored_resources

    # Phase 3: Post-Restore Configuration (15 minutes)
    log "=== PHASE 3: POST-RESTORE CONFIGURATION (15 minutes) ==="
    apply_critical_secrets
    restart_components
    install_argocd

    # Final verification
    log "=== FINAL VERIFICATION ==="
    verify_deployment

    # Summary
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║   DEPLOYMENT COMPLETED SUCCESSFULLY!                           ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    log "Deployment completed at $(date)"
    log "Total deployment time: $SECONDS seconds"

    echo ""
    echo "Next Steps:"
    echo "  1. Test application access: https://$PRODUCTION_DOMAIN"
    echo "  2. Verify database connectivity"
    echo "  3. Check monitoring dashboards (Prometheus, Grafana)"
    echo "  4. Review logs: $LOG_FILE"
    echo ""
    echo "Useful commands:"
    echo "  kubectl get pods --all-namespaces"
    echo "  kubectl get cluster --all-namespaces"
    echo "  velero backup get"
    echo "  velero schedule get"
    echo ""
}

# Run main function
main "$@"
