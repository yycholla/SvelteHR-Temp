.PHONY: backend clean db-entities db-migrate db-reset db-shell db-status dev-down dev-logs dev-rebuild-full frontend help install prod-down prod-frontend-rebuild prod-frontend-rebuild-full prod-logs prod-rebuild-full rust-build rust-check rust-clippy rust-logs rust-shell rust-test ssh-backend ssh-frontend test test-e2e test-unit

# SvelteHR Development Commands - Streamlined Makefile
SHELL := /bin/bash
# =============================================================================
# Help
# =============================================================================
help: ## Show available commands
	@echo "🏢 SvelteHR Development Commands"
	@echo "================================"
	@echo ""
	@echo "Production"
	@echo "  make prod 							    - Start all prod containers"
	@echo "  make prod-logs             - View Production logs"
	@echo "  make prod-down             - Stop all prod containers"
	@echo "  make prod-rebuild          - Rebuild all prod containers"
	@echo "  make prod-rebuild-full     - Rebuild all prod containers without cached builds"
	@echo "  make prod-frontend-rebuild - Full Rebuild and restart frontend"
	@echo ""
	@echo "🚀 Development (Recommended):"
	@echo "  make dev                - Start ALL containers (backend + frontend + database + redis)"
	@echo "  make backend            - Start only backend containers (database + redis + backend API)"
	@echo "  make frontend           - Start only frontend container (requires backend running)"
	@echo "  make dev-logs           - View container logs"
	@echo "  make dev-down           - Stop all containers"
	@echo "  make dev-rebuild        - Fast rebuild with cargo-chef caching (~1 min)"
	@echo "  make dev-rebuild-full   - Full rebuild without cache (~10 min, for Dockerfile/deps changes)"
	@echo ""
	@echo "🔌 SSH Access (Optional):"
	@echo "  make ssh-backend   - SSH into backend container (user: dev, pass: dev)"
	@echo "  make ssh-frontend  - SSH into frontend container (user: dev, pass: dev)"
	@echo ""
	@echo "💾 Database:"
	@echo "  make db-shell      - Open PostgreSQL shell"
	@echo "  make db-status     - Show migration status"
	@echo "  make db-migrate    - Run database migrations"
	@echo "  make db-reset      - Reset database (WARNING: deletes all data)"
	@echo "  make db-entities   - Regenerate SeaORM entities from schema"
	@echo ""
	@echo "🦀 Rust GraphQL Server:"
	@echo "  make rust-check    - Run cargo check"
	@echo "  make rust-clippy   - Run clippy lints"
	@echo "  make rust-test     - Run Rust tests"
	@echo "  make rust-build    - Build in release mode"
	@echo "  make rust-logs     - View Rust server logs"
	@echo "  make rust-shell    - Open shell in Rust container"
	@echo ""
	@echo "📦 Installation:"
	@echo "  make install       - Install all dependencies"
	@echo ""
	@echo "🧪 Testing:"
	@echo "  make test          - Run all tests"
	@echo "  make test-unit     - Run unit tests"
	@echo "  make test-e2e      - Run E2E tests"
	@echo ""
	@echo "🧹 Maintenance:"
	@echo "  make clean         - Stop containers and clean build artifacts"
	@echo ""
	@echo "📍 Service URLs:"
	@echo "  Frontend:      http://localhost:5173"
	@echo "  GraphQL API:   http://localhost:4000/graphql"
	@echo "  PostgreSQL:    localhost:5433"
	@echo "  Redis:         localhost:6380"

# =============================================================================
# Development Workflow
# =============================================================================

prod: ## Start ALL production containers
	@echo "🚀 Starting ALL SvelteHR Production Containers..."
	@docker-compose up -d
	@echo ""
	@echo "✅ All containers started!"
	@echo ""
	@echo "📍 Services available:"
	@echo "   🔹 Frontend:     http://localhost"
	@echo "   🔹 Backend API:  http://localhost:4000/graphql"
	@echo "   🔹 GraphiQL:     http://localhost:5000/graphiql"
	@echo "   🔹 PostgreSQL:   localhost:5433 (user: postgres, pass: postgres123)"
	@echo "   🔹 Redis:        localhost:6380"
	@echo ""
	@echo "💡 View logs: make prod-logs"
	@echo "💡 Stop all:  make prod-down"

prod-down: ## Stop all development containers
	@echo "⏹️ Stopping Production containers..."
	@docker-compose down
	@echo "✅ Containers stopped"

prod-logs: ## View container logs (Ctrl+C to exit)
	@docker-compose logs -f

prod-rebuild: ## Rebuild containers (leverages cargo-chef dependency caching)
	@echo "🔨 Rebuilding Production containers with cargo-chef caching..."
	@docker-compose build
	@echo "✅ Rebuild complete. Run 'make prod' to start."
	@echo "💡 For full rebuild (no cache), use: make prod-rebuild-full"

prod-frontend-rebuild: ## Start only frontend container (requires backend to be running)
	@echo "🎨 Starting Frontend Container..."
	@echo ""
	@if ! docker ps | grep -q registry.gitlab.com/chanway/sveltehr/backend; then \
	echo "❌ Backend not running. Start it first with 'make prod'"; \
	exit 1; \
	fi
	@docker compose build frontend
	@echo ""
	@echo "Frontend Container Rebuilt"
	@docker-compose up -d frontend
	@echo ""
	@echo "✅ Frontend container started!"
	@echo "🌐 Frontend available at: http://localhost"
	@echo ""
	@echo "💡 View logs: make prod-logs"

prod-frontend-rebuild-full: ## Start only frontend container (requires backend to be running)
	@echo "🎨 Starting Frontend Container..."
	@echo ""
	@if ! docker ps | grep -q registry.gitlab.com/chanway/sveltehr/backend; then \
	echo "❌ Backend not running. Start it first with 'make prod'"; \
	exit 1; \
	fi
	@docker compose build frontend --no-cache
	@echo ""
	@echo "Frontend Container Rebuilt"
	@docker-compose up -d frontend
	@echo ""
	@echo "✅ Frontend container started!"
	@echo "🌐 Frontend available at: http://localhost"
	@echo ""
	@echo "💡 View logs: make prod-logs"

prod-rebuild-full: ## Full rebuild without caching (use when Dockerfile or dependencies change)
	@echo "🔨 Full rebuild (no cache) - this will take 8-12 minutes..."
	@docker-compose build --no-cache
	@echo "✅ Full rebuild complete. Run 'make dev' to start."

dev: ## Start ALL development containers (backend + frontend + database + redis)
	@echo "🚀 Starting ALL SvelteHR Development Containers..."
	@cd dev-containers && docker-compose -f docker-compose.dev.yml up -d
	@echo ""
	@echo "✅ All containers started!"
	@echo ""
	@echo "📍 Services available:"
	@echo "   🔹 Frontend:     http://localhost:5173"
	@echo "   🔹 Backend API:  http://localhost:4000/graphql"
	@echo "   🔹 GraphiQL:     http://localhost:5000/graphiql"
	@echo "   🔹 PostgreSQL:   localhost:5433 (user: postgres, pass: postgres123)"
	@echo "   🔹 Redis:        localhost:6380"
	@echo ""
	@echo "💡 View logs: make dev-logs"
	@echo "💡 Stop all:  make dev-down"

backend: ## Start only backend containers (database + redis + backend API)
	@echo "🚀 Starting Backend Containers..."
	@cd dev-containers && docker-compose -f docker-compose.dev.yml up -d postgres-dev redis-dev backend-dev
	@echo ""
	@echo "✅ Backend containers started!"
	@echo ""
	@echo "📍 Services available:"
	@echo "   🔹 Backend API:  http://localhost:4000/graphql"
	@echo "   🔹 GraphiQL:     http://localhost:5000/graphiql"
	@echo "   🔹 PostgreSQL:   localhost:5433"
	@echo "   🔹 Redis:        localhost:6380"
	@echo ""
	@echo "💡 Start frontend: make frontend"

frontend: ## Start only frontend container (requires backend to be running)
	@echo "🎨 Starting Frontend Container..."
	@echo ""
	@if ! docker ps | grep -q sveltehr-backend-dev; then \
	echo "❌ Backend not running. Start it first with 'make backend' or 'make dev'"; \
	exit 1; \
	fi
	@cd dev-containers && docker-compose -f docker-compose.dev.yml up -d frontend-dev
	@echo ""
	@echo "✅ Frontend container started!"
	@echo "🌐 Frontend available at: http://localhost:5173"
	@echo ""
	@echo "💡 View logs: make dev-logs"

dev-down: ## Stop all development containers
	@echo "⏹️ Stopping development containers..."
	@cd dev-containers && docker-compose -f docker-compose.dev.yml down
	@echo "✅ Containers stopped"

dev-logs: ## View container logs (Ctrl+C to exit)
	@cd dev-containers && docker-compose -f docker-compose.dev.yml logs -f

dev-rebuild: ## Rebuild containers (leverages cargo-chef dependency caching)
	@echo "🔨 Rebuilding development containers with cargo-chef caching..."
	@cd dev-containers && docker-compose -f docker-compose.dev.yml build
	@echo "✅ Rebuild complete. Run 'make dev' to start."
	@echo "💡 For full rebuild (no cache), use: make dev-rebuild-full"

dev-rebuild-full: ## Full rebuild without caching (use when Dockerfile or dependencies change)
	@echo "🔨 Full rebuild (no cache) - this will take 8-12 minutes..."
	@cd dev-containers && docker-compose -f docker-compose.dev.yml build --no-cache
	@echo "✅ Full rebuild complete. Run 'make dev' to start."

# =============================================================================
# SSH Access to Containers
# =============================================================================

ssh-backend: ## SSH into backend container
	@echo "🔌 Connecting to Backend Container..."
	@echo "   User: dev | Password: dev"
	@echo "   Backend code: /home/dev/backend"
	@echo ""
	@ssh -o StrictHostKeyChecking=no dev@localhost -p 2222

ssh-frontend: ## SSH into frontend container
	@echo "🔌 Connecting to Frontend Container..."
	@echo "   User: dev | Password: dev"
	@echo "   Frontend code: /home/dev/frontend"
	@echo ""
	@ssh -o StrictHostKeyChecking=no dev@localhost -p 2223

# =============================================================================
# Database Operations
# =============================================================================

db-shell: ## Open PostgreSQL shell
	@echo "🔧 Opening PostgreSQL shell..."
	@docker exec -it sveltehr-postgres-dev psql -U postgres -d hr_system

db-status: ## Show applied migrations
	@echo "📊 Database Migration Status:"
	@echo ""
	@docker exec sveltehr-postgres-dev psql -U postgres -d hr_system -c \
	"SELECT id, name, applied_at FROM migrations ORDER BY applied_at DESC LIMIT 10;" \
	2>/dev/null || echo "Migrations table not found. Run 'make db-migrate'"
	@echo ""
	@echo "📊 SeaORM Entity Status:"
	@echo "   Run 'make db-entities' to regenerate SeaORM entities from schema"

db-migrate: ## Run database migrations
	@echo "📋 Running database migrations..."
	@if [ -f "scripts/init-db.sh" ]; then \
		bash scripts/init-db.sh; \
	else \
		echo "⚠️  Migration script not found"; \
		echo "Migrations in /migrations will auto-apply on container start"; \
	fi

db-reset: ## Reset database (WARNING: deletes all data)
	@echo "⚠️  WARNING: This will DELETE ALL DATA!"
	@read -p "Are you sure? [y/N] " -n 1 -r; echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "🔄 Resetting database..."; \
		cd dev-containers && docker-compose -f docker-compose.dev.yml down -v; \
		docker volume rm sveltehr_postgres_dev_data sveltehr_redis_dev_data 2>/dev/null || true; \
		make dev; \
		echo "⏳ Waiting for database initialization..."; \
		sleep 10; \
		echo "✅ Database reset complete"; \
	else \
		echo "❌ Operation cancelled"; \
	fi

db-entities: ## Regenerate SeaORM entities from database schema
	@echo "🔄 Regenerating SeaORM entities..."
	@docker exec sveltehr-graphql-rust sea-orm-cli generate entity \
	--database-url postgresql://postgres:postgres123@postgres-dev:5432/hr_system \
	--output-dir models/generated \
	--with-serde both
	@echo "✅ SeaORM entities regenerated"

# =============================================================================
# Installation
# =============================================================================

install: ## Install all dependencies
	@echo "📦 Installing dependencies..."
	@npm install
	@if [ -d "backend" ]; then \
		echo "📦 Installing backend dependencies..."; \
		cd backend && npm install; \
	fi
	@echo "✅ All dependencies installed"

# =============================================================================
# Testing
# =============================================================================

test: ## Run all tests
	@npm run test

test-unit: ## Run unit tests
	@npm run test:unit

test-e2e: ## Run E2E tests
	@npm run test:e2e

# =============================================================================
# Rust GraphQL Server Commands
# =============================================================================

rust-check: ## Run cargo check on Rust GraphQL server
	@echo "🔍 Running cargo check..."
	@docker exec sveltehr-graphql-rust cargo check

rust-clippy: ## Run clippy on Rust GraphQL server
	@echo "🔧 Running cargo clippy..."
	@docker exec sveltehr-graphql-rust cargo clippy -- -D warnings

rust-test: ## Run tests on Rust GraphQL server
	@echo "🧪 Running cargo test..."
	@docker exec sveltehr-graphql-rust cargo test

rust-build: ## Build Rust GraphQL server in release mode
	@echo "🔨 Building Rust GraphQL server..."
	@docker exec sveltehr-graphql-rust cargo build --release

rust-logs: ## View Rust GraphQL server logs
	@docker logs -f sveltehr-graphql-rust

rust-shell: ## Open shell in Rust GraphQL container
	@docker exec -it sveltehr-graphql-rust bash

# =============================================================================
# Maintenance
# =============================================================================

clean: ## Clean containers and build artifacts
	@echo "🧹 Cleaning up..."
	@cd dev-containers && docker-compose -f docker-compose.dev.yml down -v 2>/dev/null || true
	@docker system prune -f
	@rm -rf .svelte-kit build dist node_modules/.vite
	@rm -rf backend/dist backend/logs 2>/dev/null || true
	@echo "✅ Cleanup complete"
