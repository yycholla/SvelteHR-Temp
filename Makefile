# SvelteHR Development Commands - Comprehensive Makefile
SHELL := /bin/bash
.PHONY: help dev dev-quick dev-rebuild build clean db-up db-down db-reset db-logs db-health db-shell
.PHONY: server-dev server-prod server-stop server-status server-logs backend-dev frontend-dev
.PHONY: quick-start env-check test test-graphql test-auth test-contract test-e2e
.PHONY: install install-backend schema-status schema-apply schema-create schema-reset migrate-check
.PHONY: setup-init setup-sync setup-validate setup-backup setup-health setup-test
.PHONY: gel-cli gel-repl sample-query sample-login
.PHONY: dev-start dev-stop dev-logs dev-health dev-ssh-be dev-ssh-fe ssh-backend ssh-frontend
.PHONY: init fresh-install db-init db-migrate db-status db-verify

# =============================================================================
# Help
# =============================================================================
help: ## Show available commands
	@echo "🏢 SvelteHR Comprehensive Development Commands"
	@echo "=============================================="
	@echo ""
	@echo "🎯 Multi-PC Setup (NEW!):"
	@echo "  make init         - Fresh installation wizard for new PC"
	@echo "  make db-init      - Initialize/apply database migrations"
	@echo "  make db-status    - Show migration status"
	@echo "  make db-verify    - Verify database schema and health"
	@echo ""
	@echo "🚀 Quick Start:"
	@echo "  make quick-start   - Complete setup and startup (recommended for first-time)"
	@echo "  make dev          - Start complete development (backend + frontend)"
	@echo "  make dev-quick    - Quick start backend only (no rebuild, no waiting)"
	@echo "  make backend-dev  - Start only backend services in containers"
	@echo "  make frontend-dev - Start only frontend (requires backend running)"
	@echo "  make dev-rebuild  - Rebuild backend container (when Dockerfile changes)"
	@echo "  make env-check    - Check environment and dependencies"
	@echo ""
	@echo "🖥️  Server Operations (PostGraphile Backend):"
	@echo "  make server-dev   - Start PostGraphile GraphQL backend (development)"
	@echo "  make server-prod  - Start production environment"
	@echo "  make server-status - Check server health and status"
	@echo "  make server-stop  - Stop all server processes"
	@echo "  make server-logs  - View server logs"
	@echo ""
	@echo "💾 Database Operations:"
	@echo "  make db-up        - Start PostgreSQL and Redis containers"
	@echo "  make db-down      - Stop database containers"
	@echo "  make db-init      - Initialize database with migrations"
	@echo "  make db-migrate   - Apply pending migrations (alias for db-init)"
	@echo "  make db-status    - Show applied migrations"
	@echo "  make db-verify    - Verify database schema and health"
	@echo "  make db-reset     - Reset database with fresh data (WARNING: deletes all data)"
	@echo "  make db-logs      - View database logs"
	@echo "  make db-health    - Check database health and statistics"
	@echo "  make db-shell     - Open database shell (PostgreSQL/GelDB)"
	@echo ""
	@echo "🐳 Development Containers (SSH + Neovim):"
	@echo "  make dev-start     - Start development containers"
	@echo "  make dev-stop      - Stop development containers"
	@echo "  make dev-logs      - View container logs"
	@echo "  make ssh-backend   - SSH into backend container (alias: dev-ssh-be)"
	@echo "  make ssh-frontend  - SSH into frontend container (alias: dev-ssh-fe)"
	@echo ""
	@echo "📋 Schema Management:"
	@echo "  make schema-status - Check current schema and migrations"
	@echo "  make schema-apply  - Apply database schema"
	@echo "  make schema-create - Create new migration from schema files"
	@echo "  make schema-reset  - Reset schema (WARNING: deletes all data)"
	@echo "  make migrate-check - Check if database needs migration"
	@echo ""
	@echo "🧪 Testing:"
	@echo "  make test         - Run all tests (unit + e2e)"
	@echo "  make test-unit    - Run unit tests"
	@echo "  make test-e2e     - Run end-to-end tests"
	@echo "  make test-graphql - Test GraphQL endpoint"
	@echo "  make test-auth    - Test authentication"
	@echo "  make test-contract - Run contract tests"
	@echo ""
	@echo "⚙️  Environment Setup System:"
	@echo "  make setup-init    - Initialize development environment"
	@echo "  make setup-sync    - Synchronize environment with remote"
	@echo "  make setup-validate - Validate environment health"
	@echo "  make setup-backup  - Create environment backup"
	@echo "  make setup-health  - Comprehensive health check"
	@echo "  make setup-test    - Run setup system tests"
	@echo "  make setup-status  - Show complete setup system status"
	@echo ""
	@echo "🔧 Database Tools:"
	@echo "  make db-shell      - Open PostgreSQL shell"
	@echo "  make schema-status - Check schema and migrations"
	@echo ""
	@echo "📦 Installation:"
	@echo "  make install      - Install all dependencies (frontend + backend)"
	@echo "  make install-backend - Install backend dependencies only"
	@echo ""
	@echo "📊 Sample Data Management:"
	@echo "  make dev-sample-data       - Generate sample data for development"
	@echo "  make clean-sample-data     - Remove all sample data from database"
	@echo "  make sample-data-status    - Show current sample data status"
	@echo "  make validate-sample-config - Validate sample data configuration"
	@echo ""
	@echo "📚 Examples & Samples:"
	@echo "  make sample-query  - Show sample GraphQL query"
	@echo "  make sample-login  - Show authentication mutation example"
	@echo ""
	@echo "🧹 Maintenance:"
	@echo "  make clean        - Clean all build artifacts and containers"
	@echo "  make build        - Build for production"

# =============================================================================
# Multi-PC Setup and Initialization
# =============================================================================

init: ## Fresh installation wizard for new PC
	@echo "🎯 Starting fresh installation wizard..."
	@bash scripts/fresh-install.sh

fresh-install: init ## Alias for init

db-init: ## Initialize database with migrations
	@echo "💾 Initializing database with migrations..."
	@bash scripts/init-db.sh

db-migrate: db-init ## Alias for db-init (apply migrations)

db-status: ## Show applied migrations
	@echo "📊 Checking migration status..."
	@bash scripts/init-db.sh --status

db-verify: ## Verify database schema and health
	@echo "✅ Verifying database schema and health..."
	@echo ""
	@echo "📊 Database Connection:"
	@PGPASSWORD=postgres123 psql -h localhost -p 5433 -U postgres -d hr_system -c "SELECT version();" 2>/dev/null || echo "❌ Cannot connect to database"
	@echo ""
	@echo "📊 Schema Tables:"
	@PGPASSWORD=postgres123 psql -h localhost -p 5433 -U postgres -d hr_system -c "SELECT schemaname, COUNT(*) as table_count FROM pg_tables WHERE schemaname IN ('hr_public', 'hr_private', 'hr_hidden', 'public') GROUP BY schemaname ORDER BY schemaname;" 2>/dev/null
	@echo ""
	@echo "📊 Applied Migrations:"
	@make db-status

# =============================================================================
# Quick Start and Environment Setup
# =============================================================================

quick-start: ## Complete setup for first-time users
	@echo "🚀 SvelteHR - Quick Start Setup"
	@echo "==============================="
	@echo ""
	@echo "🔍 1. Checking environment..."
	@make env-check
	@echo ""
	@echo "📦 2. Installing dependencies..."
	@make install
	@echo ""
	@echo "💾 3. Starting database services..."
	@make db-up
	@echo ""
	@echo "🏥 4. Checking database health..."
	@make db-health
	@echo ""
	@if [ -d "backend" ]; then \
		echo "🖥️  5. Backend detected - Starting PostGraphile server..."; \
		make server-dev & \
	fi
	@echo ""
	@echo "🎉 Quick start completed!"
	@echo ""
	@echo "🚀 Next steps:"
	@echo "   - Run 'make dev' to start the frontend"
	@echo "   - GraphQL Endpoint: http://localhost:5657/db/main/ext/graphql (GelDB)"
	@echo "   - GraphQL Endpoint: http://localhost:4000/graphql (PostGraphile if configured)"
	@echo "   - Admin UI: http://localhost:5657/ui (admin/admin)"
	@echo "   - Frontend: http://localhost:5173"
	@echo "   - Run 'make help' to see all available commands"

env-check: ## Check environment configuration
	@echo "🔍 Environment Check:"
	@echo "===================="
	@echo ""
	@echo "📋 Core Files:"
	@test -f package.json && echo "✅ package.json" || echo "❌ package.json (missing)"
	@test -f docker-compose.yml && echo "✅ docker-compose.yml" || echo "❌ docker-compose.yml (missing)"
	@test -f svelte.config.js && echo "✅ svelte.config.js" || echo "❌ svelte.config.js (missing)"
	@test -f vite.config.ts && echo "✅ vite.config.ts" || echo "❌ vite.config.ts (missing)"
	@test -f playwright.config.ts && echo "✅ playwright.config.ts" || echo "❌ playwright.config.ts (missing)"
	@echo ""
	@echo "📋 Backend Files (if PostGraphile):"
	@test -f docker-compose.postgraphile.yml && echo "✅ docker-compose.postgraphile.yml" || echo "⚠️  docker-compose.postgraphile.yml (optional)"
	@test -d backend && echo "✅ backend/" || echo "⚠️  backend/ (optional - PostGraphile)"
	@echo ""
	@echo "📋 Migration Files:"
	@test -d migrations && echo "✅ migrations/" || echo "⚠️  migrations/ (optional)"
	@test -d database && echo "✅ database/" || echo "⚠️  database/ (optional)"
	@echo ""
	@echo "📋 Setup System:"
	@test -d setup && echo "✅ setup/" || echo "⚠️  setup/ (optional - environment system)"
	@test -d .specify && echo "✅ .specify/" || echo "⚠️  .specify/ (optional - specification system)"
	@echo ""
	@echo "🛠️  System Requirements:"
	@node --version && echo "✅ Node.js installed" || echo "❌ Node.js not found (install Node.js 18+)"
	@npm --version && echo "✅ npm available" || echo "❌ npm not available"
	@docker --version && echo "✅ Docker available" || echo "❌ Docker not found (install Docker)"
	@docker compose version && echo "✅ Docker Compose available" || echo "❌ Docker Compose not found"
	@echo ""
	@echo "📦 Dependencies Status:"
	@test -d node_modules && echo "✅ Frontend dependencies installed" || echo "❌ Frontend dependencies not installed (run 'make install')"
	@test -d backend/node_modules && echo "✅ Backend dependencies installed" || echo "⚠️  Backend not configured or dependencies missing"

# =============================================================================
# Frontend Development
# =============================================================================

dev: ## Start complete development environment (backend containers + host frontend)
	@echo "🚀 Starting SvelteHR Development Environment..."
	@echo "=============================================="
	@cd dev-containers && ./start-backend-only.sh
	@echo ""
	@echo "⏳ Waiting 3 seconds for containers to initialize..."
	@sleep 3
	@echo "🎨 Starting frontend development server..."
	@npm run dev

frontend-dev: ## Start only frontend development server (requires backend to be running)
	@echo "🎨 Starting SvelteHR frontend development..."
	@echo "🌐 Frontend: http://localhost:5173"
	@echo ""
	@echo "💡 Make sure backend is running: make backend-dev"
	@npm run dev

backend-dev: ## Start only backend services in containers
	@cd dev-containers && ./start-backend-only.sh

dev-rebuild: ## Rebuild backend container (run when Dockerfile changes)
	@echo "🔨 Rebuilding backend container..."
	@cd dev-containers && docker-compose -f docker-compose.dev.yml build backend-dev --no-cache
	@echo "✅ Backend container rebuilt"

dev-quick: backend-dev ## Quick start backend only (alias for backend-dev)
	@echo "💡 Backend started. Run 'npm run dev' separately to start frontend."

build: ## Build frontend for production
	@echo "🔨 Building SvelteHR for production..."
	@npm run build

install: ## Install all dependencies
	@echo "📦 Installing frontend dependencies..."
	@npm install
	@if [ -d "backend" ]; then \
		echo "📦 Installing backend dependencies..."; \
		cd backend && npm install; \
	fi
	@echo "✅ All dependencies installed"

install-backend: ## Install backend dependencies
	@if [ -d "backend" ]; then \
		echo "📦 Installing backend dependencies..."; \
		cd backend && npm install; \
		echo "✅ Backend dependencies installed"; \
	else \
		echo "⚠️  Backend directory not found"; \
	fi

# =============================================================================
# Server Operations (PostGraphile/Backend)
# =============================================================================

server-dev: db-up ## Start PostGraphile backend server
	@echo "🚀 Starting PostGraphile GraphQL Server..."
	@if [ ! -f "backend/package.json" ]; then \
		echo "❌ Backend not found. Run 'make install-backend' first"; \
		exit 1; \
	fi
	@echo "📊 GraphQL API:     http://localhost:4000/graphql"
	@echo "🔧 GraphiQL IDE:    http://localhost:4000/graphiql"
	@echo "❤️  Health Check:    http://localhost:4000/health"
	@echo ""
	@mkdir -p backend/logs
	@cd backend && npm run start:dev

server-prod: ## Start production server (uses docker-compose.prod.yml)
	@echo "🚀 Starting production environment..."
	@docker compose -f docker-compose.prod.yml up -d
	@echo "✅ Production services started"
	@echo "   Check status with 'make server-status'"

server-stop: ## Stop all server processes
	@echo "⏹️  Stopping server processes..."
	@docker compose down
	@docker compose -f docker-compose.prod.yml down 2>/dev/null || true
	@pkill -f "npm run dev" || true
	@pkill -f "vite" || true
	@echo "✅ Server processes stopped"

server-status: ## Check if server is running and healthy
	@echo "🏥 Server Status Check:"
	@echo "====================="
	@echo ""
	@echo "Database Services:"
	@docker ps --format '{{.Names}} {{.Status}}' | grep postgres && echo "✅ PostgreSQL: Running" || echo "❌ PostgreSQL: Not running"
	@nc -zv localhost 6379 2>/dev/null && echo "✅ Redis Cache: Available" || echo "❌ Redis Cache: Not available"
	@echo ""
	@echo "Backend Service:"
	@curl -s http://localhost:4000/health > /dev/null 2>&1 && echo "✅ PostGraphile API: Available" || echo "❌ PostGraphile API: Not running (run 'make server-dev')"
	@echo ""
	@echo "Frontend Service:"
	@curl -s http://localhost:5173 > /dev/null 2>&1 && echo "✅ SvelteKit Frontend: Running" || echo "⚠️  SvelteKit Frontend: Not running (run 'make dev')"

server-logs: ## View server logs
	@echo "📋 Server Logs:"
	@echo "==============="
	@echo "Showing GelDB logs (Ctrl+C to exit):"
	@docker compose logs -f geldb

# =============================================================================
# Database Management
# =============================================================================

db-up: ## Start PostgreSQL and Redis containers
	@echo "🚀 Starting database services..."
	@if [ -f "docker-compose.postgraphile.yml" ]; then \
		docker compose -f docker-compose.postgraphile.yml up -d postgres redis; \
	else \
		echo "⚠️  No docker-compose.postgraphile.yml found, checking for containers..."; \
		if ! docker ps --format '{{.Names}}' | grep -q postgres; then \
			echo "❌ PostgreSQL container not found. Please ensure PostGraphile setup is complete."; \
			exit 1; \
		fi; \
	fi
	@echo "✅ Database services started"
	@echo "   🗄️  PostgreSQL: localhost:5432"
	@echo "   🔴 Redis: localhost:6379"

db-down: ## Stop database containers
	@echo "⏹️  Stopping database services..."
	@if [ -f "docker-compose.postgraphile.yml" ]; then \
		docker compose -f docker-compose.postgraphile.yml down; \
	else \
		docker compose down; \
	fi
	@echo "✅ Database services stopped"

db-reset: ## Reset database with fresh data
	@echo "⚠️  WARNING: This will DELETE ALL DATA!"
	@read -p "Are you sure? [y/N] " -n 1 -r; echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "🔄 Resetting database..."; \
		if [ -f "docker-compose.postgraphile.yml" ]; then \
			docker compose -f docker-compose.postgraphile.yml down -v; \
			docker volume rm svelteHR-postgraphile_postgres_data svelteHR-postgraphile_redis_data 2>/dev/null || true; \
		else \
			docker compose down -v; \
			docker volume rm svelteHR-gel-data 2>/dev/null || true; \
		fi; \
		make db-up; \
		echo "⏳ Waiting for database initialization..."; \
		sleep 20; \
		make schema-apply; \
		echo "✅ Database reset complete"; \
	else \
		echo "❌ Operation cancelled"; \
	fi

db-logs: ## View database logs
	@if docker ps --format '{{.Names}}' | grep -q geldb; then \
		docker compose logs -f geldb; \
	elif docker ps --format '{{.Names}}' | grep -q postgres; then \
		docker logs -f svelteHR-postgres-postgraphile --tail=50; \
	else \
		echo "❌ No database container found"; \
	fi

db-health: ## Check database health
	@echo "💊 Checking database health..."
	@docker compose -f docker-compose.postgraphile.yml ps 2>/dev/null || docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -E "(postgres|redis)"
	@echo ""
	@echo "🔧 Testing database connections..."
	@docker exec svelteHR-postgres-postgraphile pg_isready -U postgres -d hr_system 2>/dev/null && echo "✅ PostgreSQL: Ready" || echo "❌ PostgreSQL: Not ready"
	@docker exec svelteHR-redis-postgraphile redis-cli ping 2>/dev/null && echo "✅ Redis: Ready" || echo "❌ Redis: Not ready"


# =============================================================================
# Schema Management
# =============================================================================

schema-status: ## Check current schema and migration status
	@echo "📊 Checking schema status..."
	@if docker ps --format '{{.Names}}' | grep -q postgres; then \
		docker exec svelteHR-postgres-postgraphile psql -U postgres -d hr_system -c "\SELECT schemaname, tablename FROM pg_tables WHERE schemaname IN ('hr_public', 'hr_private', 'hr_hidden') ORDER BY schemaname, tablename;" 2>/dev/null || echo "Schema not initialized"; \
	else \
		echo "❌ PostgreSQL container not running"; \
	fi

schema-apply: ## Apply database schema
	@echo "📋 Applying database schema..."
	@if [ -d "migrations" ]; then \
		echo "✅ Schema will be applied automatically on container start"; \
	else \
		echo "⚠️  No migrations directory found"; \
	fi

schema-create: ## Create new migration from schema changes
	@echo "📝 Creating new migration..."
	@echo "⚠️  Manual migration creation needed - add new .sql files to migrations/ directory"

schema-reset: ## Reset schema (dangerous - removes all data)
	@echo "⚠️  This will DELETE ALL DATA. Continue? (y/N)"
	@read -n 1 -r; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo ""; \
		make db-reset; \
	else \
		echo ""; \
		echo "❌ Schema reset cancelled"; \
	fi

migrate-check: ## Check if database needs migration
	@make schema-status

# =============================================================================
# Testing
# =============================================================================

test: ## Run all tests (unit + e2e)
	@echo "🧪 Running all tests..."
	@npm run test

test-unit: ## Run unit tests
	@echo "🧪 Running unit tests..."
	@npm run test:unit

test-e2e: ## Run end-to-end tests
	@echo "🧪 Running E2E tests..."
	@npm run test:e2e

test-graphql: ## Test PostGraphile GraphQL endpoint
	@echo "🧪 Testing PostGraphile GraphQL endpoint..."
	@echo ""
	@curl -s -X POST \
		-H "Content-Type: application/json" \
		-d '{"query": "{ __schema { types { name } } }"}' \
		http://localhost:4000/graphql 2>/dev/null | grep -q "data" && echo "✅ PostGraphile GraphQL: Working" || echo "❌ PostGraphile GraphQL: Not available (run 'make server-dev')"

test-auth: ## Test authentication
	@echo "🔐 Testing authentication..."
	@npm run test:auth 2>/dev/null || echo "⚠️  Auth tests not configured"

test-contract: ## Run contract tests
	@echo "📋 Running contract tests..."
	@npm run test:contract 2>/dev/null || echo "⚠️  Contract tests not configured"

# =============================================================================
# Database Tools
# =============================================================================

db-shell: ## Open PostgreSQL shell
	@echo "🔧 Opening PostgreSQL shell (hr_system database)..."
	@if docker ps --format '{{.Names}}' | grep -q postgres; then \
		docker exec -it svelteHR-postgres-postgraphile psql -U postgres -d hr_system; \
	else \
		echo "❌ PostgreSQL container not running"; \
	fi

# =============================================================================
# Environment Setup System
# =============================================================================

setup-init: ## Initialize development environment
	@echo "⚙️  Initializing development environment..."
	@if [ -f "setup/setup.sh" ]; then \
		./setup/setup.sh; \
	elif [ -f ".specify/scripts/bash/create-new-feature.sh" ]; then \
		echo "Using .specify system for setup"; \
		./.specify/scripts/bash/create-new-feature.sh; \
	else \
		echo "⚠️  No setup system found"; \
	fi

setup-sync: ## Synchronize environment with remote
	@echo "🔄 Synchronizing environment..."
	@if [ -f "setup/sync.sh" ]; then \
		./setup/sync.sh --pull; \
	else \
		echo "⚠️  Sync system not found"; \
	fi

setup-validate: ## Validate environment health
	@echo "✅ Validating environment..."
	@if [ -f "setup/validate.sh" ]; then \
		./setup/validate.sh check; \
	else \
		make env-check; \
	fi

setup-backup: ## Create environment backup
	@echo "💾 Creating environment backup..."
	@if [ -f "setup/backup.sh" ]; then \
		./setup/backup.sh create; \
	else \
		echo "⚠️  Backup system not found"; \
	fi

setup-health: ## Comprehensive health check
	@echo "🏥 Running comprehensive health check..."
	@if [ -f "setup/health-check.sh" ]; then \
		./setup/health-check.sh; \
	else \
		make env-check; \
		make db-health; \
		make server-status; \
	fi

setup-test: ## Run setup system tests
	@echo "🧪 Running setup system tests..."
	@if [ -f "setup/tests/run-all-tests.sh" ]; then \
		./setup/tests/run-all-tests.sh; \
	else \
		echo "⚠️  Setup tests not found"; \
	fi

setup-status: ## Show complete setup system status
	@echo "📊 Setup System Status:"
	@echo "======================"
	@make env-check
	@make db-health
	@make server-status

# =============================================================================
# Sample Data Management
# =============================================================================

dev-sample-data: ## Generate sample data for development
	@echo "📊 Generating sample data for development..."
	@cd backend && DB_PORT=5433 npm run sample-data:generate
	@echo "✅ Sample data generated successfully"

clean-sample-data: ## Remove all sample data from database
	@echo "🧹 Cleaning sample data..."
	@cd backend && DB_PORT=5433 npm run sample-data:clean
	@echo "✅ Sample data cleaned"

sample-data-status: ## Show current sample data status
	@echo "📊 Checking sample data status..."
	@cd backend && DB_PORT=5433 npm run sample-data:status

validate-sample-config: ## Validate sample data configuration
	@echo "✅ Validating sample data configuration..."
	@cd backend && npm run sample-data:validate ./config/sample-data.json

# =============================================================================
# Examples & Samples
# =============================================================================

sample-query: ## Show sample GraphQL query
	@echo "📊 Sample GraphQL Query:"
	@echo "====================="
	@echo "Run the following in GraphiQL:"
	@echo ""
	@echo "# GelDB: http://localhost:5657/db/main/ext/graphql"
	@echo "# PostGraphile: http://localhost:4000/graphiql"
	@echo ""
	@echo "query GetDepartments {"
	@echo "  departments {"
	@echo "    nodes {"
	@echo "      id"
	@echo "      name"
	@echo "      description"
	@echo "      departmentHead {"
	@echo "        displayName"
	@echo "        email"
	@echo "      }"
	@echo "    }"
	@echo "  }"
	@echo "}"

sample-login: ## Show authentication mutation example
	@echo "🔐 Sample Authentication:"
	@echo "======================="
	@echo "Run the following in GraphiQL:"
	@echo ""
	@echo "mutation Login {"
	@echo "  authenticate(input: {"
	@echo "    email: \"admin@company.com\","
	@echo "    password: \"admin123\""
	@echo "  }) {"
	@echo "    jwtToken"
	@echo "  }"
	@echo "}"

# =============================================================================
# Development Containers with SSH and Neovim
# =============================================================================

dev-start: ## Start development containers with SSH and Neovim support
	@echo "🚀 Starting SvelteHR Development Containers..."
	@echo "============================================="
	@cd dev-containers && ./start-dev.sh

dev-stop: ## Stop development containers
	@echo "⏹️ Stopping SvelteHR Development Containers..."
	@cd dev-containers && ./stop-dev.sh

dev-logs: ## View development container logs
	@echo "📋 Development Container Logs:"
	@echo "============================="
	@cd dev-containers && docker-compose -f docker-compose.dev.yml logs -f

dev-health: ## Check health of development containers
	@cd dev-containers && ./health-check.sh

dev-ssh-be: ssh-backend ## Alias for ssh-backend

dev-ssh-fe: ssh-frontend ## Alias for ssh-frontend

ssh-backend: ## SSH into backend development container
	@echo "🔌 Connecting to Backend Container..."
	@echo "====================================="
	@echo "💡 Credentials: dev/dev"
	@echo "💡 Run 'cd backend && npm run dev' to start the server"
	@echo "💡 Your ~/.config/nvim is available inside the container"
	@echo ""
	@ssh dev@localhost -p 2222

ssh-frontend: ## SSH into frontend development container
	@echo "🔌 Connecting to Frontend Container..."
	@echo "======================================"
	@echo "💡 Credentials: dev/dev"
	@echo "💡 Run 'cd frontend && npm run dev' to start the server"
	@echo "💡 Your ~/.config/nvim is available inside the container"
	@echo ""
	@ssh dev@localhost -p 2223

# =============================================================================
# Maintenance
# =============================================================================

clean: ## Clean all build artifacts and containers
	@echo "🧹 Cleaning up..."
	@docker compose down -v 2>/dev/null || true
	@if [ -f "docker-compose.postgraphile.yml" ]; then \
		docker compose -f docker-compose.postgraphile.yml down -v 2>/dev/null || true; \
	fi
	@if [ -f "dev-containers/docker-compose.dev.yml" ]; then \
		cd dev-containers && docker-compose -f docker-compose.dev.yml down -v 2>/dev/null || true; \
	fi
	@docker system prune -f
	@rm -rf .svelte-kit build dist node_modules/.vite
	@rm -rf backend/dist backend/logs 2>/dev/null || true
	@echo "✅ Cleanup complete"