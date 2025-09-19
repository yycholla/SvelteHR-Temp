# SvelteHR Project Overview

## Project Purpose

SvelteHR is an HR management system that has been recently stripped down to a "clean slate" state. The project originally contained a full SvelteKit frontend but has been reduced to just the database infrastructure components (GelDB and Redis) as indicated by recent git commits.

## Current State

- **Status**: Clean slate - frontend components removed, keeping only database infrastructure
- **Architecture**: Database-only setup with GelDB (graph database) and Redis (caching/session storage)
- **Environment**: Uses Doppler for environment variable management
- **Deployment**: Docker-based with multi-stage builds for production/development

## Key Components

1. **GelDB**: Primary graph database running on port 5656
   - Admin UI available at http://localhost:5656/ui (admin/admin)
   - GraphQL endpoint at http://localhost:5656/db/main/ext/graphql
   - Schema migration support via gel CLI

2. **Redis**: Caching and session storage on port 6379
   - Used for application caching and session management

3. **Docker Infrastructure**: Multi-service setup with development and production configurations

## Tech Stack

- **Database**: GelDB (graph database)
- **Cache**: Redis 7.2
- **Container**: Docker with multi-stage builds
- **Config Management**: Doppler CLI for environment variables
- **Build Tools**: Make for development workflow automation
- **Migration**: Gel CLI for database schema management
