#!/bin/bash
# Fresh installation script for SvelteHR on a new PC
# This script sets up everything needed for development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_header() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}▶${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    local all_ok=true

    # Check Node.js
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        print_success "Node.js installed: $node_version"
    else
        print_error "Node.js not installed"
        echo "  Install from: https://nodejs.org/ (version 18+)"
        all_ok=false
    fi

    # Check npm
    if command -v npm &> /dev/null; then
        local npm_version=$(npm --version)
        print_success "npm installed: v$npm_version"
    else
        print_error "npm not installed"
        all_ok=false
    fi

    # Check Docker
    if command -v docker &> /dev/null; then
        local docker_version=$(docker --version | cut -d' ' -f3 | tr -d ',')
        print_success "Docker installed: $docker_version"
    else
        print_error "Docker not installed"
        echo "  Install from: https://www.docker.com/get-started"
        all_ok=false
    fi

    # Check Docker Compose
    if command -v docker compose version &> /dev/null || command -v docker-compose &> /dev/null; then
        print_success "Docker Compose available"
    else
        print_error "Docker Compose not found"
        all_ok=false
    fi

    # Check if Docker daemon is running
    if docker ps &> /dev/null; then
        print_success "Docker daemon is running"
    else
        print_warning "Docker daemon not running"
        echo "  Start Docker Desktop or run: sudo systemctl start docker"
        all_ok=false
    fi

    if [ "$all_ok" = false ]; then
        print_error "Please install missing prerequisites before continuing"
        exit 1
    fi

    print_success "All prerequisites met"
}

# Install dependencies
install_dependencies() {
    print_header "Installing Dependencies"

    if [ -f "package.json" ]; then
        print_step "Installing frontend dependencies..."
        npm install
        print_success "Frontend dependencies installed"
    else
        print_error "package.json not found"
        exit 1
    fi

    if [ -d "backend" ] && [ -f "backend/package.json" ]; then
        print_step "Installing backend dependencies..."
        cd backend && npm install && cd ..
        print_success "Backend dependencies installed"
    else
        print_warning "Backend directory not found (optional)"
    fi
}

# Start Docker containers
start_containers() {
    print_header "Starting Docker Containers"

    print_step "Starting development containers..."

    if [ -f "dev-containers/docker-compose.dev.yml" ]; then
        cd dev-containers
        docker compose -f docker-compose.dev.yml up -d
        cd ..
        print_success "Development containers started"
    else
        print_error "dev-containers/docker-compose.dev.yml not found"
        exit 1
    fi

    print_step "Waiting for PostgreSQL to be ready (max 60 seconds)..."

    local max_attempts=60
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if docker exec sveltehr-postgres-dev pg_isready -U postgres -d hr_system > /dev/null 2>&1; then
            print_success "PostgreSQL is ready"
            break
        fi

        attempt=$((attempt + 1))
        echo -n "."
        sleep 1
    done

    if [ $attempt -eq $max_attempts ]; then
        print_error "PostgreSQL failed to start within 60 seconds"
        exit 1
    fi

    echo ""
}

# Initialize database
initialize_database() {
    print_header "Initializing Database"

    print_step "Applying database migrations..."

    if [ -f "scripts/init-db.sh" ]; then
        bash scripts/init-db.sh
        print_success "Database initialized with migrations"
    else
        print_error "scripts/init-db.sh not found"
        exit 1
    fi
}

# Verify installation
verify_installation() {
    print_header "Verifying Installation"

    # Check database connection
    print_step "Checking database connection..."
    if PGPASSWORD=postgres123 psql -h localhost -p 5433 -U postgres -d hr_system -c "SELECT 1;" > /dev/null 2>&1; then
        print_success "Database connection successful"
    else
        print_error "Cannot connect to database"
        return 1
    fi

    # Check tables exist
    print_step "Checking database schema..."
    local table_count=$(PGPASSWORD=postgres123 psql -h localhost -p 5433 -U postgres -d hr_system -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'hr_public';")

    if [ "$table_count" -gt 0 ]; then
        print_success "Database schema initialized ($table_count tables in hr_public)"
    else
        print_warning "No tables found in hr_public schema"
    fi

    # Check Redis
    print_step "Checking Redis connection..."
    if docker exec sveltehr-redis-dev redis-cli ping > /dev/null 2>&1; then
        print_success "Redis connection successful"
    else
        print_warning "Cannot connect to Redis"
    fi

    # Check containers
    print_step "Checking container status..."
    local running_containers=$(docker ps --filter "name=sveltehr" --format "{{.Names}}" | wc -l)
    print_success "$running_containers SvelteHR containers running"
}

# Show next steps
show_next_steps() {
    print_header "Installation Complete!"

    echo -e "${GREEN}Your SvelteHR development environment is ready!${NC}"
    echo ""
    echo "Next steps:"
    echo ""
    echo "  1. Start the development server:"
    echo -e "     ${CYAN}npm run dev${NC}"
    echo ""
    echo "  2. Or use the Makefile commands:"
    echo -e "     ${CYAN}make dev${NC}          # Start complete development environment"
    echo -e "     ${CYAN}make frontend-dev${NC} # Start only frontend (backend already running)"
    echo ""
    echo "  3. Access the application:"
    echo "     • Frontend:  http://localhost:5173"
    echo "     • Database:  localhost:5433 (postgres/postgres123)"
    echo "     • Redis:     localhost:6380"
    echo ""
    echo "  4. Useful commands:"
    echo -e "     ${CYAN}make help${NC}         # Show all available commands"
    echo -e "     ${CYAN}make db-shell${NC}     # Open PostgreSQL shell"
    echo -e "     ${CYAN}make db-status${NC}    # Check database status"
    echo ""
    echo "  5. SSH into containers (optional):"
    echo -e "     ${CYAN}make ssh-backend${NC}  # SSH into backend container"
    echo -e "     ${CYAN}make ssh-frontend${NC} # SSH into frontend container"
    echo "     (Credentials: dev/dev)"
    echo ""
}

# Main execution
main() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                                                       ║${NC}"
    echo -e "${CYAN}║        SvelteHR Fresh Installation Wizard             ║${NC}"
    echo -e "${CYAN}║                                                       ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
    echo ""

    # Confirm before starting
    echo "This script will set up SvelteHR for development on this PC."
    echo ""
    read -p "Continue? (y/N) " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Installation cancelled."
        exit 0
    fi

    # Execute installation steps
    check_prerequisites
    install_dependencies
    start_containers
    sleep 5  # Give containers a moment to fully initialize
    initialize_database
    verify_installation
    show_next_steps
}

# Run main function
main "$@"
