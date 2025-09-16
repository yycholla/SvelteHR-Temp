# SvelteHR PostGraphile System - Development Commands
SHELL := /bin/bash
.PHONY: help dev build clean db-up db-down db-reset db-logs db-health server-dev server-prod server-stop server-status
.PHONY: quick-start env-check test-graphql test-auth test-contract install-backend
.PHONY: schema-status migrate-check

# Help Commands
help: ## Show available commands
	@echo "🏢 SvelteHR PostGraphile System"
	@echo "================================="
	@echo ""
	@echo "🚀 Quick Start:"
	@echo "  make quick-start  - Complete setup and startup (recommended)"
	@echo "  make env-check     - Check environment and dependencies"
	@echo ""
	@echo "🖥️  Server Operations:"
	@echo "  make server-dev   - Start PostGraphile server (development)"
	@echo "  make server-prod  - Start PostGraphile server (production)"
	@echo "  make server-status - Check server health and status"
	@echo "  make server-stop   - Stop all server processes"
	@echo "  make server-logs  - View server logs"
	@echo ""
	@echo "💾 Database Operations:"
	@echo "  make db-up        - Start PostgreSQL and Redis containers"
	@echo "  make db-down      - Stop database containers"  
	@echo "  make db-reset     - Reset database with fresh data"
	@echo "  make db-logs      - View database logs"
	@echo "  make db-health    - Check database health"
	@echo "  make db-shell     - Open PostgreSQL shell"
	@echo ""
	@echo "📋 Schema Management:"
	@echo "  make schema-status - Check current schema and migration status"
	@echo ""
	@echo "🧪 Testing:"
	@echo "  make test-graphql  - Test GraphQL endpoint"
	@echo "  make test-auth     - Test authentication"
	@echo "  make test-contract - Run contract tests"
	@echo ""
	@echo "📦 Installation:"
	@echo "  make install-backend - Install backend dependencies"
	@echo ""
	@echo "🧹 Maintenance:"
	@echo "  make clean        - Clean all build artifacts and containers"

# =============================================================================
# Quick Start and Environment Setup
# =============================================================================

quick-start: ## Complete setup for first-time users
	@echo "🚀 SvelteHR PostGraphile - Quick Start"
	@echo "=================================="
	@echo ""
	@echo "🔍 1. Checking environment..."
	@make env-check
	@echo ""
	@echo "📦 2. Installing backend dependencies..."
	@make install-backend
	@echo ""
	@echo "💾 3. Starting database services..."
	@make db-up
	@echo ""
	@echo "🏥 4. Checking database health..."
	@make db-health
	@echo ""
	@echo "🎉 Quick start completed!"
	@echo ""
	@echo "🚀 Next steps:"
	@echo "   - Run 'make server-dev' to start the GraphQL API"
	@echo "   - Visit http://localhost:4000/graphiql to explore the API"
	@echo "   - Test authentication: admin@postgraphile-hr.com / admin123"
	@echo "   - Run 'make help' to see all available commands"

env-check: ## Check environment configuration
	@echo "🔍 Environment Check:"
	@echo "=================="
	@echo ""
	@echo "📋 Required Files:"
	@test -f docker-compose.postgraphile.yml && echo "✓ docker-compose.postgraphile.yml" || echo "❌ docker-compose.postgraphile.yml (missing)"
	@test -f backend/package.json && echo "✓ backend/package.json" || echo "❌ backend/package.json (missing)"
	@test -f backend/src/server.ts && echo "✓ backend/src/server.ts" || echo "❌ backend/src/server.ts (missing)"
	@test -d backend/src/auth && echo "✓ backend/src/auth/" || echo "❌ backend/src/auth/ (missing)"
	@test -d backend/src/cache && echo "✓ backend/src/cache/" || echo "❌ backend/src/cache/ (missing)"
	@test -d backend/src/monitoring && echo "✓ backend/src/monitoring/" || echo "❌ backend/src/monitoring/ (missing)"
	@test -d backend/src/postgraphile && echo "✓ backend/src/postgraphile/" || echo "❌ backend/src/postgraphile/ (missing)"
	@test -d database/migrations && echo "✓ database/migrations/" || echo "❌ database/migrations/ (missing)"
	@test -d database/functions && echo "✓ database/functions/" || echo "❌ database/functions/ (missing)"
	@test -d database/policies && echo "✓ database/policies/" || echo "❌ database/policies/ (missing)"
	@echo ""
	@echo "🛠️  System Requirements:"
	@node --version && echo "✓ Node.js installed" || echo "❌ Node.js not found (install Node.js 18+)"
	@npm --version && echo "✓ npm available" || echo "❌ npm not available (install npm)"
	@docker --version && echo "✓ Docker available" || echo "❌ Docker not found (install Docker)"
	@docker compose version && echo "✓ Docker Compose available" || echo "❌ Docker Compose not found"
	@echo ""
	@echo "📦 Dependencies Status:"
	@cd backend && test -d node_modules && echo "✓ Backend dependencies installed" || echo "❌ Backend dependencies not installed (run 'make install-backend')"
	@echo ""

# =============================================================================
# Server Operations
# =============================================================================

server-dev: db-up ## Start PostGraphile server in development mode
	@echo "🚀 Starting PostGraphile Development Server..."
	@echo "📊 GraphQL API:     http://localhost:4000/graphql"
	@echo "🔧 GraphiQL IDE:    http://localhost:4000/graphiql"
	@echo "❤️  Health Check:    http://localhost:4000/health"
	@echo ""
	@mkdir -p backend/logs
	cd backend && npm run start:dev

server-prod: db-up ## Start PostGraphile server in production mode
	@echo "🚀 Starting PostGraphile Production Server..."
	@echo "⚠️  Make sure production environment variables are set!"
	cd backend && npm run start:prod

server-stop: ## Stop all server processes
	@echo "⏹️  Stopping PostGraphile server processes..."
	@pkill -f "node.*backend.*server.ts" || true
	@pkill -f "postgraphile" || true
	@echo "✅ Server processes stopped"

server-status: ## Check if server is running and healthy
	@echo "🏥 Server Status Check:"
	@echo "====================="
	@curl -s http://localhost:4000/health > /dev/null 2>&1 && echo "✅ GraphQL API (Port 4000): Available" || echo "❌ GraphQL API (Port 4000): Not available"
	@echo ""
	@echo "📊 Available Endpoints (when running):"
	@echo "   - GraphQL API:     http://localhost:4000/graphql"
	@echo "   - GraphiQL IDE:    http://localhost:4000/graphiql"
	@echo "   - Health Check:    http://localhost:4000/health"

server-logs: ## View server logs
	@echo "📋 Server Logs:"
	@echo "==============="
	@test -f backend/logs/combined.log && tail -f backend/logs/combined.log || echo "❌ No log file found"

# =============================================================================
# Development Commands
# =============================================================================

dev: server-dev ## Start full development environment (database + server)
	@echo "🚀 Starting full development environment..."

build: ## Build for production
	@echo "🔨 Building PostGraphile server for production..."
	cd backend && npm run build

install: install-backend ## Install all dependencies (alias)

install-backend: ## Install backend dependencies
	@echo "📦 Installing backend dependencies..."
	cd backend && npm install
	@echo "✅ Backend dependencies installed"

# =============================================================================
# Database Operations
# =============================================================================

db-up: ## Start PostgreSQL and Redis containers
	@echo "💾 Starting database services..."
	docker compose -f docker-compose.postgraphile.yml up -d postgres redis
	@echo "⏳ Waiting for services to be healthy..."
	@timeout 60 bash -c 'until docker compose -f docker-compose.postgraphile.yml ps postgres | grep "healthy"; do sleep 2; done' || (echo "❌ PostgreSQL failed to start" && exit 1)
	@timeout 30 bash -c 'until docker compose -f docker-compose.postgraphile.yml ps redis | grep "healthy"; do sleep 2; done' || (echo "❌ Redis failed to start" && exit 1)
	@echo "✅ Database services are ready!"

db-down: ## Stop database containers
	@echo "⏹️  Stopping database services..."
	docker compose -f docker-compose.postgraphile.yml down

db-reset: ## Reset database with fresh data (destructive)
	@echo "⚠️  WARNING: This will destroy all data!"
	@read -p "Are you sure? [y/N] " -n 1 -r; echo
	@if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "⏹️  Stopping services..."; \
		docker compose -f docker-compose.postgraphile.yml down -v; \
		echo "🗑️  Removing volumes..."; \
		docker volume rm svelteHR-postgraphile_postgres_data svelteHR-postgraphile_redis_data 2>/dev/null || true; \
		echo "🚀 Starting fresh database..."; \
		make db-up; \
	else \
		echo "❌ Operation cancelled"; \
	fi

db-logs: ## View database container logs
	@echo "📋 PostgreSQL Logs:"
	docker logs svelteHR-postgres-postgraphile --tail=50 -f

db-health: ## Check database service health
	@echo "🏥 Database Health Check:"
	@echo "======================="
	@docker compose -f docker-compose.postgraphile.yml ps
	@echo ""
	@echo "🧪 PostgreSQL Status:"
	@docker exec svelteHR-postgres-postgraphile pg_isready -U postgres -d hr_system || echo "❌ PostgreSQL not ready"
	@echo ""
	@echo "🔴 Redis Status:"
	@docker exec svelteHR-redis-postgraphile redis-cli ping || echo "❌ Redis not ready"
	@echo ""
	@echo "📊 Database Statistics:"
	@docker exec svelteHR-postgres-postgraphile psql -U postgres -d hr_system -c "\SELECT 'Users' as table_name, count(*) as count FROM hr_public.users UNION ALL SELECT 'Departments', count(*) FROM hr_public.departments UNION ALL SELECT 'Job Information', count(*) FROM hr_public.job_information UNION ALL SELECT 'Contact Information', count(*) FROM hr_public.contact_information;" 2>/dev/null || echo "⚠️  Database not initialized yet"

db-shell: ## Open PostgreSQL shell
	@echo "🔧 Opening PostgreSQL shell (hr_system database)..."
	docker exec -it svelteHR-postgres-postgraphile psql -U postgres -d hr_system

# =============================================================================
# Schema Management
# =============================================================================

schema-status: ## Check current schema and migration status
	@echo "📊 Schema Status Check:"
	@echo "====================="
	@if docker exec svelteHR-postgres-postgraphile psql -U postgres -d hr_system -c "\d hr_public.users" >/dev/null 2>&1; then \
		echo "✅ Database schema is initialized"; \
		docker exec svelteHR-postgres-postgraphile psql -U postgres -d hr_system -c "\SELECT schemaname, tablename FROM pg_tables WHERE schemaname IN ('hr_public', 'hr_private', 'hr_hidden') ORDER BY schemaname, tablename;"; \
	else \
		echo "❌ Database schema not found - run 'make db-reset' to initialize"; \
	fi

migrate-check: ## Check if database needs migration (alias)
	@make schema-status

# =============================================================================
# Testing Operations
# =============================================================================

test-graphql: ## Test GraphQL endpoint (requires server running)
	@echo "🧪 Testing GraphQL endpoint..."
	@curl -s -X POST \
	  -H "Content-Type: application/json" \
	  -d '{"query": "query { __schema { types { name } } }"}' \
	  http://localhost:4000/graphql | jq '.data.__schema.types[0]' 2>/dev/null || echo "❌ GraphQL server not running or not accessible"

test-auth: ## Test authentication functions via GraphQL
	@echo "🔐 Testing authentication endpoint..."
	@curl -s -X POST \
	  -H "Content-Type: application/json" \
	  -d '{"query": "mutation { authenticate(input: { email: \"admin@postgraphile-hr.com\", password: \"admin123\" }) { jwtToken } }"}' \
	  http://localhost:4000/graphql | jq . 2>/dev/null || echo "❌ Authentication test failed or server not running"

test-contract: ## Run GraphQL contract tests
	@echo "🧪 Running GraphQL contract tests..."
	@cd tests/contract && npm test

# =============================================================================
# Maintenance
# =============================================================================

clean: ## Clean all build artifacts and containers
	@echo "🧹 Cleaning up..."
	docker compose -f docker-compose.postgraphile.yml down -v --remove-orphans
	docker system prune -f
	rm -rf backend/node_modules/.cache backend/logs/*.log
	@echo "✅ Cleanup complete"

# =============================================================================
# Sample Usage Commands
# =============================================================================

sample-query: ## Example GraphQL query to test once server is running
	@echo "📝 Sample GraphQL Query:"
	@echo "====================="
	@echo "Run the following in GraphiQL (http://localhost:4000/graphiql):"
	@echo ""
	@echo "# Get all departments with employee count"
	@echo "query {"
	@echo "  departments {"
	@echo "    nodes {"
	@echo "      id"
	@echo "      name"
	@echo "      employeeCount"
	@echo "      departmentHead {"
	@echo "        fullName"
	@echo "        email"
	@echo "      }"
	@echo "    }"
	@echo "  }"
	@echo "}"

sample-login: ## Example authentication mutation
	@echo "🔐 Sample Authentication:"
	@echo "======================="
	@echo "Run the following in GraphiQL (http://localhost:4000/graphiql):"
	@echo ""
	@echo "mutation {"
	@echo "  authenticate(input: { email: \"admin@postgraphile-hr.com\", password: \"admin123\" }) {"
	@echo "    jwtToken {"
	@echo "      role"
	@echo "      userId"
	@echo "      exp"
	@echo "      iat"
	@echo "    }"
	@echo "  }"
	@echo "}"