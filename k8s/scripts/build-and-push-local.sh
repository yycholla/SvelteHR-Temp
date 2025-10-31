#!/bin/bash

# SvelteHR Docker Image Build and Push Script (Local Registry)
# Usage: ./build-and-push-local.sh [version] [registry]

set -e

# Configuration
VERSION="${1:-latest}"
REGISTRY="${2:-localhost:5000}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    # Test Docker access
    if ! docker ps &> /dev/null; then
        error "Cannot access Docker. Please check Docker is running and you have permissions."
        exit 1
    fi

    # Check if registry is reachable
    if ! curl -sf http://${REGISTRY}/v2/ > /dev/null 2>&1; then
        warn "Registry ${REGISTRY} may not be reachable. Ensure it's running:"
        echo "  docker run -d -p 5000:5000 --restart=always --name registry registry:2"
    fi

    log "Prerequisites check passed."
}

# Build backend image
build_backend() {
    log "Building backend image..."

    BACKEND_DIR="${PROJECT_ROOT}/../graphql-rust-server"

    if [ ! -d "$BACKEND_DIR" ]; then
        error "Backend directory not found at: $BACKEND_DIR"
        error "Please ensure MountainHR-Backend is cloned adjacent to SvelteHR"
        exit 1
    fi

    cd "$BACKEND_DIR"

    info "Backend directory: $(pwd)"
    info "Building ${REGISTRY}/sveltehr-backend:${VERSION}"

    docker build \
        -t ${REGISTRY}/sveltehr-backend:${VERSION} \
        -f Dockerfile \
        .

    log "Backend image built successfully!"
}

# Build frontend image
build_frontend() {
    log "Building frontend image..."

    cd "$PROJECT_ROOT"

    info "Frontend directory: $(pwd)"
    info "Building ${REGISTRY}/sveltehr-frontend:${VERSION}"

    docker build \
        -t ${REGISTRY}/sveltehr-frontend:${VERSION} \
        -f Dockerfile \
        .

    log "Frontend image built successfully!"
}

# Push images to registry
push_images() {
    log "Pushing images to registry ${REGISTRY}..."

    info "Pushing backend image..."
    docker push ${REGISTRY}/sveltehr-backend:${VERSION}

    info "Pushing frontend image..."
    docker push ${REGISTRY}/sveltehr-frontend:${VERSION}

    log "Images pushed successfully!"
}

# Verify images in registry
verify_images() {
    log "Verifying images in registry..."

    info "Checking registry catalog..."
    curl -s http://${REGISTRY}/v2/_catalog | jq '.'

    info "Backend tags:"
    curl -s http://${REGISTRY}/v2/sveltehr-backend/tags/list | jq '.'

    info "Frontend tags:"
    curl -s http://${REGISTRY}/v2/sveltehr-frontend/tags/list | jq '.'

    log "Verification complete!"
}

# Show next steps
show_next_steps() {
    log "Build and push complete!"

    echo ""
    echo "Images built and pushed:"
    echo "  - ${REGISTRY}/sveltehr-backend:${VERSION}"
    echo "  - ${REGISTRY}/sveltehr-frontend:${VERSION}"
    echo ""
    echo "Next steps:"
    echo "  1. Update k8s/base/kustomization.yaml with the registry and version"
    echo "  2. Deploy to dev: ./k8s/deploy.sh dev deploy"
    echo "  3. Deploy to prod: ./k8s/deploy.sh prod deploy"
    echo ""
}

# Main execution
main() {
    echo "SvelteHR Docker Image Builder"
    echo "============================="
    echo "Registry: ${REGISTRY}"
    echo "Version: ${VERSION}"
    echo ""

    check_prerequisites
    build_backend
    build_frontend
    push_images
    verify_images
    show_next_steps
}

main "$@"
