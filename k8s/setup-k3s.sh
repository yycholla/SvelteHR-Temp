#!/bin/bash

# SvelteHR k3s Configuration Script
# Run this to configure kubectl for k3s instead of minikube

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

# Check if k3s is installed and running
check_k3s() {
    log "Checking k3s installation..."

    # Check if k3s config exists
    if [ ! -f /etc/rancher/k3s/k3s.yaml ]; then
        error "k3s kubeconfig not found at /etc/rancher/k3s/k3s.yaml"
        echo "Please ensure k3s is properly installed."
        exit 1
    fi

    # Try to check if k3s is running (may require sudo)
    if command -v systemctl &> /dev/null; then
        if ! systemctl is-active --quiet k3s 2>/dev/null; then
            warn "k3s service may not be running. If kubectl commands fail, run:"
            echo "sudo systemctl start k3s"
        fi
    fi

    log "k3s configuration found."
}

# Configure kubectl for k3s
configure_kubectl() {
    log "Configuring kubectl for k3s..."

    # Create .kube directory if it doesn't exist
    mkdir -p ~/.kube

    # Copy k3s kubeconfig (may require sudo)
    if [ -f ~/.kube/config ]; then
        warn "Existing kubeconfig found. Backing up..."
        cp ~/.kube/config ~/.kube/config.backup.$(date +%Y%m%d_%H%M%S)
    fi

    info "Copying k3s kubeconfig. You may be prompted for sudo password:"
    sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
    sudo chown $(id -u):$(id -g) ~/.kube/config

    # Update server URL to use localhost if needed
    sed -i 's|https://127.0.0.1:6443|https://127.0.0.1:6443|g' ~/.kube/config

    log "kubectl configured for k3s."
}

# Stop and disable minikube if running
cleanup_minikube() {
    log "Checking for minikube..."

    if command -v minikube &> /dev/null; then
        if minikube status &> /dev/null; then
            warn "Stopping minikube cluster..."
            minikube stop
            minikube delete
        fi
    fi
}

# Verify configuration
verify_setup() {
    log "Verifying k3s configuration..."

    # Check kubectl context
    info "Current kubectl context:"
    kubectl config current-context

    # Check nodes
    info "Cluster nodes:"
    kubectl get nodes

    # Check cluster info
    info "Cluster info:"
    kubectl cluster-info

    log "k3s configuration verified!"
}

# Show next steps
show_next_steps() {
    log "Configuration complete! Next steps:"

    echo ""
    echo "1. Deploy SvelteHR operators:"
    echo "   ./k8s/deploy.sh dev install"
    echo ""
    echo "2. Deploy SvelteHR application:"
    echo "   ./k8s/deploy.sh dev deploy"
    echo ""
    echo "3. Access your application:"
    echo "   kubectl port-forward -n sveltehr-dev svc/sveltehr-frontend 3000:3000"
    echo "   Visit: http://localhost:3000"
    echo ""
    echo "4. View k3s dashboard:"
    echo "   kubectl port-forward -n kube-system svc/kubernetes-dashboard 8443:443"
    echo "   Visit: https://localhost:8443"
}

# Main execution
main() {
    echo "SvelteHR k3s Configuration"
    echo "=========================="

    check_k3s
    cleanup_minikube
    configure_kubectl
    verify_setup
    show_next_steps
}

main "$@"