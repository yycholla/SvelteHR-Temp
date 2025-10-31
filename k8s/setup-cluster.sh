#!/bin/bash

# SvelteHR Kubernetes Cluster Setup Script
# Run this after installing minikube and kubectl

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

# Check if commands exist
check_commands() {
    log "Checking for required commands..."

    if ! command -v minikube &> /dev/null; then
        error "minikube is not installed. Please install it first:"
        echo "curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64"
        echo "sudo install minikube-linux-amd64 /usr/local/bin/minikube"
        exit 1
    fi

    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed. Please install it first:"
        echo "sudo pacman -S kubectl  # For Arch Linux"
        exit 1
    fi

    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    log "All required commands found."
}

# Start minikube cluster
start_cluster() {
    log "Starting minikube cluster..."

    # Check if cluster is already running
    if minikube status &> /dev/null; then
        info "Minikube cluster is already running."
        return
    fi

    # Start with Docker driver and increased resources
    minikube start \
        --driver=docker \
        --cpus=2 \
        --memory=4096 \
        --disk-size=20g \
        --kubernetes-version=stable

    log "Minikube cluster started successfully."
}

# Fix DNS resolution
fix_dns() {
    log "Configuring DNS resolution..."

    # Minikube's default DNS (192.168.49.1) may fail on some systems
    # Use Google DNS (8.8.8.8) and Cloudflare DNS (1.1.1.1) instead
    minikube ssh "sudo bash -c 'echo \"nameserver 8.8.8.8\" > /etc/resolv.conf && echo \"nameserver 1.1.1.1\" >> /etc/resolv.conf'" 2>/dev/null || warn "DNS configuration may have failed"

    # Test DNS resolution
    if minikube ssh "nslookup registry.k8s.io" &>/dev/null; then
        log "DNS resolution working correctly"
    else
        warn "DNS resolution may have issues"
    fi
}

# Enable required addons
enable_addons() {
    log "Enabling required minikube addons..."

    # Try to enable metrics-server (usually works)
    minikube addons enable metrics-server || warn "metrics-server addon failed"

    # Try to enable ingress (may fail due to kernel modules)
    info "Attempting to enable ingress addon..."
    info "Note: This may fail if your kernel is missing xt_comment module"

    if timeout 60s minikube addons enable ingress 2>/dev/null; then
        log "Ingress addon enabled successfully"
    else
        warn "Ingress addon failed to enable"
        warn "This is likely due to missing kernel module (xt_comment)"
        warn "You can still deploy and use port-forwarding for access"
        warn "See k8s/KERNEL_ISSUE_WORKAROUND.md for details"
    fi
}

# Verify cluster
verify_cluster() {
    log "Verifying cluster setup..."

    # Check cluster status
    info "Cluster status:"
    minikube status

    echo ""

    # Check nodes
    info "Cluster nodes:"
    kubectl get nodes

    echo ""

    # Check running pods
    info "System pods:"
    kubectl get pods -A --field-selector=status.phase=Running | head -10

    echo ""

    # Check ingress
    info "Ingress controller:"
    kubectl get pods -n ingress-nginx

    log "Cluster verification completed."
}

# Show access information
show_access() {
    log "Cluster access information:"

    echo ""
    echo "Minikube cluster is ready!"
    echo ""
    echo "Next steps:"
    echo "1. Build container images: ./k8s/scripts/build-images.sh"
    echo "2. Install operators: ./k8s/deploy.sh dev install"
    echo "3. Deploy application: ./k8s/deploy.sh dev deploy"
    echo ""
    echo "Additional commands:"
    echo "  Dashboard: minikube dashboard"
    echo "  Get cluster IP: minikube ip"
    echo "  Stop cluster: minikube stop"
    echo "  Delete cluster: minikube delete"
}

# Main execution
main() {
    echo "SvelteHR Kubernetes Cluster Setup"
    echo "=================================="

    check_commands
    start_cluster
    fix_dns
    enable_addons
    verify_cluster
    show_access

    log "Setup completed! You can now deploy SvelteHR."
}

main "$@"