#!/bin/bash

# MountainHR Frontend - Production Deployment Script
# This script handles the complete production deployment process

set -e  # Exit on any error

# Configuration
PROJECT_NAME="mountainhr-frontend"
IMAGE_NAME="mountainhr-frontend"
VERSION=${1:-"latest"}
DOCKER_REGISTRY=${DOCKER_REGISTRY:-""}
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠ $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗ $1${NC}"
    exit 1
}

# Check dependencies
check_dependencies() {
    log "Checking dependencies..."
    
    command -v docker >/dev/null 2>&1 || error "Docker is not installed"
    command -v docker-compose >/dev/null 2>&1 || error "Docker Compose is not installed"
    command -v doppler >/dev/null 2>&1 || warn "Doppler CLI not found - environment variables must be set manually"
    
    success "Dependencies check completed"
}

# Validate environment
validate_environment() {
    log "Validating environment configuration..."
    
    # Check for required environment variables
    required_vars=(
        "DOPPLER_TOKEN"
        "REDIS_PASSWORD"
        "GRAFANA_PASSWORD"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            error "Required environment variable $var is not set"
        fi
    done
    
    # Check for optional but recommended variables
    recommended_vars=(
        "BACKUP_S3_BUCKET"
        "SENTRY_DSN"
        "ANALYTICS_ID"
    )
    
    for var in "${recommended_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            warn "Recommended environment variable $var is not set"
        fi
    done
    
    success "Environment validation completed"
}

# Create backup
create_backup() {
    log "Creating backup before deployment..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup current Docker images
    if docker images | grep -q "$IMAGE_NAME"; then
        log "Backing up current Docker image..."
        docker save "$IMAGE_NAME:latest" | gzip > "$BACKUP_DIR/image-backup.tar.gz"
        success "Docker image backed up"
    fi
    
    # Backup environment files
    if [[ -f ".env.production" ]]; then
        cp .env.production "$BACKUP_DIR/"
        success "Environment file backed up"
    fi
    
    # Backup configuration files
    if [[ -d "nginx" ]]; then
        cp -r nginx "$BACKUP_DIR/"
        success "Nginx configuration backed up"
    fi
    
    if [[ -d "monitoring" ]]; then
        cp -r monitoring "$BACKUP_DIR/"
        success "Monitoring configuration backed up"
    fi
    
    success "Backup created in $BACKUP_DIR"
}

# Build application
build_application() {
    log "Building application..."
    
    # Run pre-build checks
    log "Running pre-build checks..."
    npm run check || error "TypeScript/Svelte check failed"
    npm run lint || error "Linting check failed"
    
    # Run tests
    log "Running tests..."
    npm run test:unit -- --run || error "Unit tests failed"
    
    # Build Docker image
    log "Building Docker image..."
    if [[ -n "$DOCKER_REGISTRY" ]]; then
        IMAGE_TAG="$DOCKER_REGISTRY/$IMAGE_NAME:$VERSION"
    else
        IMAGE_TAG="$IMAGE_NAME:$VERSION"
    fi
    
    docker build --target runtime --no-cache -t "$IMAGE_TAG" .
    
    # Tag as latest
    docker tag "$IMAGE_TAG" "$IMAGE_NAME:latest"
    
    success "Application built successfully"
}

# Deploy infrastructure
deploy_infrastructure() {
    log "Deploying infrastructure..."
    
    # Create necessary directories
    mkdir -p nginx/logs monitoring/grafana/{dashboards,datasources}
    
    # Generate nginx configuration if it doesn't exist
    if [[ ! -f "nginx/nginx.conf" ]]; then
        log "Generating nginx configuration..."
        cat > nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server frontend-1:3000 max_fails=3 fail_timeout=30s;
        server frontend-2:3000 max_fails=3 fail_timeout=30s;
    }

    server {
        listen 80;
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
        
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 60s;
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
        }
    }
}
EOF
        success "Nginx configuration generated"
    fi
    
    success "Infrastructure deployment preparation completed"
}

# Deploy application
deploy_application() {
    log "Deploying application..."
    
    # Stop existing services gracefully
    if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
        log "Stopping existing services..."
        docker-compose -f docker-compose.prod.yml down --timeout 30
        success "Existing services stopped"
    fi
    
    # Start new services
    log "Starting new services..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    timeout=300  # 5 minutes timeout
    elapsed=0
    interval=10
    
    while [[ $elapsed -lt $timeout ]]; do
        if docker-compose -f docker-compose.prod.yml ps | grep -E "(healthy|Up)" | wc -l | grep -q "6"; then
            success "All services are healthy"
            break
        fi
        
        sleep $interval
        elapsed=$((elapsed + interval))
        log "Waiting for services to be ready... (${elapsed}s/${timeout}s)"
    done
    
    if [[ $elapsed -ge $timeout ]]; then
        error "Services failed to start within timeout period"
    fi
    
    success "Application deployed successfully"
}

# Run health checks
run_health_checks() {
    log "Running post-deployment health checks..."
    
    # Check frontend health
    log "Checking frontend health..."
    for i in {1..5}; do
        if curl -f http://localhost:80/health >/dev/null 2>&1; then
            success "Frontend health check passed"
            break
        fi
        
        if [[ $i -eq 5 ]]; then
            error "Frontend health check failed after 5 attempts"
        fi
        
        sleep 5
    done
    
    # Check monitoring services
    log "Checking monitoring services..."
    if curl -f http://localhost:9090/-/healthy >/dev/null 2>&1; then
        success "Prometheus health check passed"
    else
        warn "Prometheus health check failed"
    fi
    
    if curl -f http://localhost:3100/ready >/dev/null 2>&1; then
        success "Loki health check passed"
    else
        warn "Loki health check failed"
    fi
    
    success "Health checks completed"
}

# Performance tests
run_performance_tests() {
    log "Running performance tests..."
    
    # Basic load test with curl
    log "Running basic load test..."
    for i in {1..10}; do
        response_time=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:80/)
        log "Request $i response time: ${response_time}s"
        
        if (( $(echo "$response_time > 2.0" | bc -l) )); then
            warn "Response time ${response_time}s is above 2s threshold"
        fi
    done
    
    success "Performance tests completed"
}

# Cleanup old images and containers
cleanup() {
    log "Cleaning up old images and containers..."
    
    # Remove old containers
    docker container prune -f
    
    # Remove old images (keep last 3 versions)
    docker images "$IMAGE_NAME" --format "table {{.Repository}}:{{.Tag}}\t{{.ID}}" | \
        tail -n +2 | head -n -3 | awk '{print $2}' | xargs -r docker rmi
    
    success "Cleanup completed"
}

# Send deployment notification
send_notification() {
    log "Sending deployment notification..."
    
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"MountainHR Frontend deployed successfully to production (version: $VERSION)\"}" \
            "$SLACK_WEBHOOK_URL"
        success "Slack notification sent"
    fi
    
    if [[ -n "$DISCORD_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"content\":\"🚀 MountainHR Frontend deployed successfully to production (version: $VERSION)\"}" \
            "$DISCORD_WEBHOOK_URL"
        success "Discord notification sent"
    fi
}

# Rollback function
rollback() {
    error_msg=${1:-"Deployment failed"}
    error "$error_msg - Starting rollback..."
    
    log "Rolling back to previous version..."
    
    # Stop current services
    docker-compose -f docker-compose.prod.yml down --timeout 30
    
    # Restore from backup if available
    if [[ -f "$BACKUP_DIR/image-backup.tar.gz" ]]; then
        log "Restoring previous Docker image..."
        gunzip -c "$BACKUP_DIR/image-backup.tar.gz" | docker load
    fi
    
    # Start services with previous image
    docker-compose -f docker-compose.prod.yml up -d
    
    error "Rollback completed"
}

# Trap errors and run rollback
trap 'rollback "Deployment script interrupted"' INT TERM ERR

# Main deployment flow
main() {
    log "Starting MountainHR Frontend production deployment..."
    log "Version: $VERSION"
    log "Timestamp: $(date)"
    
    check_dependencies
    validate_environment
    create_backup
    build_application
    deploy_infrastructure
    deploy_application
    run_health_checks
    run_performance_tests
    cleanup
    send_notification
    
    success "🎉 Production deployment completed successfully!"
    log "Services are running at:"
    log "  - Frontend: http://localhost:80"
    log "  - Prometheus: http://localhost:9090"
    log "  - Grafana: http://localhost:3000 (admin/${GRAFANA_PASSWORD})"
    log "  - Logs: docker-compose -f docker-compose.prod.yml logs -f"
}

# Handle command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        if [[ -z "$2" ]]; then
            error "Please specify backup directory for rollback"
        fi
        BACKUP_DIR="$2"
        rollback "Manual rollback requested"
        ;;
    "health")
        run_health_checks
        ;;
    "cleanup")
        cleanup
        ;;
    *)
        echo "Usage: $0 [deploy|rollback|health|cleanup] [version|backup_dir]"
        echo ""
        echo "Commands:"
        echo "  deploy [version]  - Deploy application (default: latest)"
        echo "  rollback <dir>    - Rollback to backup in specified directory"
        echo "  health            - Run health checks only"
        echo "  cleanup           - Clean up old images and containers"
        exit 1
        ;;
esac