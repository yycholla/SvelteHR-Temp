#!/bin/bash

# SvelteHR Kubernetes Deployment Script
# Usage: ./deploy.sh [dev|prod] [install|deploy|cleanup]

set -e

ENVIRONMENT=${1:-dev}
ACTION=${2:-deploy}

# Map short names to full overlay directory names
case $ENVIRONMENT in
    dev)
        OVERLAY_ENV="development"
        ;;
    prod)
        OVERLAY_ENV="production"
        ;;
    *)
        OVERLAY_ENV=$ENVIRONMENT
        ;;
esac

NAMESPACE="sveltehr-${ENVIRONMENT}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed. Please install it first."
        exit 1
    fi

    if ! kubectl cluster-info &> /dev/null; then
        error "kubectl is not configured to access a cluster."
        exit 1
    fi

    if ! command -v kustomize &> /dev/null && ! kubectl kustomize --help &> /dev/null; then
        warn "kustomize not found. Using kubectl built-in kustomize support."
    fi

    log "Prerequisites check passed."
}

# Install operators and dependencies
install_dependencies() {
    log "Installing operators and dependencies..."

    # Create system namespace
    kubectl apply -f k8s/base/namespaces.yaml

    # NOTE: Skipping cert-manager for local development
    # It's only needed for production TLS certificates
    log "Skipping cert-manager (not needed for local dev)"

    # NOTE: For minikube, ingress may or may not be available
    # depending on kernel module availability (xt_comment)
    if kubectl get namespace ingress-nginx &>/dev/null; then
        log "Ingress controller already installed"
    else
        warn "Ingress controller not available (kernel module issue)"
        warn "You can access services via port-forwarding"
    fi

    # Install PostgreSQL operator
    log "Installing CloudNativePG operator..."
    kubectl apply -f https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.22/releases/cnpg-1.22.1.yaml

    # Wait for CNPG operator CRD to be ready
    log "Waiting for CloudNativePG CRDs..."
    kubectl wait --for condition=established --timeout=120s crd/clusters.postgresql.cnpg.io || warn "CNPG CRD may not be ready"

    # Install Redis operator
    log "Installing Redis operator..."
    kubectl apply -f https://raw.githubusercontent.com/spotahome/redis-operator/master/example/operator/all-redis-operator-resources.yaml

    # The Redis operator manifest also installs the CRD, wait for it
    log "Waiting for Redis operator CRDs..."

    # First check if CRD exists, if not, install it manually
    if ! kubectl get crd redisfailovers.databases.spotahome.com &>/dev/null; then
        log "Installing Redis CRD manually..."
        kubectl apply -f https://raw.githubusercontent.com/spotahome/redis-operator/master/manifests/databases.spotahome.com_redisfailovers.yaml || warn "Redis CRD installation failed"
    fi

    kubectl wait --for condition=established --timeout=120s crd/redisfailovers.databases.spotahome.com 2>/dev/null || warn "Redis CRD may not be ready"

    # Wait for PostgreSQL webhook to be ready
    log "Waiting for PostgreSQL operator webhook..."
    kubectl wait --for=condition=available --timeout=120s deployment/cnpg-controller-manager -n cnpg-system || warn "PostgreSQL webhook may not be ready"

    # Wait for Redis operator to be ready
    log "Waiting for Redis operator to be ready..."
    kubectl wait --for=condition=available --timeout=120s deployment/redisoperator -n operators 2>/dev/null || warn "Redis operator may not be ready"

    log "Waiting for operators to fully initialize..."
    sleep 15

    log "Dependencies installation completed."
}

# Create secrets
create_secrets() {
    log "Creating secrets for ${ENVIRONMENT} environment..."

    # Use the new create-secrets.sh script for proper CloudNativePG secret structure
    if [ -f "./k8s/scripts/create-secrets.sh" ]; then
        ./k8s/scripts/create-secrets.sh $ENVIRONMENT
    else
        error "create-secrets.sh script not found. Please ensure k8s/scripts/create-secrets.sh exists"
        exit 1
    fi

    log "Secrets created."
}

# Deploy application
deploy_application() {
    log "Deploying SvelteHR to ${ENVIRONMENT} environment..."

    # Create namespaces first (separate from kustomization to avoid conflicts)
    log "Creating namespaces..."
    kubectl apply -f k8s/base/namespaces.yaml

    # Apply kustomization
    kubectl apply -k "k8s/overlays/${OVERLAY_ENV}"

    # Wait for PostgreSQL cluster
    log "Waiting for PostgreSQL cluster..."
    kubectl wait --for=condition=ready --timeout=600s cluster/sveltehr-postgres -n $NAMESPACE

    # Wait for Redis cluster
    log "Waiting for Redis cluster..."
    kubectl wait --for=condition=ready --timeout=300s redisfailover/sveltehr-redis -n $NAMESPACE 2>/dev/null || warn "Redis may still be initializing"

    # Wait for backend deployment
    log "Waiting for backend deployment..."
    kubectl wait --for=condition=available --timeout=300s deployment/sveltehr-backend -n $NAMESPACE

    # Wait for frontend deployment
    log "Waiting for frontend deployment..."
    kubectl wait --for=condition=available --timeout=300s deployment/sveltehr-frontend -n $NAMESPACE

    log "Application deployed successfully!"
}

# Get access information
show_access_info() {
    log "Access information for ${ENVIRONMENT} environment:"

    if [ "$ENVIRONMENT" = "dev" ]; then
        echo ""
        echo "Local Development Access (Minikube):"
        echo ""
        echo "Option 1 - Use minikube tunnel (recommended):"
        echo "  minikube tunnel"
        echo "  Then access at: http://localhost"
        echo ""
        echo "Option 2 - Port forward ingress controller:"
        echo "  kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 8080:80"
        echo "  Then access at: http://localhost:8080"
        echo ""
        echo "Option 3 - Direct service access:"
        echo "  Backend GraphQL: kubectl port-forward -n $NAMESPACE svc/sveltehr-backend 4000:4000"
        echo "  Frontend: kubectl port-forward -n $NAMESPACE svc/sveltehr-frontend 3000:3000"
        echo ""
        echo "Get minikube IP: minikube ip"
    else
        INGRESS_IP=$(kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
        if [ -n "$INGRESS_IP" ]; then
            echo "Application URL: http://$INGRESS_IP"
        else
            echo "Ingress service is not yet assigned an external IP. Check with:"
            echo "kubectl get svc ingress-nginx-controller -n ingress-nginx"
        fi
    fi

    echo ""
    echo "Useful commands:"
    echo "  Check pod status: kubectl get pods -n $NAMESPACE"
    echo "  View backend logs: kubectl logs -f deployment/sveltehr-backend -n $NAMESPACE"
    echo "  View frontend logs: kubectl logs -f deployment/sveltehr-frontend -n $NAMESPACE"
    echo "  Check ingress: kubectl get ingress -n $NAMESPACE"
}

# Cleanup function
cleanup() {
    log "Cleaning up ${ENVIRONMENT} environment..."

    kubectl delete namespace $NAMESPACE --ignore-not-found=true

    if [ "$ENVIRONMENT" = "dev" ]; then
        warn "Development cleanup completed. System components (operators, ingress) preserved."
    else
        warn "Production cleanup completed. System components preserved for safety."
    fi
}

# Main execution
main() {
    case $ACTION in
        install)
            check_prerequisites
            install_dependencies
            ;;
        deploy)
            check_prerequisites
            create_secrets
            deploy_application
            show_access_info
            ;;
        cleanup)
            cleanup
            ;;
        *)
            error "Invalid action: $ACTION"
            echo "Usage: $0 [dev|prod] [install|deploy|cleanup]"
            echo "  dev/prod: Environment to deploy to"
            echo "  install: Install operators and dependencies"
            echo "  deploy: Deploy the application"
            echo "  cleanup: Remove the application"
            exit 1
            ;;
    esac
}

main "$@"