# SvelteHR Initialization & Startup Guide

## Prerequisites

Before starting, ensure you have the following installed:
- Docker and Docker Compose
- Node.js 18+ and npm
- Make (for running Makefile commands)
- Doppler CLI (for environment variable management)

## Quick Start

```bash
# 1. Install dependencies
make install

# 2. Start all services (database + dev server)
make dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **PostGraphile GraphQL**: http://localhost:5000/graphiql
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Detailed Initialization Steps

### Step 1: Environment Setup

Configure Doppler for environment variables:
```bash
doppler setup
doppler run -- npm start
```

### Step 2: Database Initialization

#### Start Database Services
```bash
# Start GelDB (PostgreSQL) and Redis containers
make db-up

# Verify services are healthy
make db-health
```

#### Initialize Database Schema
```bash
# Apply initial schema and migrations
make schema-status

# If needed, create new migrations
make schema-create
```

#### Load Sample Data (Optional)
```bash
# Access Gel REPL for manual data operations
make gel-repl

# Or run specific commands
make gel-cli CMD="query 'SELECT * FROM employees LIMIT 5'"
```

### Step 3: PostGraphile Setup

PostGraphile automatically introspects your PostgreSQL database and creates a GraphQL API.

#### Start PostGraphile Server
```bash
# PostGraphile starts automatically with `make dev`
# Or start standalone:
npm run postgraphile
```

#### Configuration
PostGraphile configuration is in `.postgraphilerc.js`:
- JWT authentication via PostgreSQL functions
- Row-Level Security (RLS) enforcement
- GraphiQL IDE at `/graphiql`
- Smart query optimization

#### Verify GraphQL Endpoint
```bash
# Test GraphQL endpoint
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { queryType { name } } }"}'
```

### Step 4: Frontend Development Server

#### Start SvelteKit Development Server
```bash
# This also starts database if not running
make frontend-dev
```

#### Generate TypeScript Types
```bash
# Generate types from GraphQL schema
make frontend-codegen
```

## Service Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  SvelteKit  │────▶│ PostGraphile │────▶│ PostgreSQL  │
│  :5173      │     │    :5000     │     │   :5432     │
└─────────────┘     └──────────────┘     └─────────────┘
                            │                     │
                            ▼                     ▼
                    ┌──────────────┐     ┌─────────────┐
                    │   GraphiQL   │     │    Redis    │
                    │  :5000/graphiql    │   :6379     │
                    └──────────────┘     └─────────────┘
```

## Common Development Workflows

### Starting Fresh Development Session
```bash
# 1. Start all services
make dev

# 2. Check service health
make db-health

# 3. View logs if needed
make db-logs
```

### After Schema Changes
```bash
# 1. Create migration
make schema-create

# 2. Apply migration
make schema-status

# 3. Regenerate TypeScript types
make frontend-codegen
```

### Database Operations
```bash
# Interactive database exploration
make gel-repl

# Direct query execution
make gel-cli CMD="query 'SELECT COUNT(*) FROM employees'"

# View database logs
docker logs geldb-container
```

### Stopping Services
```bash
# Stop all services
make db-down

# Or stop specific service
docker stop geldb-container
docker stop redis-container
```

## Troubleshooting

### Database Connection Issues
```bash
# Check if containers are running
docker ps

# Verify database health
make db-health

# View detailed logs
make db-logs

# Reset database (WARNING: Destructive)
make db-reset
```

### PostGraphile Issues
```bash
# Check PostGraphile logs
npm run postgraphile -- --show-error-stack

# Verify database schema
psql -h localhost -U hasura -d hasura -c "\dt"

# Test JWT authentication
curl -X POST http://localhost:5000/graphql \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ currentUser { id email } }"}'
```

### Frontend Issues
```bash
# Clear build cache
rm -rf .svelte-kit

# Reinstall dependencies
make frontend-install

# Rebuild and restart
make frontend-build
make frontend-dev
```

## Environment Variables

Required environment variables (managed via Doppler):
```bash
# Database
DATABASE_URL=postgresql://hasura:hasura123@localhost:5432/hasura
REDIS_URL=redis://localhost:6379

# PostGraphile
POSTGRAPHILE_DATABASE_URL=postgresql://hasura:hasura123@localhost:5432/hasura
JWT_SECRET=your-jwt-secret
NODE_ENV=development

# Frontend
PUBLIC_GRAPHQL_ENDPOINT=http://localhost:5000/graphql
```

## Performance Monitoring

### Database Performance
```bash
# Monitor query performance
make gel-cli CMD="SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10"

# Check cache hit ratio
make gel-cli CMD="SELECT sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as cache_hit_ratio FROM pg_statio_user_tables"
```

### GraphQL Performance
```bash
# Enable query logging in PostGraphile
npm run postgraphile -- --export-schema-graphql schema.graphql --show-error-stack --enhanced-graphiql

# Monitor with GraphiQL's built-in profiler
# Visit http://localhost:5000/graphiql
```

## Security Considerations

1. **Never commit secrets**: All secrets managed via Doppler
2. **JWT Expiration**: Access tokens expire in 15 minutes
3. **RLS Enforcement**: Row-Level Security always active
4. **CORS Configuration**: Configured in PostGraphile settings
5. **SQL Injection Protection**: Parameterized queries only

## Next Steps

After successful initialization:

1. **Explore GraphQL API**: http://localhost:5000/graphiql
2. **View Frontend**: http://localhost:5173
3. **Run Tests**: `make frontend-test`
4. **Check TypeScript Types**: Generated in `src/lib/generated/`

## Support

For issues or questions:
1. Check logs: `make db-logs`
2. Verify health: `make db-health`
3. Review CLAUDE.md for project-specific guidance
4. Consult PostGraphile docs: https://www.graphile.org/postgraphile/