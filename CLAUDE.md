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
- `make quick-start` - Complete first-time setup
- `make dev` or `make server-dev` - Start PostGraphile development server (port 4000)
- `npm run dev` - Start SvelteKit frontend (port 5173)

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
