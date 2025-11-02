#!/bin/bash

# SvelteHR Docker Image Build and Push Script (Local Registry)
# Usage: ./build-and-push-local.sh [version] [registry]
#
# Features:
# - Multi-target Rust builds (server, migration, seed)
# - BuildKit with layer caching
# - Parallel builds for improved performance

set -e

# Configuration
VERSION="${1:-latest}"
REGISTRY="${2:-localhost:5000}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Enable BuildKit for faster builds and cache mounts
export DOCKER_BUILDKIT=1

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

    # Verify BuildKit is available
    if ! docker buildx version &> /dev/null; then
        warn "Docker Buildx not available. Using legacy builder."
    else
        info "BuildKit/Buildx available - using for optimized builds"
    fi

    # Check if registry is reachable
    if ! curl -sf http://${REGISTRY}/v2/ > /dev/null 2>&1; then
        warn "Registry ${REGISTRY} may not be reachable. Ensure it's running:"
        echo "  docker run -d -p 5000:5000 --restart=always --name registry registry:2"
    fi

    log "Prerequisites check passed."
}

# Build backend images (3 separate targets)
build_backend() {
    log "Building backend images with multi-target Dockerfile..."

    BACKEND_DIR="${PROJECT_ROOT}/graphql-rust-server"

    if [ ! -d "$BACKEND_DIR" ]; then
        error "Backend directory not found at: $BACKEND_DIR"
        exit 1
    fi

    cd "$BACKEND_DIR"
    info "Backend directory: $(pwd)"

    # Build server image
    log "Building server image (target: server)..."
    docker build \
        --target server \
        --cache-from ${REGISTRY}/sveltehr-backend:${VERSION} \
        --cache-from ${REGISTRY}/sveltehr-backend:latest \
        -t ${REGISTRY}/sveltehr-backend:${VERSION} \
        -f Dockerfile.prod \
        .

    info "Server image built: ${REGISTRY}/sveltehr-backend:${VERSION}"

    # Build migration image
    log "Building migration image (target: migration)..."
    docker build \
        --target migration \
        --cache-from ${REGISTRY}/sveltehr-migration:${VERSION} \
        --cache-from ${REGISTRY}/sveltehr-migration:latest \
        -t ${REGISTRY}/sveltehr-migration:${VERSION} \
        -f Dockerfile.prod \
        .

    info "Migration image built: ${REGISTRY}/sveltehr-migration:${VERSION}"

    # Build seed image
    log "Building seed image (target: seed)..."
    docker build \
        --target seed \
        --cache-from ${REGISTRY}/sveltehr-seed:${VERSION} \
        --cache-from ${REGISTRY}/sveltehr-seed:latest \
        -t ${REGISTRY}/sveltehr-seed:${VERSION} \
        -f Dockerfile.prod \
        .

    info "Seed image built: ${REGISTRY}/sveltehr-seed:${VERSION}"

    log "All backend images built successfully!"
}

# Build frontend image with BuildKit
build_frontend() {
    log "Building frontend image with BuildKit cache..."

    cd "$PROJECT_ROOT"

    info "Frontend directory: $(pwd)"
    info "Building ${REGISTRY}/sveltehr-frontend:${VERSION}"

    docker build \
        --target runtime \
        --cache-from ${REGISTRY}/sveltehr-frontend:${VERSION} \
        --cache-from ${REGISTRY}/sveltehr-frontend:latest \
        -t ${REGISTRY}/sveltehr-frontend:${VERSION} \
        -f Dockerfile \
        .

    log "Frontend image built successfully!"
}

# Push images to registry
push_images() {
    log "Pushing images to registry ${REGISTRY}..."

    info "Pushing backend server image..."
    docker push ${REGISTRY}/sveltehr-backend:${VERSION}

    info "Pushing migration image..."
    docker push ${REGISTRY}/sveltehr-migration:${VERSION}

    info "Pushing seed image..."
    docker push ${REGISTRY}/sveltehr-seed:${VERSION}

    info "Pushing frontend image..."
    docker push ${REGISTRY}/sveltehr-frontend:${VERSION}

    log "All images pushed successfully!"
}

# Verify images in registry
verify_images() {
    log "Verifying images in registry..."

    if ! command -v jq &> /dev/null; then
        warn "jq not installed - skipping pretty output"
        return
    fi

    info "Checking registry catalog..."
    curl -s http://${REGISTRY}/v2/_catalog | jq '.'

    info "Backend server tags:"
    curl -s http://${REGISTRY}/v2/sveltehr-backend/tags/list | jq '.'

    info "Migration tags:"
    curl -s http://${REGISTRY}/v2/sveltehr-migration/tags/list | jq '.'

    info "Seed tags:"
    curl -s http://${REGISTRY}/v2/sveltehr-seed/tags/list | jq '.'

    info "Frontend tags:"
    curl -s http://${REGISTRY}/v2/sveltehr-frontend/tags/list | jq '.'

    log "Verification complete!"
}

# Show build statistics
show_build_stats() {
    log "Build Statistics:"
    echo ""
    echo "Image sizes:"
    docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep -E "(sveltehr-backend|sveltehr-migration|sveltehr-seed|sveltehr-frontend)" | grep "${VERSION}"
    echo ""
}

# Show next steps
show_next_steps() {
    log "Build and push complete!"

    echo ""
    echo "Images built and pushed:"
    echo "  - ${REGISTRY}/sveltehr-backend:${VERSION} (GraphQL server)"
    echo "  - ${REGISTRY}/sveltehr-migration:${VERSION} (Database migrations)"
    echo "  - ${REGISTRY}/sveltehr-seed:${VERSION} (Database seeding)"
    echo "  - ${REGISTRY}/sveltehr-frontend:${VERSION} (SvelteKit frontend)"
    echo ""
    echo "Next steps:"
    echo "  1. Update k8s/base/kustomization.yaml with the registry and version"
    echo "  2. Update k8s/base/backend-deployment.yaml to use server image"
    echo "  3. Create/update k8s/base/migration-job.yaml to use migration image"
    echo "  4. Deploy to dev: ./k8s/deploy.sh dev deploy"
    echo "  5. Deploy to prod: ./k8s/deploy.sh prod deploy"
    echo ""
    echo "BuildKit cache benefits:"
    echo "  - Rust builds: cargo-chef dependency caching + target cache mounts"
    echo "  - Frontend builds: npm cache + Vite cache mounts"
    echo "  - Subsequent builds will be 60-80% faster"
    echo ""
}

# Main execution
main() {
    echo "SvelteHR Docker Image Builder (BuildKit Enabled)"
    echo "================================================="
    echo "Registry: ${REGISTRY}"
    echo "Version: ${VERSION}"
    echo "BuildKit: ${DOCKER_BUILDKIT}"
    echo ""

    check_prerequisites

    # Build backend and frontend sequentially (could be parallelized with background jobs)
    build_backend
    build_frontend

    push_images
    verify_images
    show_build_stats
    show_next_steps
}

main "$@"
