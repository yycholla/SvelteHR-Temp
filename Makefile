# =============================================================================
# SvelteHR Frontend Makefile (Twelve-Factor Compliant)
# =============================================================================
# 
# This Makefile follows twelve-factor principles:
# - Factor III: Config stored in environment via Doppler
# - Factor V: Strict separation of build/release/run
# - Factor X: Dev/prod parity through consistent tooling
# - Factor XII: Admin processes as one-off commands
# =============================================================================

.PHONY: help install clean dev build test lint format check docs
.PHONY: doppler-setup doppler-pull doppler-status env-pull env-status 
.PHONY: docker-build docker-dev docker-prod docker-clean
.PHONY: deploy release health status

# Default target
.DEFAULT_GOAL := help

# =============================================================================
# Core Variables
# =============================================================================

# Build configuration
BUILD_DIR := build
NODE_ENV ?= development
DOCKER_IMAGE := sveltehr-frontend
DOCKER_TAG ?= latest

# Doppler configuration
DOPPLER_PROJECT := mountainhr-frontend
DOPPLER_CONFIG ?= dev

# Development server
DEV_HOST := localhost
DEV_PORT := 5173

# =============================================================================
# Development Commands (Factor V: Build/Release/Run)
# =============================================================================

## Development
dev: env-pull ## Start development server with Doppler environment
	@echo "🚀 Starting development server with Doppler environment..."
	@echo "📡 Project: $(DOPPLER_PROJECT), Config: $(DOPPLER_CONFIG)"
	doppler run -- npm run dev

dev-local: ## Start development server with local .env file (fallback)
	@echo "🚀 Starting development server with local environment..."
	@echo "⚠️  Using .env file - consider using 'make dev' with Doppler"
	npm run dev:local

## Build & Release (Factor V: Strict Separation)
build: env-pull ## Build production application
	@echo "🔨 Building application with Doppler environment..."
	@echo "📡 Project: $(DOPPLER_PROJECT), Config: $(DOPPLER_CONFIG)"
	doppler run -- npm run build

build-local: ## Build with local environment (fallback)
	@echo "🔨 Building with local environment..."
	npm run build

preview: build ## Preview production build
	@echo "👁️  Previewing production build..."
	doppler run -- npm run preview

release: clean build ## Create production release
	@echo "🚀 Creating production release..."
	@echo "✅ Build completed: $(BUILD_DIR)"
	@echo "📦 Ready for deployment"

# =============================================================================
# Testing & Quality
# =============================================================================

## Testing
test: ## Run all tests
	@echo "🧪 Running all tests..."
	npm run test

test-unit: ## Run unit tests only
	@echo "🔬 Running unit tests..."
	npm run test:unit

test-e2e: ## Run end-to-end tests
	@echo "🎭 Running E2E tests..."
	npm run test:e2e

test-ci: ## Run tests in CI environment
	@echo "🤖 Running tests in CI mode..."
	npm run test -- --run --reporter=junit

## Code Quality
lint: ## Run linter
	@echo "🧹 Running linter..."
	npm run lint

format: ## Format code
	@echo "✨ Formatting code..."
	npm run format

check: ## Run type checks
	@echo "🔍 Running type checks..."
	npm run check

quality: lint check test-unit ## Run full quality check
	@echo "✅ All quality checks passed!"

# =============================================================================
# Environment Management (Factor III: Config in Environment)
# =============================================================================

## Environment Setup
doppler-setup: ## Setup Doppler for this project (one-time)
	@echo "🔐 Setting up Doppler for SvelteHR frontend..."
	@echo "Project: $(DOPPLER_PROJECT)"
	@echo "Default config: $(DOPPLER_CONFIG)"
	doppler login
	doppler projects create $(DOPPLER_PROJECT) --description "SvelteHR Frontend Application" || true
	doppler configure set project $(DOPPLER_PROJECT)
	doppler configure set config $(DOPPLER_CONFIG)
	@echo "✅ Doppler setup complete!"
	@echo "💡 Next: Add secrets with 'doppler secrets set KEY=value'"

env-pull: ## Pull environment from Doppler to .env
	@echo "📥 Pulling environment from Doppler..."
	@doppler secrets download --no-file --format env > .env
	@echo "✅ Environment updated from Doppler"

env-pull-quiet: ## Pull environment from Doppler (silent)
	@doppler secrets download --no-file --format env > .env

env-status: ## Show current environment status
	@echo "🔍 Environment Status:"
	@echo "====================="
	@doppler configure --all 2>/dev/null || echo "❌ Doppler not configured"
	@echo ""
	@echo "📄 Current .env file:"
	@if [ -f .env ]; then \
		echo "✅ .env exists ($(shell wc -l < .env) lines)"; \
		echo "🔍 Sample variables:"; \
		head -5 .env | grep -v "^#" || true; \
	else \
		echo "❌ No .env file found"; \
		echo "💡 Run 'make env-pull' to create from Doppler"; \
	fi

doppler-status: ## Show Doppler configuration and secrets
	@echo "🔐 Doppler Configuration:"
	@echo "========================"
	@doppler configure --all
	@echo ""
	@echo "🔍 Available secrets:"
	@doppler secrets --raw | head -20

doppler-open: ## Open Doppler dashboard
	@echo "🌐 Opening Doppler dashboard..."
	doppler open dashboard

# =============================================================================
# Docker & Deployment (Factor X: Dev/Prod Parity)
# =============================================================================

## Docker Operations
docker-build: ## Build Docker image
	@echo "🐳 Building Docker image..."
	docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) \
		--build-arg NODE_ENV=$(NODE_ENV) \
		-f Dockerfile .
	@echo "✅ Docker image built: $(DOCKER_IMAGE):$(DOCKER_TAG)"

docker-dev: docker-build ## Run development container
	@echo "🐳 Starting development container..."
	docker run -it --rm \
		-p $(DEV_PORT):$(DEV_PORT) \
		-e DOPPLER_TOKEN="$(shell doppler configure get token --plain 2>/dev/null || echo '')" \
		--name sveltehr-dev \
		$(DOCKER_IMAGE):$(DOCKER_TAG) npm run dev

docker-prod: docker-build ## Run production container
	@echo "🐳 Starting production container..."
	docker run -d \
		-p 3000:3000 \
		-e DOPPLER_TOKEN="$(shell doppler configure get token --plain 2>/dev/null || echo '')" \
		--name sveltehr-prod \
		$(DOCKER_IMAGE):$(DOCKER_TAG)

docker-clean: ## Clean Docker images and containers
	@echo "🧹 Cleaning Docker resources..."
	docker rm -f sveltehr-dev sveltehr-prod 2>/dev/null || true
	docker rmi $(DOCKER_IMAGE):$(DOCKER_TAG) 2>/dev/null || true
	@echo "✅ Docker cleanup complete"

# =============================================================================
# Admin Processes (Factor XII: One-off Admin Tasks)
# =============================================================================

## Setup & Maintenance
install: ## Install dependencies
	@echo "📦 Installing dependencies..."
	npm install

clean: ## Clean build artifacts and dependencies
	@echo "🧽 Cleaning build artifacts..."
	rm -rf $(BUILD_DIR) .svelte-kit node_modules/.vite
	@echo "✅ Clean complete"

clean-all: clean ## Deep clean including node_modules
	@echo "🧽 Deep cleaning..."
	rm -rf node_modules package-lock.json
	@echo "✅ Deep clean complete"

reset: clean-all install ## Reset project (clean + install)
	@echo "🔄 Project reset complete"

## Status & Health
status: ## Show project status
	@echo "📊 SvelteHR Frontend Status"
	@echo "==========================="
	@echo "📁 Project: SvelteKit + TypeScript Frontend"
	@echo "🏠 Directory: $(PWD)"
	@echo "📦 Package manager: npm"
	@echo "🌐 Dev server: http://$(DEV_HOST):$(DEV_PORT)"
	@echo "🐳 Docker image: $(DOCKER_IMAGE):$(DOCKER_TAG)"
	@make env-status

health: ## Check application health
	@echo "🏥 Health Check"
	@echo "==============="
	@echo -n "Node.js: "; node --version
	@echo -n "npm: "; npm --version
	@echo -n "Doppler: "; doppler --version 2>/dev/null || echo "not installed"
	@echo -n "Docker: "; docker --version 2>/dev/null || echo "not available"
	@echo "✅ System health check complete"

logs: ## Show recent git commits
	@echo "📜 Recent commits:"
	@git log --oneline -10

deps: ## Show dependency information
	@echo "📋 Dependencies:"
	@npm list --depth=0

# =============================================================================
# Deployment (Factor IX: Disposability)
# =============================================================================

## Deployment Commands
deploy-staging: ## Deploy to staging environment
	@echo "🚀 Deploying to staging..."
	@echo "⚠️  Deployment target not configured"
	@echo "💡 Configure your deployment target (Vercel, Netlify, etc.)"

deploy-prod: ## Deploy to production
	@echo "🚀 Deploying to production..."
	@echo "⚠️  Deployment target not configured"
	@echo "💡 Configure your deployment target (Vercel, Netlify, etc.)"

# =============================================================================
# Development Workflows
# =============================================================================

## Shortcuts
quick-start: install env-pull dev ## Quick start development
	@echo "🚀 Development environment ready!"

full-check: install quality test ## Complete quality check
	@echo "✅ All checks passed!"

ci: install build test-ci ## CI/CD workflow
	@echo "✅ CI workflow complete"

# =============================================================================
# Help
# =============================================================================

help: ## Show this help message
	@echo "🔧 SvelteHR Frontend Commands (Twelve-Factor Compliant)"
	@echo "========================================================"
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@echo "Core Development:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -A20 "Development" | head -20 | awk 'BEGIN {FS = ":.*?## "}; /^[a-zA-Z_-]+:/ {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Environment & Config:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -A10 "Environment" | head -10 | awk 'BEGIN {FS = ":.*?## "}; /^[a-zA-Z_-]+:/ {printf "  \033[33m%-18s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Docker & Deployment:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -A10 "Docker" | head -10 | awk 'BEGIN {FS = ":.*?## "}; /^[a-zA-Z_-]+:/ {printf "  \033[32m%-18s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Quality & Testing:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -A10 "Quality\|Testing" | head -10 | awk 'BEGIN {FS = ":.*?## "}; /^[a-zA-Z_-]+:/ {printf "  \033[35m%-18s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "💡 Common Workflows:"
	@echo "   make quick-start    # Setup and start development"
	@echo "   make full-check     # Run all quality checks"
	@echo "   make env-pull       # Update environment from Doppler"
	@echo "   make status         # Show project status"
	@echo ""
	@echo "🔗 Twelve-Factor Principles:"
	@echo "   • Config via Doppler (Factor III)"
	@echo "   • Build/Release/Run separation (Factor V)" 
	@echo "   • Dev/Prod parity via Docker (Factor X)"
	@echo "   • Disposable processes (Factor IX)"
	@echo ""