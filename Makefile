# SvelteHR Development Makefile
.PHONY: dev dev-local dev-remote build test lint format check clean install help

# Default target
.DEFAULT_GOAL := help

# Environment variables
LOCAL_API_URL := http://localhost:8080/api/v2
REMOTE_API_URL := https://100.71.207.7:8443/api/v2
TAILSCALE_API_URL := https://mcp-0085.dropbear-elnath.ts.net:8443/api/v2

## Development Commands

dev: dev-local ## Start development server with local API (default)

dev-local: ## Start development server with local backend API
	@echo "🚀 Starting development server with LOCAL backend..."
	@echo "📡 API URL: $(LOCAL_API_URL)"
	PUBLIC_API_URL=$(LOCAL_API_URL) npm run dev

dev-remote: ## Start development server with remote backend API
	@echo "🚀 Starting development server with REMOTE backend..."
	@echo "📡 API URL: $(REMOTE_API_URL)"
	PUBLIC_API_URL=$(REMOTE_API_URL) npm run dev

dev-tailscale: ## Start development server with Tailscale backend API
	@echo "🚀 Starting development server with TAILSCALE backend..."
	@echo "📡 API URL: $(TAILSCALE_API_URL)"
	PUBLIC_API_URL=$(TAILSCALE_API_URL) npm run dev

dev-https: ## Start development server with HTTPS enabled
	@echo "🔒 Starting HTTPS development server with local backend..."
	USE_HTTPS=true PUBLIC_API_URL=$(LOCAL_API_URL) npm run dev

## Build Commands

build: ## Build for production
	@echo "🏗️  Building for production..."
	npm run build

preview: build ## Build and preview production version
	@echo "👁️  Previewing production build..."
	npm run preview

## Testing Commands

test: ## Run all tests
	@echo "🧪 Running all tests..."
	npm run test

test-unit: ## Run unit tests only
	@echo "🔬 Running unit tests..."
	npm run test:unit

test-e2e: ## Run end-to-end tests
	@echo "🎭 Running E2E tests..."
	npm run test:e2e

test-e2e-ui: ## Run E2E tests with UI
	@echo "🎭 Running E2E tests with UI..."
	npm run test:e2e:ui

test-auth: ## Test authentication flow
	@echo "🔐 Testing authentication flow..."
	npm run test:auth

test-employees: ## Test employee management
	@echo "👥 Testing employee management..."
	npm run test:employees

test-performance: ## Run performance tests
	@echo "⚡ Running performance tests..."
	npm run test:performance

## Quality Commands

lint: ## Run linter
	@echo "🧹 Running linter..."
	npm run lint

format: ## Format code
	@echo "✨ Formatting code..."
	npm run format

check: ## Run TypeScript and Svelte checks
	@echo "🔍 Running type checks..."
	npm run check

check-watch: ## Run type checks in watch mode
	@echo "👀 Running type checks in watch mode..."
	npm run check:watch

## Storybook Commands

storybook: ## Start Storybook development server
	@echo "📚 Starting Storybook..."
	npm run storybook

build-storybook: ## Build Storybook for production
	@echo "📚 Building Storybook..."
	npm run build-storybook

## Setup Commands

install: ## Install dependencies
	@echo "📦 Installing dependencies..."
	npm install

clean: ## Clean node_modules and reinstall
	@echo "🧽 Cleaning and reinstalling dependencies..."
	rm -rf node_modules package-lock.json
	npm install

## Environment Commands

env-local: ## Create .env file for local development
	@echo "📝 Creating local .env file..."
	@echo "PUBLIC_API_URL=$(LOCAL_API_URL)" > .env
	@echo "✅ .env file created with local API URL"

env-remote: ## Create .env file for remote development
	@echo "📝 Creating remote .env file..."
	@echo "PUBLIC_API_URL=$(REMOTE_API_URL)" > .env
	@echo "✅ .env file created with remote API URL"

env-tailscale: ## Create .env file for Tailscale development
	@echo "📝 Creating Tailscale .env file..."
	@echo "PUBLIC_API_URL=$(TAILSCALE_API_URL)" > .env
	@echo "✅ .env file created with Tailscale API URL"

env-show: ## Show current environment variables
	@echo "🔍 Current environment:"
	@echo "PUBLIC_API_URL: $${PUBLIC_API_URL:-not set}"
	@echo "USE_HTTPS: $${USE_HTTPS:-not set}"
	@echo "NODE_ENV: $${NODE_ENV:-not set}"
	@if [ -f .env ]; then echo "\n📄 .env file contents:"; cat .env; else echo "\n❌ No .env file found"; fi

## Utility Commands

status: ## Show project status
	@echo "📊 SvelteHR Project Status"
	@echo "=========================="
	@echo "📁 Project: SvelteKit HR Application"
	@echo "🏠 Directory: $(PWD)"
	@echo "📦 Package manager: npm"
	@echo "🌐 Dev server: http://localhost:5173"
	@make env-show

logs: ## Show recent git commits
	@echo "📜 Recent commits:"
	@git log --oneline -10

deps: ## Show dependency info
	@echo "📋 Dependencies:"
	@npm list --depth=0

## Development Workflow

full-check: lint check test-unit ## Run full code quality check
	@echo "✅ All checks passed!"

quick-start: env-local dev-local ## Quick start with local backend

## Help

help: ## Show this help message
	@echo "🔧 SvelteHR Development Commands"
	@echo "================================"
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "💡 Common workflows:"
	@echo "   make quick-start    # Set up local env and start dev server"
	@echo "   make dev-remote     # Use remote API backend"
	@echo "   make full-check     # Run all quality checks"
	@echo "   make test           # Run all tests"
	@echo ""