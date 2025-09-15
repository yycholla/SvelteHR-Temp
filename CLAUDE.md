# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SvelteHR is a comprehensive HR management system built with SvelteKit frontend and PostgreSQL backend. The system provides secure, role-based access to employee lifecycle management including hiring, onboarding, termination processes, and administrative functions. Currently migrating from Hasura GraphQL Engine to PostGraphile for enhanced transparency, performance, and to eliminate vendor lock-in.

## Tech Stack

### Backend Infrastructure
- **GraphQL Engine**: PostGraphile 4.x - PostgreSQL-native GraphQL layer (replacing Hasura)
- **Database**: PostgreSQL 15+ with Row-Level Security - primary data store
- **Cache**: Redis 7.2 - query caching with graphile-cache integration
- **Authentication**: PostgreSQL-native JWT with SECURITY DEFINER functions
- **Config Management**: Environment variables with secure defaults
- **Build System**: Node.js/TypeScript with Express middleware
- **Migration**: PostgreSQL native migrations with PostGraphile schema introspection

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
- **Hasura GraphQL API**: http://localhost:8080/v1/graphql
- **Hasura Console**: http://localhost:8080/console (admin interface)
- **PostgreSQL**: localhost:5432 (hasura/hasura123)
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
- **Branch**: 003-now-that-we (PostGraphile Migration)
- **Status**: Planning phase - Complete Hasura replacement
- **Focus**: Migration to PostGraphile with PostgreSQL-native authentication and RLS
- **Key Benefits**: Eliminates vendor lock-in, transparent GraphQL layer, database-first security

## Hasura Development Patterns

### GraphQL Operations
- **Query Optimization**: Use query limits, depth restrictions, and complexity analysis
- **Performance Targets**: Sub-200ms response times for all operations
- **Caching Strategy**: Redis server-side + Urql client-side + query plan caching
- **Real-time**: WebSocket subscriptions with multiplexing for efficiency

### Authentication & Security
- **JWT Integration**: HS256/RS256 tokens with Hasura session variables
- **Row-Level Security**: PostgreSQL RLS policies enforced through Hasura
- **Role Hierarchy**: Admin (100) → HR Admin (80) → Manager (60) → Employee (20)
- **Session Management**: 15-minute access tokens, 30-day refresh tokens

### Database Performance  
- **Connection Pooling**: PgBouncer with transaction-level pooling
- **Indexing**: HR-specific indexes for employee, department, and role queries
- **Query Monitoring**: pg_stat_statements for performance analysis
- **Cache Hit Ratio**: Target >95% for optimal performance

### Development Commands (Hasura)
```bash
# Hasura operations
hasura migrate apply        # Apply database migrations
hasura metadata apply       # Apply GraphQL metadata
hasura console             # Open Hasura Console
hasura migrate create <name> # Create new migration
hasura metadata export     # Export current metadata

# Performance testing
npm run test:performance   # Run load tests
npm run test:graphql      # Run GraphQL contract tests
```