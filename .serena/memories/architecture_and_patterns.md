# SvelteHR Architecture and Development Patterns

## Current Architecture

The project follows a clean-slate architecture focused on database infrastructure:

### Database Layer

- **GelDB**: Graph database for complex relationship modeling
  - Provides GraphQL API endpoint
  - Built-in admin interface
  - Schema migration support via gel CLI
  - Container: `svelteHR-geldb` on port 5656

- **Redis**: High-performance caching and session storage
  - Container: `svelteHR-redis` on port 6379
  - Configured with persistence (appendonly)

### Infrastructure Patterns

1. **Container-First**: All services run in Docker containers
2. **Make-Based Workflow**: Standardized commands via Makefile
3. **Environment Management**: Doppler CLI for secure config management
4. **Multi-Stage Docker Builds**: Separate development/production stages

### Development Principles

- **Database-First**: Schema migrations and database design drive development
- **Twelve-Factor App**: Environment-based configuration, container deployment
- **Non-Root Containers**: Security-focused container users (svelte:nodejs)

### Key Design Decisions

1. **GelDB over Traditional SQL**: Graph database for complex HR relationships
2. **GraphQL API**: Flexible query interface for frontend consumption
3. **Docker Compose**: Multi-service orchestration for development
4. **Makefile Interface**: Simplified command interface hiding Docker complexity

### File Structure

```
/
├── Makefile                 # Development workflow commands
├── docker-compose.yml       # Service orchestration
├── docker-compose.prod.yml  # Production configuration
├── Dockerfile              # Multi-stage build (currently SvelteKit-focused)
└── MountainHR/             # Project templates and scripts
    ├── scripts/            # Development automation scripts
    ├── memory/             # Project documentation templates
    └── templates/          # Code generation templates
```
