#!/bin/bash

# =============================================================================
# Complete System Teardown Script
# =============================================================================
# This script removes ALL SvelteHR components from the cluster
# WARNING: This deletes all data! Make backups first!
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Banner
echo ""
echo "🗑️  SvelteHR Complete System Teardown"
echo "======================================"
echo ""

# Confirm with user
warn "⚠️  WARNING: This will DELETE ALL SvelteHR resources and data!"
warn "⚠️  This includes:"
warn "     - All application deployments"
warn "     - All databases (PostgreSQL + Redis)"
warn "     - All persistent data"
warn "     - All configuration"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    error "Aborted. No changes made."
    exit 0
fi

echo ""

# Step 1: Remove applications
log "Step 1/6: Removing Helm releases..."
helm uninstall sveltehr -n sveltehr-dev 2>/dev/null && info "  ✓ Removed sveltehr-dev" || warn "  ✗ sveltehr-dev not found"
helm uninstall sveltehr -n sveltehr-prod 2>/dev/null && info "  ✓ Removed sveltehr-prod" || warn "  ✗ sveltehr-prod not found"

# Step 2: Delete namespaces
log "Step 2/6: Deleting application namespaces..."
kubectl delete namespace sveltehr-dev --ignore-not-found=true && info "  ✓ Deleted sveltehr-dev namespace" || true
kubectl delete namespace sveltehr-prod --ignore-not-found=true && info "  ✓ Deleted sveltehr-prod namespace" || true

info "  Waiting for namespaces to fully terminate (this may take 30-60 seconds)..."
timeout 120 bash -c 'while kubectl get namespace sveltehr-dev 2>/dev/null; do sleep 2; done' || warn "  Namespace still terminating..."

# Step 3: Remove operators
log "Step 3/6: Removing CloudNativePG operator..."
helm uninstall cloudnative-pg -n cnpg-system 2>/dev/null && info "  ✓ Removed CloudNativePG operator" || warn "  ✗ Operator not found"
kubectl delete namespace cnpg-system --ignore-not-found=true && info "  ✓ Deleted cnpg-system namespace" || true

# Optional: Remove CloudNativePG CRDs
read -p "Remove CloudNativePG CRDs? (you'll need to reinstall for next deploy) (yes/no): " remove_crds
if [ "$remove_crds" = "yes" ]; then
    log "Removing CloudNativePG CRDs..."
    kubectl delete crd clusters.postgresql.cnpg.io --ignore-not-found=true
    kubectl delete crd backups.postgresql.cnpg.io --ignore-not-found=true
    kubectl delete crd scheduledbackups.postgresql.cnpg.io --ignore-not-found=true
    kubectl delete crd poolers.postgresql.cnpg.io --ignore-not-found=true
    info "  ✓ CRDs removed"
fi

# Step 4: Optional infrastructure removal
echo ""
read -p "Remove infrastructure components (monitoring, ingress, cert-manager)? (yes/no): " remove_infra

if [ "$remove_infra" = "yes" ]; then
    log "Step 4/6: Removing infrastructure components..."

    # Monitoring
    helm uninstall kube-prometheus-stack -n monitoring 2>/dev/null && info "  ✓ Removed Prometheus" || warn "  ✗ Prometheus not found"
    helm uninstall prometheus -n monitoring 2>/dev/null || true
    kubectl delete namespace monitoring --ignore-not-found=true && info "  ✓ Deleted monitoring namespace" || true

    # Ingress
    helm uninstall ingress-nginx -n ingress-nginx 2>/dev/null && info "  ✓ Removed ingress-nginx" || warn "  ✗ ingress-nginx not found"
    kubectl delete namespace ingress-nginx --ignore-not-found=true && info "  ✓ Deleted ingress-nginx namespace" || true

    # Cert-Manager
    helm uninstall cert-manager -n cert-manager 2>/dev/null && info "  ✓ Removed cert-manager" || warn "  ✗ cert-manager not found"
    kubectl delete namespace cert-manager --ignore-not-found=true && info "  ✓ Deleted cert-manager namespace" || true

    # External Secrets
    helm uninstall external-secrets -n external-secrets-system 2>/dev/null && info "  ✓ Removed external-secrets" || warn "  ✗ external-secrets not found"
    kubectl delete namespace external-secrets-system --ignore-not-found=true || true
else
    info "Step 4/6: Skipping infrastructure removal (keeping monitoring, ingress, cert-manager)"
fi

# Step 5: Clean up persistent volumes
log "Step 5/6: Cleaning up persistent volumes..."
released_pvs=$(kubectl get pv | grep Released | awk '{print $1}')
if [ -n "$released_pvs" ]; then
    echo "$released_pvs" | xargs kubectl delete pv
    info "  ✓ Deleted released PVs"
else
    info "  No released PVs to clean up"
fi

# Step 6: Verify cleanup
log "Step 6/6: Verifying cleanup..."

echo ""
info "Checking for remaining resources:"

# Check Helm releases
remaining_releases=$(helm list --all-namespaces | grep sveltehr || true)
if [ -z "$remaining_releases" ]; then
    info "  ✓ No Helm releases remaining"
else
    warn "  ✗ Found remaining Helm releases:"
    echo "$remaining_releases"
fi

# Check namespaces
remaining_namespaces=$(kubectl get namespaces | grep -E "sveltehr" || true)
if [ -z "$remaining_namespaces" ]; then
    info "  ✓ No sveltehr namespaces remaining"
else
    warn "  ✗ Found remaining namespaces:"
    echo "$remaining_namespaces"
fi

# Check pods
remaining_pods=$(kubectl get pods --all-namespaces | grep sveltehr || true)
if [ -z "$remaining_pods" ]; then
    info "  ✓ No sveltehr pods remaining"
else
    warn "  ✗ Found remaining pods:"
    echo "$remaining_pods"
fi

# Check PVs
remaining_pvs=$(kubectl get pv | grep -E "sveltehr" || true)
if [ -z "$remaining_pvs" ]; then
    info "  ✓ No sveltehr PVs remaining"
else
    warn "  ✗ Found remaining PVs:"
    echo "$remaining_pvs"
fi

echo ""
log "✅ Teardown complete!"
echo ""
info "To reinitialize the system, run:"
info "  cd k8s"
info "  ./deploy.sh dev deploy"
echo ""
info "Or for a fresh installation with infrastructure:"
info "  ./scripts/complete-initialize.sh"
echo ""
