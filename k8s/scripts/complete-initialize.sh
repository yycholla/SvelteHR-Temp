#!/bin/bash

# =============================================================================
# Complete System Initialization Script
# =============================================================================
# This script performs a fresh installation of SvelteHR with all dependencies
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
echo "🚀 SvelteHR Complete System Initialization"
echo "==========================================="
echo ""

# Check prerequisites
log "Checking prerequisites..."

if ! command -v kubectl &> /dev/null; then
    error "kubectl not found. Please install kubectl first."
    exit 1
fi

if ! command -v helm &> /dev/null; then
    error "Helm not found. Please install Helm 3.x first."
    exit 1
fi

if ! kubectl cluster-info &> /dev/null; then
    error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
    exit 1
fi

info "  ✓ kubectl installed"
info "  ✓ Helm installed"
info "  ✓ Kubernetes cluster accessible"

# Step 1: Add Helm repositories
log "Step 1/5: Adding Helm repositories..."
helm repo add cloudnative-pg https://cloudnative-pg.github.io/charts 2>/dev/null || info "  cloudnative-pg repo already exists"
helm repo add bitnami https://charts.bitnami.com/bitnami 2>/dev/null || info "  bitnami repo already exists"
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts 2>/dev/null || info "  prometheus-community repo already exists"
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx 2>/dev/null || info "  ingress-nginx repo already exists"
helm repo add jetstack https://charts.jetstack.io 2>/dev/null || info "  jetstack repo already exists"
helm repo add external-secrets https://charts.external-secrets.io 2>/dev/null || info "  external-secrets repo already exists"

log "Updating Helm repositories..."
helm repo update

info "  ✓ Helm repositories configured"

# Step 2: Install infrastructure (optional)
echo ""
read -p "Install infrastructure components (monitoring, ingress, cert-manager)? (yes/no): " install_infra

if [ "$install_infra" = "yes" ]; then
    log "Step 2/5: Installing infrastructure components..."

    # Monitoring
    info "Installing Prometheus monitoring stack..."
    if helm list -n monitoring | grep -q kube-prometheus-stack; then
        warn "  Prometheus already installed, skipping..."
    else
        helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
            --namespace monitoring \
            --create-namespace \
            --wait \
            --timeout 10m && info "  ✓ Prometheus installed" || warn "  ✗ Prometheus installation failed"
    fi

    # Ingress
    info "Installing ingress-nginx..."
    if helm list -n ingress-nginx | grep -q ingress-nginx; then
        warn "  ingress-nginx already installed, skipping..."
    else
        helm install ingress-nginx ingress-nginx/ingress-nginx \
            --namespace ingress-nginx \
            --create-namespace \
            --wait \
            --timeout 5m && info "  ✓ ingress-nginx installed" || warn "  ✗ ingress-nginx installation failed"
    fi

    # Cert-Manager
    info "Installing cert-manager..."
    if helm list -n cert-manager | grep -q cert-manager; then
        warn "  cert-manager already installed, skipping..."
    else
        helm install cert-manager jetstack/cert-manager \
            --namespace cert-manager \
            --create-namespace \
            --set installCRDs=true \
            --wait \
            --timeout 5m && info "  ✓ cert-manager installed" || warn "  ✗ cert-manager installation failed"
    fi

    info "  ✓ Infrastructure components installed"
else
    info "Step 2/5: Skipping infrastructure installation"
fi

# Step 3: Install CloudNativePG operator
log "Step 3/5: Installing CloudNativePG operator..."

if helm list -n cnpg-system | grep -q cloudnative-pg; then
    warn "  CloudNativePG operator already installed"
    read -p "  Upgrade to latest version? (yes/no): " upgrade_operator
    if [ "$upgrade_operator" = "yes" ]; then
        helm upgrade cloudnative-pg cloudnative-pg/cloudnative-pg \
            --namespace cnpg-system \
            --wait \
            --timeout 5m && info "  ✓ CloudNativePG operator upgraded"
    fi
else
    helm install cloudnative-pg cloudnative-pg/cloudnative-pg \
        --namespace cnpg-system \
        --create-namespace \
        --wait \
        --timeout 5m && info "  ✓ CloudNativePG operator installed"
fi

# Verify operator is ready
log "Waiting for CloudNativePG operator to be ready..."
kubectl wait --for=condition=available --timeout=120s \
    deployment/cloudnative-pg -n cnpg-system && info "  ✓ Operator ready"

# Step 4: Choose environment
echo ""
info "Step 4/5: Deploying SvelteHR application..."
echo ""
echo "Select environment:"
echo "  1) Development (values-dev.yaml)"
echo "  2) Production (values-prod.yaml)"
echo "  3) Both (dev and prod)"
read -p "Choice (1-3): " env_choice

case $env_choice in
    1)
        ENVIRONMENTS=("dev")
        ;;
    2)
        ENVIRONMENTS=("prod")
        ;;
    3)
        ENVIRONMENTS=("dev" "prod")
        ;;
    *)
        error "Invalid choice. Defaulting to development."
        ENVIRONMENTS=("dev")
        ;;
esac

# Step 5: Deploy application
log "Step 5/5: Deploying application..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K8S_DIR="$(dirname "$SCRIPT_DIR")"

for env in "${ENVIRONMENTS[@]}"; do
    info "Deploying to $env environment..."

    # Use the deploy script
    cd "$K8S_DIR"
    ./deploy.sh "$env" deploy

    info "  ✓ $env environment deployed"
done

# Summary
echo ""
log "✅ Initialization complete!"
echo ""

# Show access information
for env in "${ENVIRONMENTS[@]}"; do
    namespace="sveltehr-${env}"

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    info "Environment: $env"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    echo ""
    echo "Helm Release:"
    helm list -n "$namespace"

    echo ""
    echo "Pods:"
    kubectl get pods -n "$namespace"

    echo ""
    echo "Access Application:"
    if [ "$env" = "dev" ]; then
        echo "  Frontend: kubectl port-forward -n $namespace svc/sveltehr-frontend 5173:5173"
        echo "            Open: http://localhost:5173"
        echo ""
        echo "  Backend:  kubectl port-forward -n $namespace svc/sveltehr-backend 4000:4000"
        echo "            Open: http://localhost:4000"
    else
        echo "  Frontend: kubectl port-forward -n $namespace svc/sveltehr-frontend 3000:3000"
        echo "            Open: http://localhost:3000"
        echo ""
        echo "  Backend:  kubectl port-forward -n $namespace svc/sveltehr-backend 4000:4000"
        echo "            Open: http://localhost:4000"
    fi

    echo ""
    echo "Useful Commands:"
    echo "  Check status:  helm status sveltehr -n $namespace"
    echo "  View logs:     kubectl logs -f deployment/sveltehr-backend -n $namespace"
    echo "  Check DB:      kubectl get cluster -n $namespace"
    echo "  Run seed job:  helm test sveltehr -n $namespace --filter name=seed"
    echo ""
done

if [ "$install_infra" = "yes" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    info "Infrastructure Components"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Grafana (default: admin/prom-operator):"
    echo "  kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80"
    echo "  Open: http://localhost:3000"
    echo ""
fi

echo ""
info "🎉 System is ready to use!"
echo ""
