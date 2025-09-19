# SvelteHR Development Commands

## Essential Commands

### Database Management

- `make db-up` - Start GelDB and Redis containers
- `make db-down` - Stop database containers
- `make db-reset` - Reset database with fresh data (deletes all data)
- `make db-health` - Check database service health
- `make db-logs` - View GelDB container logs

### Schema Management

- `make schema-status` - Check current schema and migration status
- `make schema-create` - Create new migration from schema changes
- `make schema-reset` - Reset schema (WARNING: deletes all data)

### Gel CLI Tools

- `make gel-repl` - Open interactive Gel REPL for database queries
- `make gel-cli CMD='...'` - Run custom gel CLI commands

### Development Workflow

- `make dev` - Start development with database services
- `make build` - Build for production
- `make install` - Install all dependencies
- `make clean` - Clean all build artifacts and containers

### Service Endpoints

- **GraphQL**: http://localhost:5656/db/main/ext/graphql
- **Admin UI**: http://localhost:5656/ui (credentials: admin/admin)
- **Redis**: localhost:6379

### Docker Commands

- `docker compose up -d geldb redis` - Start just database services
- `docker compose down` - Stop all services
- `docker compose logs -f geldb` - Follow GelDB logs

### Useful Gel CLI Examples

- `make gel-cli CMD="query 'SELECT 1'"` - Test database connection
- `make gel-repl` - Interactive database exploration
