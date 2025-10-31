#!/bin/bash

# SvelteHR Proxmox K3s Quick Start Deployment Script
# This script automates the complete deployment of SvelteHR on Proxmox K3s

set -e

# Configuration
REGISTRY="${REGISTRY:-localhost:5000}"
VERSION="${VERSION:-latest}"
DEPLOY_DEV="${DEPLOY_DEV:-true}"
DEPLOY_PROD="${DEPLOY_PROD:-true}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

section() {
    echo ""
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${PURPLE}  $1${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Check if running on Proxmox VM with K3s
check_environment() {
    section "1. Environment Check"

    # Check if K3s is installed
    if ! command -v k3s &> /dev/null; then
        error "K3s is not installed. Please install K3s first:"
        echo "  curl -sfL https://get.k3s.io | sh -"
        exit 1
    fi

    # Check if kubectl is configured
    if ! kubectl cluster-info &> /dev/null; then
        error "kubectl is not configured. Please run:"
        echo "  sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config"
        echo "  sudo chown \$(id -u):\$(id -g) ~/.kube/config"
        exit 1
    fi

    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first:"
        echo "  curl -fsSL https://get.docker.com | sh"
        exit 1
    fi

    # Check if local registry is running
    if ! curl -sf http://${REGISTRY}/v2/ > /dev/null 2>&1; then
        warn "Local registry not running. Starting it now..."
        docker run -d -p 5000:5000 --restart=always --name registry registry:2 || {
            error "Failed to start registry. If it already exists, run:"
            echo "  docker start registry"
            exit 1
        }
        sleep 2
    fi

    log "✓ Environment checks passed!"
}

# Build and push Docker images
build_images() {
    section "2. Building Docker Images"

    log "Building and pushing images to ${REGISTRY}..."

    if [ -f "./k8s/scripts/build-and-push-local.sh" ]; then
        ./k8s/scripts/build-and-push-local.sh ${VERSION} ${REGISTRY}
    else
        error "Build script not found at ./k8s/scripts/build-and-push-local.sh"
        exit 1
    fi

    log "✓ Images built and pushed!"
}

# Update kustomization with registry configuration
update_kustomization() {
    section "3. Updating Kustomization"

    log "Updating k8s/base/kustomization.yaml with registry ${REGISTRY}..."

    # Backup original
    cp k8s/base/kustomization.yaml k8s/base/kustomization.yaml.backup

    # Update image references
    sed -i "s|newName:.*sveltehr-backend|newName: ${REGISTRY}/sveltehr-backend|g" k8s/base/kustomization.yaml
    sed -i "s|newName:.*sveltehr-frontend|newName: ${REGISTRY}/sveltehr-frontend|g" k8s/base/kustomization.yaml
    sed -i "s|newTag:.*|newTag: ${VERSION}|g" k8s/base/kustomization.yaml

    log "✓ Kustomization updated!"
}

# Install K8s operators
install_operators() {
    section "4. Installing Kubernetes Operators"

    log "Installing CloudNativePG and Redis operators..."

    ./k8s/deploy.sh dev install

    log "✓ Operators installed!"
}

# Deploy development environment
deploy_dev() {
    section "5. Deploying Development Environment"

    log "Deploying to sveltehr-dev namespace..."

    ./k8s/deploy.sh dev deploy

    log "✓ Development environment deployed!"
}

# Deploy production environment
deploy_prod() {
    section "6. Deploying Production Environment"

    log "Deploying to sveltehr-prod namespace..."

    ./k8s/deploy.sh prod deploy

    log "✓ Production environment deployed!"
}

# Show access information
show_access_info() {
    section "7. Access Information"

    echo ""
    echo "═══════════════════════════════════════════════════════"
    echo "  SvelteHR Deployment Complete!"
    echo "═══════════════════════════════════════════════════════"
    echo ""

    if [ "$DEPLOY_DEV" = "true" ]; then
        echo "📦 Development Environment (sveltehr-dev):"
        echo ""
        echo "  Port Forward Commands:"
        echo "    kubectl port-forward -n sveltehr-dev svc/sveltehr-frontend 3000:3000"
        echo "    kubectl port-forward -n sveltehr-dev svc/sveltehr-backend 4000:4000"
        echo ""
        echo "  Access URLs (after port-forward):"
        echo "    Frontend: http://localhost:3000"
        echo "    Backend GraphQL: http://localhost:4000/graphql"
        echo ""
    fi

    if [ "$DEPLOY_PROD" = "true" ]; then
        echo "🚀 Production Environment (sveltehr-prod):"
        echo ""
        echo "  Port Forward Commands:"
        echo "    kubectl port-forward -n sveltehr-prod svc/sveltehr-frontend 3001:3000"
        echo "    kubectl port-forward -n sveltehr-prod svc/sveltehr-backend 4001:4000"
        echo ""
        echo "  Access URLs (after port-forward):"
        echo "    Frontend: http://localhost:3001"
        echo "    Backend GraphQL: http://localhost:4001/graphql"
        echo ""
    fi

    echo "📊 Monitoring Commands:"
    echo ""
    echo "  View all pods:"
    if [ "$DEPLOY_DEV" = "true" ]; then
        echo "    kubectl get pods -n sveltehr-dev"
    fi
    if [ "$DEPLOY_PROD" = "true" ]; then
        echo "    kubectl get pods -n sveltehr-prod"
    fi
    echo ""
    echo "  View logs:"
    if [ "$DEPLOY_DEV" = "true" ]; then
        echo "    kubectl logs -f deployment/sveltehr-frontend -n sveltehr-dev"
        echo "    kubectl logs -f deployment/sveltehr-backend -n sveltehr-dev"
    fi
    echo ""
    echo "  Resource usage:"
    echo "    kubectl top nodes"
    echo "    kubectl top pods -n sveltehr-dev"
    echo ""
    echo "📚 Documentation:"
    echo "    See docs/PROXMOX_DEPLOYMENT.md for detailed information"
    echo ""
    echo "═══════════════════════════════════════════════════════"
    echo ""
}

# Show configuration banner
show_banner() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║                                                       ║"
    echo "║        SvelteHR Proxmox K3s Quick Start               ║"
    echo "║                                                       ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo ""
    echo "Configuration:"
    echo "  Registry: ${REGISTRY}"
    echo "  Version: ${VERSION}"
    echo "  Deploy Dev: ${DEPLOY_DEV}"
    echo "  Deploy Prod: ${DEPLOY_PROD}"
    echo ""
}

# Main execution
main() {
    show_banner

    # Always run these steps
    check_environment
    build_images
    update_kustomization
    install_operators

    # Deploy based on configuration
    if [ "$DEPLOY_DEV" = "true" ]; then
        deploy_dev
    fi

    if [ "$DEPLOY_PROD" = "true" ]; then
        deploy_prod
    fi

    # Show access info
    show_access_info

    log "🎉 Quick start deployment complete!"
}

# Handle script arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dev-only)
            DEPLOY_PROD=false
            shift
            ;;
        --prod-only)
            DEPLOY_DEV=false
            shift
            ;;
        --registry)
            REGISTRY="$2"
            shift 2
            ;;
        --version)
            VERSION="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dev-only          Deploy only development environment"
            echo "  --prod-only         Deploy only production environment"
            echo "  --registry REGISTRY Set Docker registry (default: localhost:5000)"
            echo "  --version VERSION   Set image version (default: latest)"
            echo "  --help              Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  REGISTRY            Docker registry address"
            echo "  VERSION             Image version tag"
            echo "  DEPLOY_DEV          Deploy dev environment (true/false)"
            echo "  DEPLOY_PROD         Deploy prod environment (true/false)"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

main "$@"
