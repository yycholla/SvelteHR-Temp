# SvelteHR Monorepo - Development Commands
SHELL := /bin/bash
.PHONY: help dev build clean db-up db-down db-reset db-logs db-health schema-apply

# =============================================================================
# Help
# =============================================================================
help: ## Show available commands
	@echo "🏢 SvelteHR Monorepo Commands"
	@echo "============================="
	@echo ""
	@echo "🚀 Development:"
	@echo "  make dev          - Start frontend development server"
	@echo "  make build        - Build frontend for production"
	@echo ""
	@echo "💾 Database:"
	@echo "  make db-up        - Start GelDB and Redis containers"
	@echo "  make db-down      - Stop database containers"  
	@echo "  make db-reset     - Reset database with fresh data"
	@echo "  make db-logs      - View GelDB logs"
	@echo "  make db-health    - Check database health"
	@echo ""
	@echo "📋 Schema Management:"
	@echo "  make schema-status - Check current schema and migrations"
	@echo "  make schema-create - Create new migration from schema files"
	@echo "  make schema-reset  - Reset schema (WARNING: deletes all data)"
	@echo ""
	@echo "🔧 Gel CLI Tools:"
	@echo "  make gel-repl      - Open interactive Gel REPL"
	@echo "  make gel-cli CMD='...' - Run custom gel CLI command"
	@echo ""
	@echo "🧹 Maintenance:"
	@echo "  make clean        - Clean all build artifacts and containers"
	@echo "  make install      - Install all dependencies"

# =============================================================================
# Frontend Development
# =============================================================================
dev: db-up ## Start development with database
	@echo "🚀 Starting SvelteHR development..."
	@echo "📊 GraphQL Endpoint: http://localhost:5656/db/main/ext/graphql"
	@echo "🔧 Admin UI: http://localhost:5656/ui (admin/admin)"
	@echo "🌐 Frontend: http://localhost:5173"
	@npm run dev

build: ## Build frontend for production
	@echo "🔨 Building SvelteHR for production..."
	@npm run build

install: ## Install all dependencies
	@echo "📦 Installing dependencies..."
	@npm install

# =============================================================================
# Database Management
# =============================================================================
db-up: ## Start GelDB and Redis containers
	@echo "🚀 Starting database services..."
	@docker compose up -d geldb redis
	@echo "✅ Services started:"
	@echo "   📊 GraphQL: http://localhost:5656/db/main/ext/graphql"
	@echo "   🔧 Admin UI: http://localhost:5656/ui (admin/admin)"
	@echo "   🗄️  Redis: localhost:6379"

db-down: ## Stop database containers
	@echo "⏹️  Stopping database services..."
	@docker compose down

db-reset: ## Reset database with fresh data
	@echo "🔄 Resetting database..."
	@docker compose down
	@docker volume rm svelteHR-gel-data 2>/dev/null || true
	@docker compose up -d geldb redis
	@echo "⏳ Waiting for database initialization..."
	@sleep 20
	@make schema-apply
	@echo "✅ Database reset complete"

db-logs: ## View GelDB container logs
	@docker compose logs -f geldb

db-health: ## Check database health
	@echo "💊 Checking database health..."
	@docker compose ps geldb redis
	@echo ""
	@echo "🔧 Testing endpoints..."
	@curl -s http://localhost:5656/ui >/dev/null && echo "✅ Admin UI: Available" || echo "❌ Admin UI: Not available"
	@curl -s http://localhost:5656/db/main/ext/graphql >/dev/null && echo "✅ GraphQL: Available" || echo "❌ GraphQL: Not available"

schema-apply: ## Apply database schema (auto-applied with migrations=always)
	@echo "📋 Schema is automatically applied on container start"
	@echo "✅ Use 'make schema-status' to check current schema state"

schema-status: ## Check current schema and migration status
	@echo "📊 Checking schema status..."
	@docker exec svelteHR-geldb gel migration status --dsn "gel://admin:admin@localhost:5656/main?tls_security=insecure" || echo "No migrations found"

schema-create: ## Create new migration from schema changes
	@echo "📝 Creating new migration from schema files..."
	@docker exec svelteHR-geldb gel migration create --non-interactive --dsn "gel://admin:admin@localhost:5656/main?tls_security=insecure"
	@echo "✅ Migration created"

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

gel-cli: ## Run gel CLI commands (usage: make gel-cli CMD="query 'SELECT 1'")
	@docker exec -it svelteHR-geldb gel $(CMD) --dsn "gel://admin:admin@localhost:5656/main?tls_security=insecure"

gel-repl: ## Open interactive Gel REPL
	@echo "🔧 Opening Gel REPL (type \q to exit)"
	@docker exec -it svelteHR-geldb gel --dsn "gel://admin:admin@localhost:5656/main?tls_security=insecure"

# =============================================================================
# Maintenance
# =============================================================================
clean: ## Clean all build artifacts and containers
	@echo "🧹 Cleaning up..."
	@docker compose down -v 2>/dev/null || true
	@docker system prune -f
	@rm -rf .svelte-kit build dist node_modules/.vite
	@echo "✅ Cleanup complete"