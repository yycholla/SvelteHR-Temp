# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SvelteHR is a comprehensive HR management system built with SvelteKit frontend and PostgreSQL backend. The system provides secure, role-based access to employee lifecycle management. Currently in active migration from Hasura GraphQL to PostGraphile for enhanced transparency and performance.

## Tech Stack

### Backend Infrastructure
- **GraphQL Engine**: PostGraphile 4.x (PostgreSQL-native GraphQL layer)
- **Database**: PostgreSQL 15+ with Row-Level Security
- **Cache**: Redis 7.2 for query caching
- **Authentication**: JWT with bcrypt password hashing
- **Server**: Express with TypeScript (`backend/src/server.ts`)

### Frontend
- **Framework**: SvelteKit with TypeScript
- **UI Components**: Custom components in `src/lib/components/base/` (Button, Input, Modal, etc.)
- **Styling**: TailwindCSS with CSS Variables
- **GraphQL Client**: Urql with SSR support
- **Testing**: Vitest + Playwright

## Development Commands

### Quick Start
- `./setup/init.sh` - Initialize complete development environment (NEW)
- `./setup/sync.sh` - Sync environment with remote changes (NEW)
- `make quick-start` - Complete first-time setup (legacy)
- `make dev` or `make server-dev` - Start PostGraphile development server (port 4000)
- `npm run dev` - Start SvelteKit frontend (port 5173)

### Environment Management (NEW)
- `./setup/init.sh` - Initialize environment from scratch
- `./setup/sync.sh` - Synchronize with remote changes
- `./setup/update.sh [component]` - Update specific components
- `./setup/rollback.sh` - Rollback to previous state
- `./setup/validate.sh check` - Validate environment health
- `./setup/validate.sh fix` - Auto-fix common issues

### Database Operations
- `make db-up` - Start PostgreSQL and Redis containers
- `make db-down` - Stop database containers
- `make db-reset` - Reset database with fresh data (destructive, prompts for confirmation)
- `make db-health` - Check database service health
- `make db-shell` - Open PostgreSQL shell
- `make db-logs` - View PostgreSQL container logs

### Server Operations
- `make server-dev` - Start PostGraphile server (development)
- `make server-prod` - Start PostGraphile server (production)
- `make server-stop` - Stop all server processes
- `make server-status` - Check server health
- `make server-logs` - View server logs

### Frontend Operations
- `npm run dev` - Start SvelteKit dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Run svelte-check
- `npm run lint` - Run linter
- `npm run format` - Format code with Prettier
- `npm run test` - Run all tests
- `npm run test:unit` - Run unit tests
- `npm run test:e2e` - Run Playwright tests

### Backend Operations (in backend/ directory)
- `npm run dev` - Start with hot reload (tsx watch)
- `npm run start:dev` - Start development server
- `npm run start:prod` - Start production server
- `npm run build` - Compile TypeScript
- `npm run test` - Run all backend tests
- `npm run lint` - Run ESLint
- `npm run type-check` - Check TypeScript types

### GraphQL Code Generation
- `npm run codegen` - Generate TypeScript types from GraphQL schema
- `npm run codegen:watch` - Watch mode for codegen
- `npm run codegen:hasura` - Generate types for Hasura (legacy)

## Service Endpoints

### PostGraphile Services
- **GraphQL API**: http://localhost:4000/graphql
- **GraphiQL IDE**: http://localhost:4000/graphiql
- **Health Check**: http://localhost:4000/health
- **PostgreSQL**: localhost:5432 (postgres/postgres123)
- **Redis**: localhost:6379
- **pgAdmin**: http://localhost:5050 (admin@svelteHR.com/admin123)

### Frontend (Development)
- **SvelteKit Dev Server**: http://localhost:5173

### Legacy Hasura Endpoints (being phased out)
- **Hasura GraphQL**: http://localhost:8080/v1/graphql
- **Hasura Console**: http://localhost:8080/console

## Architecture

### Three-Layer Architecture

1. **Database Layer** (PostgreSQL)
   - Schemas: `hr_public`, `hr_private`, `hr_hidden`
   - Row-Level Security policies for data access control
   - Stored functions for business logic
   - Database-enforced constraints and validations

2. **GraphQL API Layer** (PostGraphile)
   - Located in `backend/src/`
   - Express server with PostGraphile middleware
   - JWT authentication with refresh tokens
   - Redis caching for performance
   - Monitoring and health checks

3. **Frontend Layer** (SvelteKit)
   - Server-side rendering with `+page.server.ts` files
   - Client-side state management with Urql
   - Custom component library in `src/lib/components/base/`
   - Form validation and error handling

### Key Architectural Patterns

- **Database-First Design**: Schema introspection drives the API
- **Role-Based Access Control**: 4-tier system (Admin:100, HR:80, Manager:60, Employee:20)
- **JWT Authentication**: Stateless auth with refresh token rotation
- **Multi-Layer Caching**: Redis + Urql + Browser caching
- **Container-Based Development**: Docker Compose for local services
- **Multi-Machine Development**: Seamless environment replication across machines

## Multi-Machine Development Workflow

### Initial Setup on New Machine
```bash
# Clone repository
git clone https://github.com/your-org/SvelteHR.git
cd SvelteHR

# Initialize environment (one command setup)
./setup/init.sh

# Verify setup
./setup/validate.sh check
```

### Daily Workflow
```bash
# Start of day - sync with remote
git pull
./setup/sync.sh

# End of day - push changes
git add .
git commit -m "Your changes"
git push
```

### Switching Between Machines
```bash
# Machine A: Save work
git push

# Machine B: Get latest
git pull
./setup/sync.sh
```

### Troubleshooting Sync Issues
```bash
# Check sync status
./setup/sync.sh --dry-run

# Fix validation issues
./setup/validate.sh fix

# Force sync if needed
./setup/sync.sh --force
```

## Testing

### Testing GraphQL Endpoints
```bash
# Test authentication
make test-auth

# Test GraphQL schema
make test-graphql

# Run contract tests
make test-contract
```

### Sample GraphQL Queries
```graphql
# Authentication
mutation {
  authenticate(input: {
    email: "admin@postgraphile-hr.com",
    password: "admin123"
  }) {
    jwtToken
  }
}

# Query departments
query {
  departments {
    nodes {
      id
      name
      employeeCount
      departmentHead {
        fullName
        email
      }
    }
  }
}
