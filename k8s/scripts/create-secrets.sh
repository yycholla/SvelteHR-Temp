#!/bin/bash

# SvelteHR Secrets Creation Script
# Creates properly structured secrets for CloudNativePG and application components

set -e

ENVIRONMENT=${1:-dev}
NAMESPACE="sveltehr-${ENVIRONMENT}"

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

# Generate random password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Create CloudNativePG-compatible PostgreSQL secrets
create_postgres_secrets() {
    log "Creating PostgreSQL secrets for ${ENVIRONMENT}..."

    # Generate passwords if not provided
    POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-$(generate_password)}
    POSTGRES_SUPERUSER_PASSWORD=${POSTGRES_SUPERUSER_PASSWORD:-$(generate_password)}

    # Create app user secret (CloudNativePG format)
    # CloudNativePG expects: username, password, database (optional)
    kubectl create secret generic sveltehr-postgres-app-secret \
        --namespace=$NAMESPACE \
        --from-literal=username=hr_user \
        --from-literal=password=$POSTGRES_PASSWORD \
        --dry-run=client -o yaml | kubectl apply -f -

    # Create superuser secret (CloudNativePG format)
    kubectl create secret generic sveltehr-postgres-superuser-secret \
        --namespace=$NAMESPACE \
        --from-literal=username=postgres \
        --from-literal=password=$POSTGRES_SUPERUSER_PASSWORD \
        --dry-run=client -o yaml | kubectl apply -f -

    info "PostgreSQL secrets created"

    if [ "$ENVIRONMENT" = "dev" ]; then
        warn "Development passwords:"
        warn "  App user (hr_user): $POSTGRES_PASSWORD"
        warn "  Superuser (postgres): $POSTGRES_SUPERUSER_PASSWORD"
    fi
}

# Create application secrets
create_app_secrets() {
    log "Creating application secrets for ${ENVIRONMENT}..."

    # Generate secrets if not provided
    JWT_SECRET=${JWT_SECRET:-$(generate_password)}
    JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET:-$(generate_password)}
    SERVICE_AUTH_KEY=${SERVICE_AUTH_KEY:-$(generate_password)}
    POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-$(generate_password)}

    # Create main application secrets
    kubectl create secret generic sveltehr-secrets \
        --namespace=$NAMESPACE \
        --from-literal=postgres-password=$POSTGRES_PASSWORD \
        --from-literal=jwt-secret=$JWT_SECRET \
        --from-literal=jwt-refresh-secret=$JWT_REFRESH_SECRET \
        --from-literal=service-auth-key=$SERVICE_AUTH_KEY \
        --dry-run=client -o yaml | kubectl apply -f -

    info "Application secrets created"

    if [ "$ENVIRONMENT" = "dev" ]; then
        warn "Development secrets (store these securely):"
        warn "  JWT Secret: $JWT_SECRET"
        warn "  JWT Refresh Secret: $JWT_REFRESH_SECRET"
        warn "  Service Auth Key: $SERVICE_AUTH_KEY"
    fi
}

# Verify secrets exist
verify_secrets() {
    log "Verifying secrets in namespace ${NAMESPACE}..."

    local required_secrets=(
        "sveltehr-postgres-app-secret"
        "sveltehr-postgres-superuser-secret"
        "sveltehr-secrets"
    )

    local all_exist=true

    for secret in "${required_secrets[@]}"; do
        if kubectl get secret $secret -n $NAMESPACE &> /dev/null; then
            info "✓ Secret '$secret' exists"
        else
            error "✗ Secret '$secret' not found"
            all_exist=false
        fi
    done

    if [ "$all_exist" = false ]; then
        error "Some secrets are missing"
        exit 1
    fi

    log "All required secrets verified"
}

# Main execution
main() {
    echo "SvelteHR Secrets Creation"
    echo "========================="
    echo "Environment: ${ENVIRONMENT}"
    echo "Namespace: ${NAMESPACE}"
    echo ""

    # Check if namespace exists
    if ! kubectl get namespace $NAMESPACE &> /dev/null; then
        warn "Namespace $NAMESPACE does not exist yet"
        info "It will be created during deployment"
    fi

    if [ "$ENVIRONMENT" = "prod" ]; then
        warn "PRODUCTION ENVIRONMENT DETECTED"
        warn "Please set the following environment variables before running:"
        warn "  POSTGRES_PASSWORD, POSTGRES_SUPERUSER_PASSWORD"
        warn "  JWT_SECRET, JWT_REFRESH_SECRET, SERVICE_AUTH_KEY"
        echo ""
        read -p "Continue with production secret creation? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            info "Aborted"
            exit 0
        fi
    fi

    # Create secrets
    create_postgres_secrets
    create_app_secrets

    # Verify
    if kubectl get namespace $NAMESPACE &> /dev/null; then
        verify_secrets
    else
        info "Skipping verification - namespace will be created during deployment"
    fi

    log "Secrets creation completed!"
}

main "$@"
