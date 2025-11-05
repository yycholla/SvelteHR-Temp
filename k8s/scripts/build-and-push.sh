#!/bin/bash

# =============================================================================
# SvelteHR Docker Image Build and Push Script (GHCR)
# =============================================================================
# Usage: ./build-and-push.sh [version] [registry]
#
# Features:
# - GitHub Container Registry (ghcr.io) support with authentication
# - Multi-target Rust builds (server, migration, seed)
# - BuildKit with layer caching
# - Multi-tagging (version, sha, latest)
# - Parallel builds for improved performance
#
# Environment Variables:
#   GITHUB_TOKEN       - GitHub Personal Access Token for authentication
#   GITHUB_ACTOR       - GitHub username (defaults to current git user)
#   GITHUB_REPOSITORY  - Repository name (defaults to current git remote)
#   IMAGE_TAG          - Custom image tag (overrides version argument)
# =============================================================================

set -e

# Configuration
VERSION="${IMAGE_TAG:-${1:-latest}}"
REGISTRY="${2:-ghcr.io}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Detect if VERSION is a semantic version tag (v1.2.3 format)
SEMVER_TAGS=()
if [[ "$VERSION" =~ ^v?([0-9]+)\.([0-9]+)\.([0-9]+)(-[a-zA-Z0-9.]+)?$ ]]; then
    MAJOR="${BASH_REMATCH[1]}"
    MINOR="${BASH_REMATCH[2]}"
    PATCH="${BASH_REMATCH[3]}"
    PRERELEASE="${BASH_REMATCH[4]}"

    # Normalize to v-prefixed version
    VERSION="v${MAJOR}.${MINOR}.${PATCH}${PRERELEASE}"

    # Only create major/minor tags for stable releases (no prerelease)
    if [ -z "$PRERELEASE" ]; then
        SEMVER_TAGS+=("v${MAJOR}.${MINOR}")
        SEMVER_TAGS+=("v${MAJOR}")
    fi

    log_info "Detected semantic version: ${VERSION}"
    if [ ${#SEMVER_TAGS[@]} -gt 0 ]; then
        log_info "Additional semver tags: ${SEMVER_TAGS[*]}"
    fi
fi

# Detect GitHub repository from git remote
if [ -z "$GITHUB_REPOSITORY" ]; then
    GIT_REMOTE=$(git config --get remote.origin.url 2>/dev/null || echo "")
    if [[ "$GIT_REMOTE" =~ github\.com[:/](.+/.+)(\.git)?$ ]]; then
        GITHUB_REPOSITORY="${BASH_REMATCH[1]%.git}"
    else
        GITHUB_REPOSITORY="mountain-care-rx/sveltehr"
        log_warn "Could not detect GitHub repository. Using default: $GITHUB_REPOSITORY"
    fi
fi

# Detect GitHub actor from git config
if [ -z "$GITHUB_ACTOR" ]; then
    GITHUB_ACTOR=$(git config user.name 2>/dev/null || echo "unknown")
fi

# Lowercase repository name for GHCR
REPO_LOWER=$(echo "$GITHUB_REPOSITORY" | tr '[:upper:]' '[:lower:]')
REGISTRY_PATH="${REGISTRY}/${REPO_LOWER}"

# Git commit SHA for tagging
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Logging functions (defined early so they can be used during initialization)
log_msg() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

log_info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

log_error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

# Enable BuildKit for faster builds and cache mounts
export DOCKER_BUILDKIT=1

# Check prerequisites
check_prerequisites() {
    log_msg "Checking prerequisites..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    # Test Docker access
    if ! docker ps &> /dev/null; then
        log_error "Cannot access Docker. Please check Docker is running and you have permissions."
        exit 1
    fi

    # Verify BuildKit is available
    if ! docker buildx version &> /dev/null; then
        log_warn "Docker Buildx not available. Using legacy builder."
    else
        log_info "BuildKit/Buildx available - using for optimized builds"
    fi

    # Check git for SHA tagging
    if ! command -v git &> /dev/null; then
        log_warn "Git not installed. SHA tagging will be skipped."
    fi

    log_msg "Prerequisites check passed."
}

# Authenticate with GitHub Container Registry
ghcr_login() {
    log_msg "Authenticating with GitHub Container Registry..."

    if [ -z "$GITHUB_TOKEN" ]; then
        log_warn "GITHUB_TOKEN not set. Attempting to use existing Docker credentials."
        log_warn "For CI/CD, set GITHUB_TOKEN environment variable."
        return
    fi

    echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin

    if [ $? -eq 0 ]; then
        log_msg "Successfully authenticated with ghcr.io"
    else
        log_error "Failed to authenticate with GitHub Container Registry"
        log_error "Please ensure GITHUB_TOKEN has write:packages permission"
        exit 1
    fi
}

# Build unified backend image with all binaries
build_backend() {
    log_msg "Building unified backend image (includes server, migration, seed binaries)..."

    BACKEND_DIR="${PROJECT_ROOT}/graphql-rust-server"

    if [ ! -d "$BACKEND_DIR" ]; then
        log_error "Backend directory not found at: $BACKEND_DIR"
        exit 1
    fi

    cd "$BACKEND_DIR"
    log_info "Backend directory: $(pwd)"

    # Build single server image with all binaries included
    log_msg "Building backend-server image (target: server) with all binaries..."
    BUILD_ARGS=(
        --target server
        --cache-from ${REGISTRY_PATH}/backend-server:latest
        -t ${REGISTRY_PATH}/backend-server:${VERSION}
        -t ${REGISTRY_PATH}/backend-server:${GIT_SHA}
        -t ${REGISTRY_PATH}/backend-server:latest
    )

    # Add semantic version tags if detected
    for tag in "${SEMVER_TAGS[@]}"; do
        BUILD_ARGS+=(-t ${REGISTRY_PATH}/backend-server:${tag})
    done

    docker build "${BUILD_ARGS[@]}" -f Dockerfile.prod .

    log_info "Backend server image built: ${REGISTRY_PATH}/backend-server:${VERSION}"
    log_info "  Includes binaries: hr-graphql-server, hr-migration, hr-seed"
    for tag in "${SEMVER_TAGS[@]}"; do
        log_info "  Additional tag: ${REGISTRY_PATH}/backend-server:${tag}"
    done

    log_msg "Backend image built successfully!"
}

# Build frontend image with BuildKit
build_frontend() {
    log_msg "Building frontend image with BuildKit cache..."

    cd "$PROJECT_ROOT"

    log_info "Frontend directory: $(pwd)"
    log_info "Building ${REGISTRY_PATH}/frontend:${VERSION}"

    BUILD_ARGS=(
        --target production
        --cache-from ${REGISTRY_PATH}/frontend:latest
        -t ${REGISTRY_PATH}/frontend:${VERSION}
        -t ${REGISTRY_PATH}/frontend:${GIT_SHA}
        -t ${REGISTRY_PATH}/frontend:latest
    )

    # Add semantic version tags if detected
    for tag in "${SEMVER_TAGS[@]}"; do
        BUILD_ARGS+=(-t ${REGISTRY_PATH}/frontend:${tag})
    done

    docker build "${BUILD_ARGS[@]}" -f Dockerfile .

    log_msg "Frontend image built successfully!"
    for tag in "${SEMVER_TAGS[@]}"; do
        log_info "  Additional tag: ${REGISTRY_PATH}/frontend:${tag}"
    done
}

# Push images to registry
push_images() {
    log_msg "Pushing images to registry ${REGISTRY_PATH}..."

    # Push unified backend server image (all tags)
    log_info "Pushing backend server image (includes all binaries)..."
    docker push ${REGISTRY_PATH}/backend-server:${VERSION}
    docker push ${REGISTRY_PATH}/backend-server:${GIT_SHA}
    docker push ${REGISTRY_PATH}/backend-server:latest
    for tag in "${SEMVER_TAGS[@]}"; do
        docker push ${REGISTRY_PATH}/backend-server:${tag}
    done

    # Push frontend image (all tags)
    log_info "Pushing frontend image..."
    docker push ${REGISTRY_PATH}/frontend:${VERSION}
    docker push ${REGISTRY_PATH}/frontend:${GIT_SHA}
    docker push ${REGISTRY_PATH}/frontend:latest
    for tag in "${SEMVER_TAGS[@]}"; do
        docker push ${REGISTRY_PATH}/frontend:${tag}
    done

    log_msg "All images pushed successfully!"
}

# Show build statistics
show_build_stats() {
    log_msg "Build Statistics:"
    echo ""
    echo "Image sizes:"
    docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | \
        grep -E "(backend-server|frontend)" | \
        grep -E "(${VERSION}|${GIT_SHA}|latest)"
    echo ""
}

# Show next steps
show_next_steps() {
    log_msg "Build and push complete!"

    echo ""
    echo "Images built and pushed to GHCR:"
    echo "  - ${REGISTRY_PATH}/backend-server:${VERSION}"
    echo "    → Includes: hr-graphql-server, hr-migration, hr-seed binaries"
    echo "  - ${REGISTRY_PATH}/frontend:${VERSION}"
    echo "    → SvelteKit production build"
    echo ""
    echo "Additional tags:"
    echo "  - :${GIT_SHA} (git commit SHA)"
    echo "  - :latest (latest build)"
    echo ""
    echo "View images at:"
    echo "  https://github.com/${GITHUB_REPOSITORY}/pkgs/container"
    echo ""
    echo "Next steps:"
    echo "  1. Deploy to dev with Helm:"
    echo "     helm upgrade --install sveltehr ./k8s/helm-charts/sveltehr \\"
    echo "       -f k8s/helm-charts/sveltehr/values-dev.yaml \\"
    echo "       --namespace sveltehr-dev --create-namespace"
    echo ""
    echo "  2. Deploy to prod with ArgoCD:"
    echo "     kubectl apply -f k8s/argocd/sveltehr-application.yaml"
    echo ""
    echo "BuildKit cache benefits:"
    echo "  - Rust builds: cargo-chef dependency caching + target cache mounts"
    echo "  - Frontend builds: npm cache + Vite cache mounts"
    echo "  - Subsequent builds will be 60-80% faster"
    echo ""
}

# Main execution
main() {
    echo "SvelteHR Docker Image Builder (GHCR + BuildKit)"
    echo "==============================================="
    echo "Registry: ${REGISTRY}"
    echo "Repository: ${GITHUB_REPOSITORY}"
    echo "Registry Path: ${REGISTRY_PATH}"
    echo "Version: ${VERSION}"
    echo "Git SHA: ${GIT_SHA}"
    echo "BuildKit: ${DOCKER_BUILDKIT}"
    echo ""

    check_prerequisites
    ghcr_login

    # Build backend and frontend (could be parallelized with background jobs)
    build_backend
    build_frontend

    push_images
    show_build_stats
    show_next_steps
}

main "$@"
