#!/bin/bash

# SvelteHR Container Image Build Script for Minikube
# This script builds Docker images in minikube's Docker environment

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

# Check if minikube is running
check_minikube() {
    log "Checking minikube status..."

    if ! command -v minikube &> /dev/null; then
        error "minikube is not installed"
        exit 1
    fi

    if ! minikube status &> /dev/null; then
        error "minikube is not running. Please start it with: minikube start"
        exit 1
    fi

    log "Minikube is running"
}

# Configure Docker to use minikube's Docker daemon
configure_docker_env() {
    log "Configuring Docker environment to use minikube..."

    # Set Docker environment variables
    eval $(minikube docker-env)

    info "Docker is now configured to use minikube's Docker daemon"
    info "Any images built will be available directly in minikube"
}

# Build frontend image
build_frontend() {
    log "Building frontend image..."

    cd /home/yycholla/Documents/SvelteHR

    # Build using the production target
    docker build \
        --target production \
        -t sveltehr-frontend:latest \
        -f Dockerfile \
        . > /tmp/frontend-build.log 2>&1

    if [ $? -eq 0 ]; then
        log "Frontend image built: sveltehr-frontend:latest"
    else
        error "Frontend build failed. Check /tmp/frontend-build.log"
        exit 1
    fi
}

# Build backend image
build_backend() {
    log "Building backend image..."

    cd /home/yycholla/Documents/SvelteHR/graphql-rust-server

    # Build using the production Dockerfile
    docker build \
        -t sveltehr-backend:latest \
        -f Dockerfile.prod \
        . > /tmp/backend-build.log 2>&1

    if [ $? -eq 0 ]; then
        log "Backend image built: sveltehr-backend:latest"
    else
        error "Backend build failed. Check /tmp/backend-build.log"
        exit 1
    fi
}

# Verify images
verify_images() {
    log "Verifying built images..."

    if docker images | grep -q "sveltehr-frontend"; then
        info "✓ Frontend image found"
    else
        error "✗ Frontend image not found"
        exit 1
    fi

    if docker images | grep -q "sveltehr-backend"; then
        info "✓ Backend image found"
    else
        error "✗ Backend image not found"
        exit 1
    fi

    log "All images verified successfully"
}

# Show image information
show_info() {
    echo ""
    info "Built images in minikube:"
    docker images | grep "sveltehr-" || true
    echo ""
    info "These images are now available in minikube and can be used by Kubernetes pods"
    echo ""
    info "To deploy to minikube, run:"
    echo "  ./k8s/deploy.sh dev deploy"
}

# Main execution
main() {
    echo "SvelteHR Image Build for Minikube"
    echo "=================================="
    echo ""

    check_minikube
    configure_docker_env

    # Build images in parallel for speed
    log "Building frontend and backend images in parallel..."

    # Start both builds in background
    build_frontend &
    FRONTEND_PID=$!

    build_backend &
    BACKEND_PID=$!

    # Wait for both builds to complete
    info "Waiting for frontend build (PID: $FRONTEND_PID)..."
    info "Waiting for backend build (PID: $BACKEND_PID)..."
    info "Logs: /tmp/frontend-build.log and /tmp/backend-build.log"

    # Wait for frontend
    if wait $FRONTEND_PID; then
        info "✓ Frontend build completed"
    else
        error "Frontend build failed"
        cat /tmp/frontend-build.log
        exit 1
    fi

    # Wait for backend
    if wait $BACKEND_PID; then
        info "✓ Backend build completed"
    else
        error "Backend build failed"
        cat /tmp/backend-build.log
        exit 1
    fi

    # Verify and show info
    verify_images
    show_info

    log "Image build completed successfully!"
}

main "$@"
