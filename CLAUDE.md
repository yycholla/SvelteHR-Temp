# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SvelteHR is a comprehensive HR management system built with SvelteKit frontend and GelDB backend. The system provides secure, role-based access to employee lifecycle management including hiring, onboarding, termination processes, and administrative functions. Currently implementing the MountainHR Frontend to integrate with existing GelDB schema.

## Tech Stack

### Backend Infrastructure
- **Database**: GelDB (graph database) - primary data store
- **Cache**: Redis 7.2 - caching and session storage  
- **Authentication**: Gel Auth extension with JWT tokens
- **Config Management**: Doppler CLI for environment variables (exclusive)
- **Build System**: Make-based workflow automation
- **Migration**: Gel CLI for database schema management

### Frontend (In Development)
- **Framework**: SvelteKit with TypeScript
- **GraphQL Client**: Urql with SSR support
- **Styling**: TailwindCSS with responsive design
- **Testing**: Vitest + Playwright + @testing-library/svelte
- **Code Generation**: GraphQL Code Generator for type safety

## Development Commands

### Database Operations
- `make db-up` - Start GelDB and Redis containers
- `make db-down` - Stop database containers
- `make db-reset` - Reset database with fresh data (destructive)
- `make db-health` - Check database service health
- `make db-logs` - View GelDB container logs

### Schema Management
- `make schema-status` - Check current schema and migration status
- `make schema-create` - Create new migration from schema changes
- `make gel-repl` - Open interactive Gel REPL for database queries
- `make gel-cli CMD='...'` - Run custom gel CLI commands

### Frontend Development
- `make frontend-install` - Install frontend dependencies
- `make frontend-dev` - Start SvelteKit dev server (includes db-up)
- `make frontend-build` - Build frontend for production
- `make frontend-test` - Run frontend tests (unit + e2e)
- `make frontend-codegen` - Generate GraphQL types

### Development Workflow
- `make dev` - Start development with database services
- `make install` - Install dependencies
- `make clean` - Clean build artifacts and containers

## Service Endpoints

### Backend Services
- **GraphQL API**: http://localhost:5656/db/main/ext/graphql
- **Admin UI**: http://localhost:5656/ui (admin/admin)
- **Redis**: localhost:6379

### Frontend (Development)
- **SvelteKit Dev Server**: http://localhost:5173
- **Frontend API Proxy**: http://localhost:5173/api/graphql

## Architecture

### Database-First Design
The project uses GelDB as a graph database for modeling complex HR relationships. All data operations go through the GraphQL endpoint or direct Gel CLI commands.

### Container Strategy
- All services run in Docker containers via docker-compose
- Multi-stage Dockerfile supports both development and production
- Non-root container execution for security

### Environment Management
- Uses Doppler CLI for secure environment variable management
- Never commit secrets to repository
- Environment-specific Docker configurations

## Development Patterns

1. **Always start with database services**: Run `make db-up` before development
2. **Use Makefile commands**: Avoid direct Docker commands, use the provided Make targets
3. **Test database connectivity**: Use `make db-health` to verify services
4. **Schema changes require migrations**: Use `make schema-create` for database changes
5. **Interactive debugging**: Use `make gel-repl` for database exploration

## Task Completion Workflow

1. Start services: `make db-up`
2. Verify health: `make db-health` 
3. Make changes
4. Test database operations
5. Create migrations if schema changed: `make schema-create`
6. Verify final state: `make schema-status`

## Common Operations

### Database Queries
```bash
# Interactive REPL
make gel-repl

# Single query
make gel-cli CMD="query 'SELECT 1'"
```

### Troubleshooting
```bash
# Check service status
make db-health

# View logs
make db-logs

# Reset everything
make db-reset
```

## Important Notes

### Security & Configuration
- **Doppler Only**: All environment variables managed through Doppler CLI - no .env files
- **PII Protection**: Employee data is encrypted at rest, RBAC enforced at GraphQL level
- **Authentication**: Gel Auth with JWT tokens, 15-minute expiry with refresh tokens
- **RBAC**: Multi-level permissions (schema, resolver, row-level security)

### Development Patterns
- **Database-first**: Existing GelDB schema drives frontend data models
- **GraphQL Integration**: Use Urql client with proper SSR and caching strategies
- **Mobile-Ready**: Responsive design foundation for future svelte-native integration
- **Container-based**: All services run in Docker containers via docker-compose

### Frontend Integration
- **Schema Sync**: Use `make frontend-codegen` after database schema changes
- **SSR Security**: Sensitive data fetched server-side in load functions
- **Testing Strategy**: Contract tests for GraphQL, integration tests with real dependencies
- **Performance**: Multi-layer caching (Urql + Redis + computed properties)

### Current Feature Development
- **Branch**: 001-develop-mountainhr-frontend
- **Status**: Implementation planning phase
- **Focus**: SvelteKit frontend integrating with existing GelDB backend