#!/bin/bash

################################################################################
# Kubernetes Backup-First Deployment - RESUME Script
#
# This script resumes deployment from where it left off, skipping already
# completed infrastructure setup.
#
# Use this when:
#   - Kubernetes cluster is already initialized
#   - You need to continue from MinIO/Velero deployment
#   - Previous deployment script failed partway through
#
# Version: 1.0.0
# Date: 2025-11-10
#
# Usage:
#   export KUBECONFIG=/etc/kubernetes/admin.conf
#   bash k8s-resume-deployment.sh
#
################################################################################

set -e
set -u
set -o pipefail

################################################################################
# CONFIGURATION - EDIT THESE VALUES BEFORE RUNNING
################################################################################

# Server Configuration
export PRODUCTION_DOMAIN="hr.example.com"
export TLS_EMAIL="admin@example.com"

# Doppler Configuration (CRITICAL)
export DOPPLER_TOKEN="REPLACE_WITH_ACTUAL_DOPPLER_TOKEN"  # dp.st.prod.xxxxx

# Tailscale OAuth Credentials
export TAILSCALE_CLIENT_ID="REPLACE_WITH_CLIENT_ID"  # kxxxxxxxxx
export TAILSCALE_CLIENT_SECRET="REPLACE_WITH_CLIENT_SECRET"  # tskey-client-xxxxx

# GitHub Container Registry Credentials
export GHCR_USERNAME="REPLACE_WITH_GITHUB_USERNAME"
export GHCR_PAT="REPLACE_WITH_GITHUB_PAT"  # ghp_xxxxx

# MinIO Backup Access (for accessing existing backups)
export OLD_MINIO_ENDPOINT=""  # e.g., http://old-server-ip:9000
export OLD_MINIO_ACCESS_KEY=""
export OLD_MINIO_SECRET_KEY=""

# GitHub Repository
export GITHUB_REPO="https://github.com/Mountain-Care-Rx/SvelteHR.git"
export REPO_BRANCH="main"

# Script Behavior
export AUTO_CONFIRM=false
export VERBOSE=true

################################################################################
# DO NOT EDIT BELOW THIS LINE
################################################################################

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

LOG_FILE="/var/log/k8s-resume-$(date +%Y%m%d-%H%M%S).log"

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

wait_for_pods() {
    local namespace=$1
    local label=$2
    local timeout=${3:-300}

    log_info "Waiting for pods with label '$label' in namespace '$namespace' (timeout: ${timeout}s)..."

    if kubectl wait --for=condition=ready pod -l "$label" -n "$namespace" --timeout="${timeout}s" 2>/dev/null; then
        log "Pods are ready"
        return 0
    else
        log_error "Pods did not become ready within timeout"
        return 1
    fi
}

validate_config() {
    log "Validating configuration..."

    local errors=0

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
        exit 1
    fi

    log "Configuration validated successfully"
}

check_kubernetes() {
    log "Checking Kubernetes cluster status..."

    # Check if kubectl is configured
    if ! kubectl cluster-info &>/dev/null; then
        log_error "kubectl is not configured or cluster is not accessible"
        log_error "Make sure KUBECONFIG is set: export KUBECONFIG=/etc/kubernetes/admin.conf"
        exit 1
    fi

    # Check if node is Ready
    if ! kubectl get nodes | grep -q "Ready"; then
        log_error "Kubernetes node is not Ready"
        exit 1
    fi

    log "✓ Kubernetes cluster is running and healthy"
}

configure_single_node() {
    log "Configuring single-node cluster..."

    # Check if already configured
    if kubectl describe node | grep -q "Taints:.*<none>"; then
        log_info "Node already configured (no taints)"
        return 0
    fi

    kubectl taint nodes --all node-role.kubernetes.io/control-plane- || true
    log "Single-node configuration completed"
}

install_helm() {
    log "Installing Helm..."

    if command -v helm &> /dev/null; then
        log_info "Helm already installed: $(helm version --short)"
        helm repo update
        return 0
    fi

    curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

    helm repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts
    helm repo add minio https://charts.min.io/
    helm repo update

    log "Helm installed and repositories added"
}

create_namespaces() {
    log "Creating required namespaces..."

    kubectl create namespace backup-system --dry-run=client -o yaml | kubectl apply -f -
    kubectl create namespace sveltehr-prod --dry-run=client -o yaml | kubectl apply -f -
    kubectl create namespace sveltehr-dev --dry-run=client -o yaml | kubectl apply -f -

    log "Namespaces created"
}

deploy_minio() {
    log "Deploying MinIO..."

    # Check if already deployed
    if kubectl get deployment minio -n backup-system &>/dev/null; then
        log_info "MinIO already deployed"
        return 0
    fi

    # Clone repository if not exists
    if [ ! -d "/root/SvelteHR" ]; then
        log_info "Cloning GitHub repository..."
        git clone "$GITHUB_REPO" /root/SvelteHR
        cd /root/SvelteHR
        git checkout "$REPO_BRANCH"
    else
        cd /root/SvelteHR
        git pull origin "$REPO_BRANCH" || true
    fi

    helm install minio minio/minio \
        --namespace backup-system \
        --values k8s/helm-values/minio-values.yaml \
        --wait \
        --timeout 10m

    wait_for_pods "backup-system" "app=minio" 300

    log "MinIO deployed"
}

configure_minio_backup_access() {
    log "Configuring MinIO backup access..."

    if [ -n "$OLD_MINIO_ENDPOINT" ] && [ -n "$OLD_MINIO_ACCESS_KEY" ] && [ -n "$OLD_MINIO_SECRET_KEY" ]; then
        log_info "Mirroring backups from old MinIO instance..."

        kubectl exec -n backup-system deployment/minio -- \
            mc alias set old-minio "$OLD_MINIO_ENDPOINT" "$OLD_MINIO_ACCESS_KEY" "$OLD_MINIO_SECRET_KEY"

        kubectl exec -n backup-system deployment/minio -- \
            mc mirror old-minio/velero minio/velero

        log "Backups mirrored from old MinIO"
    else
        log_info "Assuming MinIO already has backup data"
    fi

    if kubectl exec -n backup-system deployment/minio -- mc ls minio/velero/ &>/dev/null; then
        log "✓ MinIO has access to backup data"
    else
        log_error "MinIO does not have access to backup data"
        exit 1
    fi
}

create_velero_credentials() {
    log "Creating Velero credentials..."

    # Check if already exists
    if kubectl get secret velero-credentials -n backup-system &>/dev/null; then
        log_info "Velero credentials already exist"
        return 0
    fi

    local access_key=$(kubectl get secret -n backup-system minio -o jsonpath='{.data.accesskey}' | base64 -d)
    local secret_key=$(kubectl get secret -n backup-system minio -o jsonpath='{.data.secretkey}' | base64 -d)

    cat <<EOF > /tmp/velero-credentials
[default]
aws_access_key_id=$access_key
aws_secret_access_key=$secret_key
EOF

    kubectl create secret generic velero-credentials \
        --from-file=cloud=/tmp/velero-credentials \
        --namespace backup-system

    rm /tmp/velero-credentials

    log "Velero credentials created"
}

install_velero() {
    log "Installing Velero..."

    # Check if already installed
    if kubectl get deployment velero -n backup-system &>/dev/null; then
        log_info "Velero already installed"
    else
        cd /root/SvelteHR

        helm install velero vmware-tanzu/velero \
            --namespace backup-system \
            --values k8s/helm-values/velero-values.yaml \
            --wait \
            --timeout 10m

        wait_for_pods "backup-system" "app.kubernetes.io/name=velero" 300
    fi

    # Install Velero CLI
    if ! command -v velero &> /dev/null; then
        log_info "Installing Velero CLI..."
        wget -q https://github.com/vmware-tanzu/velero/releases/latest/download/velero-linux-amd64.tar.gz
        tar -xzf velero-linux-amd64.tar.gz
        mv velero-linux-amd64/velero /usr/local/bin/
        chmod +x /usr/local/bin/velero
        rm -rf velero-linux-amd64*
    fi

    if velero backup-location get | grep -q "Available"; then
        log "✓ Velero installed and backup location available"
    else
        log_error "Velero backup location is not available"
        exit 1
    fi
}

restore_from_backup() {
    log "Restoring cluster from Velero backup..."

    log_info "Available backups:"
    velero backup get

    local latest_backup=$(velero backup get -o json | jq -r '.items | sort_by(.status.startTimestamp) | last | .metadata.name')

    if [ -z "$latest_backup" ] || [ "$latest_backup" = "null" ]; then
        log_error "No backups found"
        exit 1
    fi

    log_info "Latest backup: $latest_backup"
    confirm "Restore from backup '$latest_backup'?"

    local restore_name="resume-restore-$(date +%Y%m%d-%H%M%S)"

    log "Starting restore: $restore_name"
    velero restore create "$restore_name" \
        --from-backup "$latest_backup" \
        --wait

    if velero restore describe "$restore_name" | grep -q "Phase: Completed"; then
        log "✓ Restore completed successfully"
    else
        log_error "Restore failed or partially failed"
        velero restore logs "$restore_name" | tail -50
        exit 1
    fi
}

apply_critical_secrets() {
    log "Applying critical secrets..."

    kubectl create secret generic doppler-token-secret \
        --from-literal=dopplerToken="$DOPPLER_TOKEN" \
        --namespace sveltehr-prod \
        --dry-run=client -o yaml | kubectl apply -f -

    kubectl create secret generic operator-oauth \
        --from-literal=client_id="$TAILSCALE_CLIENT_ID" \
        --from-literal=client_secret="$TAILSCALE_CLIENT_SECRET" \
        --namespace tailscale \
        --dry-run=client -o yaml | kubectl apply -f -

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

    if kubectl get deployment external-secrets -n external-secrets-system &>/dev/null; then
        kubectl rollout restart deployment/external-secrets -n external-secrets-system
        kubectl rollout status deployment/external-secrets -n external-secrets-system --timeout=300s || true
    fi

    if kubectl get deployment operator -n tailscale &>/dev/null; then
        kubectl rollout restart deployment/operator -n tailscale
        kubectl rollout status deployment/operator -n tailscale --timeout=300s || true
    fi

    kubectl rollout restart deployment --all -n sveltehr-prod || true
    kubectl rollout restart deployment --all -n sveltehr-dev || true

    log_info "Waiting for pods to be ready (this may take several minutes)..."
    kubectl wait --for=condition=ready pod --all -n sveltehr-prod --timeout=600s || log_warning "Some production pods did not become ready"
    kubectl wait --for=condition=ready pod --all -n sveltehr-dev --timeout=600s || log_warning "Some development pods did not become ready"

    log "Components restarted"
}

verify_deployment() {
    log "Verifying deployment..."

    local errors=0

    if kubectl get nodes | grep -q "Ready"; then
        log "✓ Node is Ready"
    else
        log_error "✗ Node is not Ready"
        errors=$((errors + 1))
    fi

    if kubectl get pods -n backup-system -l app=minio | grep -q "Running"; then
        log "✓ MinIO is running"
    else
        log_error "✗ MinIO is not running"
        errors=$((errors + 1))
    fi

    if kubectl get pods -n backup-system -l app.kubernetes.io/name=velero | grep -q "Running"; then
        log "✓ Velero is running"
    else
        log_error "✗ Velero is not running"
        errors=$((errors + 1))
    fi

    if velero schedule get | grep -q "Enabled"; then
        log "✓ Backup schedules are active"
    else
        log_warning "⚠ Backup schedules may not be active"
    fi

    if kubectl get cluster -n sveltehr-prod &>/dev/null; then
        log "✓ PostgreSQL cluster exists"
    else
        log_error "✗ PostgreSQL cluster not found"
        errors=$((errors + 1))
    fi

    local prod_pods=$(kubectl get pods -n sveltehr-prod | grep -c "Running" || true)
    if [ "$prod_pods" -gt 0 ]; then
        log "✓ Production pods running ($prod_pods pods)"
    else
        log_error "✗ No production pods running"
        errors=$((errors + 1))
    fi

    if [ $errors -eq 0 ]; then
        log "✓ Verification completed successfully!"
        return 0
    else
        log_error "Verification completed with $errors error(s)"
        return 1
    fi
}

main() {
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║   Kubernetes Deployment Resume Script                         ║"
    echo "║   Continues from existing cluster installation                ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""

    log "Starting resume deployment at $(date)"
    log "Log file: $LOG_FILE"

    validate_config
    check_kubernetes

    confirm "Continue with deployment?"

    configure_single_node
    install_helm
    create_namespaces
    deploy_minio
    configure_minio_backup_access
    create_velero_credentials
    install_velero
    restore_from_backup
    apply_critical_secrets
    restart_components
    verify_deployment

    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║   DEPLOYMENT COMPLETED SUCCESSFULLY!                           ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    log "Deployment completed at $(date)"

    echo ""
    echo "Next Steps:"
    echo "  1. Test application: https://$PRODUCTION_DOMAIN"
    echo "  2. Verify database connectivity"
    echo "  3. Check monitoring (Prometheus, Grafana)"
    echo ""
}

main "$@"
