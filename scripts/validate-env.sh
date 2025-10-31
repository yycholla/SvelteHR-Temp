#!/usr/bin/env bash
# Environment Configuration Validation Script
# Validates that all required environment variables are present and properly formatted
# Exit codes: 0 = success, 1 = validation failed

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validation counters
ERRORS=0
WARNINGS=0

# Function to check if variable exists and is not empty
check_required() {
    local var_name="$1"
    local var_value="${!var_name:-}"

    if [ -z "$var_value" ]; then
        echo -e "${RED}❌ ERROR: Required variable $var_name is not set${NC}"
        ((ERRORS++))
        return 1
    else
        echo -e "${GREEN}✓${NC} $var_name is set"
        return 0
    fi
}

# Function to check if variable matches pattern
check_pattern() {
    local var_name="$1"
    local pattern="$2"
    local description="$3"
    local var_value="${!var_name:-}"

    if [ -z "$var_value" ]; then
        return 0  # Skip pattern check if variable is empty (will be caught by check_required)
    fi

    if [[ ! "$var_value" =~ $pattern ]]; then
        echo -e "${RED}❌ ERROR: $var_name does not match required pattern ($description)${NC}"
        ((ERRORS++))
        return 1
    fi
    return 0
}

# Function to check password strength
check_password_strength() {
    local var_name="$1"
    local min_length="${2:-16}"
    local var_value="${!var_name:-}"

    if [ -z "$var_value" ]; then
        return 0  # Skip if variable is empty
    fi

    if [ ${#var_value} -lt $min_length ]; then
        echo -e "${RED}❌ ERROR: $var_name must be at least $min_length characters (current: ${#var_value})${NC}"
        ((ERRORS++))
        return 1
    fi

    # Check for insecure default values
    if [[ "$var_value" =~ ^(postgres|admin|password|secret|test|dev|development|production)$ ]]; then
        echo -e "${RED}❌ ERROR: $var_name contains an insecure default value${NC}"
        ((ERRORS++))
        return 1
    fi

    return 0
}

# Function to validate domain
check_domain() {
    local domain="$DOMAIN"

    if [ -z "$domain" ]; then
        echo -e "${RED}❌ ERROR: DOMAIN variable is not set${NC}"
        ((ERRORS++))
        return 1
    fi

    if [ "$domain" = "localhost" ]; then
        echo -e "${GREEN}✓${NC} DOMAIN set to localhost (self-signed certificates will be used)"
        return 0
    fi

    # Validate domain format (basic check)
    if [[ ! "$domain" =~ ^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$ ]]; then
        echo -e "${YELLOW}⚠ WARNING: DOMAIN format may be invalid: $domain${NC}"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✓${NC} DOMAIN is valid: $domain"
    fi

    return 0
}

echo "================================"
echo "Environment Validation Script"
echo "================================"
echo ""

# Load environment file if provided
if [ $# -gt 0 ] && [ -f "$1" ]; then
    echo "Loading environment from: $1"
    set -a
    source "$1"
    set +a
    echo ""
fi

echo "Validating required environment variables..."
echo ""

# Domain Configuration
echo "--- Domain Configuration ---"
check_domain

# Database Configuration
echo ""
echo "--- Database Configuration ---"
check_required "POSTGRES_DB"
check_required "POSTGRES_USER"
check_required "POSTGRES_PASSWORD"
check_password_strength "POSTGRES_PASSWORD" 16

# Check that user is not 'root'
if [ "${POSTGRES_USER:-}" = "root" ]; then
    echo -e "${RED}❌ ERROR: POSTGRES_USER cannot be 'root'${NC}"
    ((ERRORS++))
fi

# Backend Configuration
echo ""
echo "--- Backend Configuration ---"
check_required "DATABASE_URL"
check_required "REDIS_URL"
check_required "JWT_SECRET"
check_password_strength "JWT_SECRET" 32
check_required "SERVICE_AUTH_KEY"
check_password_strength "SERVICE_AUTH_KEY" 32
check_required "CORS_ALLOWED_ORIGINS"
check_required "RUST_LOG"

# Frontend Configuration
echo ""
echo "--- Frontend Configuration ---"
check_required "NODE_ENV"
check_required "PUBLIC_API_URL"
check_required "HOST"
check_required "PORT"

# CI/CD Configuration (optional for local deployment)
echo ""
echo "--- CI/CD Configuration (optional) ---"
if [ -n "${GITLAB_PROJECT:-}" ]; then
    echo -e "${GREEN}✓${NC} GITLAB_PROJECT is set"
    check_required "IMAGE_TAG"
else
    echo -e "${YELLOW}ℹ${NC} GITLAB_PROJECT not set (required for CI/CD deployments)"
fi

# TLS Configuration (optional)
echo ""
echo "--- TLS Configuration (optional) ---"
if [ "$DOMAIN" != "localhost" ]; then
    if [ -z "${TLS_EMAIL:-}" ]; then
        echo -e "${YELLOW}⚠ WARNING: TLS_EMAIL not set (required for Let's Encrypt in production mode)${NC}"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✓${NC} TLS_EMAIL is set"
        check_pattern "TLS_EMAIL" "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$" "valid email address"
    fi
fi

# Summary
echo ""
echo "================================"
echo "Validation Summary"
echo "================================"
echo -e "Errors:   ${RED}$ERRORS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ Validation FAILED - Please fix the errors above${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Validation PASSED${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠ Please review the warnings above${NC}"
    fi
    exit 0
fi
