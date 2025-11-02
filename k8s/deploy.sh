#!/bin/bash

# =============================================================================
# SvelteHR Helm Deployment Script
# =============================================================================
# Usage: ./deploy.sh [dev|prod] [deploy|upgrade|test|cleanup]
#
# Features:
# - Helm-based deployment with dependency management
# - Environment-specific values files
# - Automatic PostgreSQL and Redis setup
# - Health checking and validation
# =============================================================================

set -e

ENVIRONMENT=${1:-dev}
ACTION=${2:-deploy}

NAMESPACE="sveltehr-${ENVIRONMENT}"
CHART_PATH="helm-charts/sveltehr"
RELEASE_NAME="sveltehr"

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

    if ! command -v helm &> /dev/null; then
        error "Helm is not installed. Please install Helm 3.x first."
        error "Visit: https://helm.sh/docs/intro/install/"
        exit 1
    fi

    # Verify Helm chart exists
    if [ ! -d "$CHART_PATH" ]; then
        error "Helm chart not found at: $CHART_PATH"
        exit 1
    fi

    # Verify values file exists
    VALUES_FILE="$CHART_PATH/values-${ENVIRONMENT}.yaml"
    if [ ! -f "$VALUES_FILE" ]; then
        error "Values file not found: $VALUES_FILE"
        exit 1
    fi

    log "Prerequisites check passed."
}

# Update Helm dependencies
update_dependencies() {
    log "Updating Helm chart dependencies..."

    cd "$CHART_PATH"

    # Add required Helm repositories
    log "Adding Helm repositories..."
    helm repo add cloudnative-pg https://cloudnative-pg.github.io/charts 2>/dev/null || true
    helm repo add bitnami https://charts.bitnami.com/bitnami 2>/dev/null || true
    helm repo update

    # Update chart dependencies
    helm dependency update

    cd - > /dev/null

    log "Dependencies updated successfully."
}

# Install CloudNativePG operator (required for PostgreSQL)
install_operator() {
    log "Installing CloudNativePG operator..."

    # Check if operator is already installed
    if helm list -n cnpg-system | grep -q cloudnative-pg; then
        log "CloudNativePG operator already installed. Upgrading..."
        helm upgrade cloudnative-pg cloudnative-pg/cloudnative-pg \
            --namespace cnpg-system \
            --wait --timeout 5m
    else
        log "Installing CloudNativePG operator..."
        helm install cloudnative-pg cloudnative-pg/cloudnative-pg \
            --namespace cnpg-system \
            --create-namespace \
            --wait --timeout 5m
    fi

    # Wait for CNPG CRDs
    log "Waiting for CloudNativePG CRDs..."
    kubectl wait --for condition=established --timeout=120s crd/clusters.postgresql.cnpg.io || warn "CNPG CRD may not be ready"

    log "CloudNativePG operator ready."
}

# Deploy or upgrade application using Helm
deploy_application() {
    log "Deploying SvelteHR to ${ENVIRONMENT} environment using Helm..."

    VALUES_FILE="$CHART_PATH/values-${ENVIRONMENT}.yaml"

    # Check if release exists
    if helm list -n $NAMESPACE | grep -q $RELEASE_NAME; then
        log "Release '$RELEASE_NAME' exists. Performing upgrade..."

        helm upgrade $RELEASE_NAME ./$CHART_PATH \
            --namespace $NAMESPACE \
            --values $VALUES_FILE \
            --wait \
            --timeout 10m \
            --debug

        log "Application upgraded successfully!"
    else
        log "Installing new release '$RELEASE_NAME'..."

        helm install $RELEASE_NAME ./$CHART_PATH \
            --namespace $NAMESPACE \
            --create-namespace \
            --values $VALUES_FILE \
            --wait \
            --timeout 10m \
            --debug

        log "Application deployed successfully!"
    fi

    # Wait for key components
    log "Verifying deployment..."

    # PostgreSQL cluster (from CloudNativePG)
    log "Waiting for PostgreSQL cluster..."
    kubectl wait --for=condition=ready --timeout=300s cluster/${RELEASE_NAME}-postgres -n $NAMESPACE || warn "PostgreSQL may still be initializing"

    # Backend deployment
    log "Waiting for backend deployment..."
    kubectl wait --for=condition=available --timeout=300s deployment/${RELEASE_NAME}-backend -n $NAMESPACE || warn "Backend may still be starting"

    # Frontend deployment
    log "Waiting for frontend deployment..."
    kubectl wait --for=condition=available --timeout=300s deployment/${RELEASE_NAME}-frontend -n $NAMESPACE || warn "Frontend may still be starting"

    log "All components ready!"
}

# Test Helm deployment (dry-run)
test_deployment() {
    log "Testing Helm deployment for ${ENVIRONMENT} environment..."

    VALUES_FILE="$CHART_PATH/values-${ENVIRONMENT}.yaml"

    helm install $RELEASE_NAME ./$CHART_PATH \
        --namespace $NAMESPACE \
        --values $VALUES_FILE \
        --dry-run \
        --debug

    log "Dry-run test completed successfully!"
}

# Get access information
show_access_info() {
    log "Access information for ${ENVIRONMENT} environment:"

    echo ""
    echo "Helm Release Information:"
    echo "  Release: $RELEASE_NAME"
    echo "  Namespace: $NAMESPACE"
    echo "  Chart: $CHART_PATH"
    echo ""

    if [ "$ENVIRONMENT" = "dev" ]; then
        echo "Development Access:"
        echo "  Frontend (Vite dev): kubectl port-forward -n $NAMESPACE svc/${RELEASE_NAME}-frontend 5173:5173"
        echo "  Backend (GraphQL): kubectl port-forward -n $NAMESPACE svc/${RELEASE_NAME}-backend 4000:4000"
        echo "  Access at: http://localhost:5173 (frontend) or http://localhost:4000 (backend)"
    else
        INGRESS_HOST=$(kubectl get ingress -n $NAMESPACE -o jsonpath='{.items[0].spec.rules[0].host}' 2>/dev/null || echo "")
        if [ -n "$INGRESS_HOST" ]; then
            echo "Production Access:"
            echo "  Application URL: https://$INGRESS_HOST"
        else
            echo "Production Access (no ingress configured):"
            echo "  Frontend: kubectl port-forward -n $NAMESPACE svc/${RELEASE_NAME}-frontend 3000:3000"
            echo "  Backend: kubectl port-forward -n $NAMESPACE svc/${RELEASE_NAME}-backend 4000:4000"
        fi
    fi

    echo ""
    echo "Useful commands:"
    echo "  Check all resources: kubectl get all -n $NAMESPACE"
    echo "  Check pod status: kubectl get pods -n $NAMESPACE"
    echo "  View backend logs: kubectl logs -f deployment/${RELEASE_NAME}-backend -n $NAMESPACE"
    echo "  View frontend logs: kubectl logs -f deployment/${RELEASE_NAME}-frontend -n $NAMESPACE"
    echo "  Check PostgreSQL: kubectl get cluster -n $NAMESPACE"
    echo "  Check Redis: kubectl get pods -n $NAMESPACE -l app.kubernetes.io/name=redis"
    echo "  Helm status: helm status $RELEASE_NAME -n $NAMESPACE"
    echo "  Helm values: helm get values $RELEASE_NAME -n $NAMESPACE"
    echo ""
}

# Cleanup function
cleanup() {
    log "Cleaning up ${ENVIRONMENT} environment..."

    # Uninstall Helm release
    if helm list -n $NAMESPACE | grep -q $RELEASE_NAME; then
        log "Uninstalling Helm release '$RELEASE_NAME'..."
        helm uninstall $RELEASE_NAME -n $NAMESPACE --wait
    else
        warn "Release '$RELEASE_NAME' not found in namespace '$NAMESPACE'"
    fi

    # Delete namespace
    kubectl delete namespace $NAMESPACE --ignore-not-found=true

    if [ "$ENVIRONMENT" = "dev" ]; then
        warn "Development cleanup completed. CloudNativePG operator preserved."
    else
        warn "Production cleanup completed. System components preserved for safety."
        warn "To remove CloudNativePG operator: helm uninstall cloudnative-pg -n cnpg-system"
    fi
}

# Main execution
main() {
    echo "SvelteHR Helm Deployment"
    echo "========================"
    echo "Environment: $ENVIRONMENT"
    echo "Action: $ACTION"
    echo "Namespace: $NAMESPACE"
    echo "Chart: $CHART_PATH"
    echo ""

    case $ACTION in
        deploy)
            check_prerequisites
            update_dependencies
            install_operator
            deploy_application
            show_access_info
            ;;
        upgrade)
            check_prerequisites
            update_dependencies
            deploy_application
            show_access_info
            ;;
        test)
            check_prerequisites
            update_dependencies
            test_deployment
            ;;
        cleanup)
            cleanup
            ;;
        *)
            error "Invalid action: $ACTION"
            echo ""
            echo "Usage: $0 [dev|prod] [deploy|upgrade|test|cleanup]"
            echo ""
            echo "Arguments:"
            echo "  dev/prod    - Environment to deploy to (default: dev)"
            echo ""
            echo "Actions:"
            echo "  deploy      - Install operator, update dependencies, and deploy application"
            echo "  upgrade     - Update dependencies and upgrade existing deployment"
            echo "  test        - Test deployment with dry-run (no actual deployment)"
            echo "  cleanup     - Remove the application and clean up resources"
            echo ""
            echo "Examples:"
            echo "  $0 dev deploy      - Deploy to development environment"
            echo "  $0 prod upgrade    - Upgrade production deployment"
            echo "  $0 dev test        - Test development configuration"
            echo "  $0 dev cleanup     - Remove development deployment"
            echo ""
            exit 1
            ;;
    esac
}

main "$@"