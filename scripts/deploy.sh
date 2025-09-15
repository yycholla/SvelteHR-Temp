#!/bin/bash

# SvelteHR Production Deployment Script
# This script handles production deployments with safety checks and rollback capability

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DEPLOY_LOG="/var/log/sveltehr-deploy.log"
BACKUP_DIR="/opt/sveltehr-backups"
COMPOSE_FILE="docker-compose.prod.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        ERROR)   echo -e "${RED}[ERROR]${NC} $message" ;;
        SUCCESS) echo -e "${GREEN}[SUCCESS]${NC} $message" ;;
        WARNING) echo -e "${YELLOW}[WARNING]${NC} $message" ;;
        INFO)    echo -e "${BLUE}[INFO]${NC} $message" ;;
    esac
    
    echo "[$timestamp] [$level] $message" >> "$DEPLOY_LOG"
}

# Check if running as root
check_permissions() {
    if [[ $EUID -ne 0 ]]; then
        log ERROR "This script must be run as root or with sudo"
        exit 1
    fi
}

# Verify required tools are installed
check_dependencies() {
    local deps=("docker" "docker-compose" "curl" "jq" "pg_dump")
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            log ERROR "Required dependency '$dep' is not installed"
            exit 1
        fi
    done
    
    log SUCCESS "All dependencies are available"
}

# Load environment variables
load_environment() {
    if [[ -f "$PROJECT_DIR/.env.production" ]]; then
        source "$PROJECT_DIR/.env.production"
        log SUCCESS "Production environment loaded"
    else
        log ERROR "Production environment file not found at $PROJECT_DIR/.env.production"
        exit 1
    fi
}

# Create backup of current database
create_backup() {
    log INFO "Creating database backup..."
    
    mkdir -p "$BACKUP_DIR"
    local backup_file="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).sql"
    
    if docker-compose -f "$PROJECT_DIR/$COMPOSE_FILE" exec -T postgres pg_dump \
        -U "$POSTGRES_USER" "$POSTGRES_DB" > "$backup_file"; then
        log SUCCESS "Database backup created: $backup_file"
        export BACKUP_FILE="$backup_file"
    else
        log ERROR "Failed to create database backup"
        exit 1
    fi
}

# Pull latest Docker images
pull_images() {
    log INFO "Pulling latest Docker images..."
    
    if docker-compose -f "$PROJECT_DIR/$COMPOSE_FILE" pull; then
        log SUCCESS "Docker images pulled successfully"
    else
        log ERROR "Failed to pull Docker images"
        exit 1
    fi
}

# Run database migrations
run_migrations() {
    log INFO "Running database migrations..."
    
    # Apply SQL migrations
    if docker-compose -f "$PROJECT_DIR/$COMPOSE_FILE" exec -T postgres \
        psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /migrations/latest.sql; then
        log SUCCESS "SQL migrations applied"
    else
        log WARNING "SQL migrations may have failed - check manually"
    fi
    
    # Apply Hasura metadata
    if docker-compose -f "$PROJECT_DIR/$COMPOSE_FILE" run --rm hasura-cli \
        metadata apply --skip-update-check; then
        log SUCCESS "Hasura metadata applied"
    else
        log ERROR "Failed to apply Hasura metadata"
        return 1
    fi
}

# Health check function
health_check() {
    local service="$1"
    local url="$2"
    local max_attempts="${3:-30}"
    local sleep_time="${4:-10}"
    
    log INFO "Performing health check for $service..."
    
    for ((i=1; i<=max_attempts; i++)); do
        if curl -f -s "$url" > /dev/null; then
            log SUCCESS "$service health check passed"
            return 0
        fi
        
        if [[ $i -eq $max_attempts ]]; then
            log ERROR "$service health check failed after $max_attempts attempts"
            return 1
        fi
        
        log INFO "Health check attempt $i/$max_attempts failed, waiting $sleep_time seconds..."
        sleep $sleep_time
    done
}

# Deploy services with zero-downtime
deploy_services() {
    log INFO "Deploying services with zero-downtime strategy..."
    
    # Start new instances alongside existing ones
    docker-compose -f "$PROJECT_DIR/$COMPOSE_FILE" up -d --scale frontend=2 --scale auth-service=2 --no-recreate
    
    # Wait for new instances to be ready
    sleep 30
    
    # Health check new instances
    if health_check "Frontend" "http://localhost:3000/health" && \
       health_check "Auth Service" "http://localhost:3001/health"; then
        
        # Stop old instances
        docker-compose -f "$PROJECT_DIR/$COMPOSE_FILE" up -d --scale frontend=1 --scale auth-service=1
        log SUCCESS "Zero-downtime deployment completed"
    else
        log ERROR "Health checks failed, rolling back"
        docker-compose -f "$PROJECT_DIR/$COMPOSE_FILE" up -d --scale frontend=1 --scale auth-service=1
        return 1
    fi
}

# Rollback function
rollback() {
    log WARNING "Initiating rollback procedure..."
    
    # Restore database if backup exists
    if [[ -n "${BACKUP_FILE:-}" ]] && [[ -f "$BACKUP_FILE" ]]; then
        log INFO "Restoring database from backup: $BACKUP_FILE"
        docker-compose -f "$PROJECT_DIR/$COMPOSE_FILE" exec -T postgres \
            psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$BACKUP_FILE"
        log SUCCESS "Database restored from backup"
    fi
    
    # Restart services with previous images
    log INFO "Restarting services with previous configuration..."
    docker-compose -f "$PROJECT_DIR/$COMPOSE_FILE" down
    docker-compose -f "$PROJECT_DIR/$COMPOSE_FILE" up -d
    
    log WARNING "Rollback completed - please verify system status"
}

# Cleanup old Docker images and backups
cleanup() {
    log INFO "Performing cleanup..."
    
    # Remove unused Docker images
    docker image prune -f
    
    # Remove old backups (keep last 30 days)
    find "$BACKUP_DIR" -name "backup-*.sql" -mtime +30 -delete
    
    log SUCCESS "Cleanup completed"
}

# Send deployment notification
send_notification() {
    local status="$1"
    local message="$2"
    
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$SLACK_WEBHOOK_URL" || true
    fi
    
    if [[ -n "${SMTP_HOST:-}" ]]; then
        echo "$message" | mail -s "SvelteHR Deployment $status" admin@sveltehr.com || true
    fi
}

# Main deployment function
main() {
    local start_time=$(date +%s)
    
    log INFO "Starting SvelteHR production deployment..."
    log INFO "Deployment started at $(date)"
    
    # Trap to handle errors and cleanup
    trap 'log ERROR "Deployment failed - consider running rollback"; exit 1' ERR
    
    # Pre-deployment checks
    check_permissions
    check_dependencies
    load_environment
    
    # Deployment steps
    create_backup
    pull_images
    
    if run_migrations && deploy_services; then
        # Post-deployment verification
        if health_check "Application" "https://${DOMAIN:-localhost}/health" && \
           health_check "GraphQL" "https://${DOMAIN:-localhost}/api/graphql" 5 5; then
            
            cleanup
            
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            
            log SUCCESS "Deployment completed successfully in ${duration} seconds"
            send_notification "SUCCESS" "✅ SvelteHR deployment completed successfully in ${duration}s"
        else
            log ERROR "Post-deployment health checks failed"
            rollback
            send_notification "FAILED" "❌ SvelteHR deployment failed during health checks - rolled back"
            exit 1
        fi
    else
        log ERROR "Deployment failed during service updates"
        rollback
        send_notification "FAILED" "❌ SvelteHR deployment failed during service updates - rolled back"
        exit 1
    fi
}

# Script entry point
case "${1:-deploy}" in
    deploy)
        main
        ;;
    rollback)
        rollback
        ;;
    health-check)
        health_check "Application" "http://localhost/health"
        health_check "Auth Service" "http://localhost/api/auth/health"
        health_check "GraphQL" "http://localhost/api/graphql"
        ;;
    backup)
        create_backup
        ;;
    cleanup)
        cleanup
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|health-check|backup|cleanup}"
        exit 1
        ;;
esac