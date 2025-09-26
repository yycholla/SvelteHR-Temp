# Quickstart: PostgreSQL Container Schema Initialization

## Prerequisites
- Docker and Docker Compose installed
- SvelteHR repository cloned locally
- 8GB+ available RAM for containers

## Quick Start Steps

### 1. Clean Environment Setup
```bash
# Navigate to dev containers directory
cd dev-containers/

# Clean any existing containers and volumes
docker-compose -f docker-compose.dev.yml down -v

# Remove old images (optional, for complete clean start)
docker-compose -f docker-compose.dev.yml pull
```

### 2. Container Startup
```bash
# Start PostgreSQL container first to verify initialization
docker-compose -f docker-compose.dev.yml up postgres-dev --build

# Watch logs for initialization progress
docker logs -f sveltehr-postgres-dev
```

**Expected Output Pattern:**
```
PostgreSQL Database directory appears to contain a database; Skipping initialization
[OR for first run]
/usr/local/bin/docker-entrypoint.sh: running /docker-entrypoint-initdb.d/01-roles.sql
/usr/local/bin/docker-entrypoint.sh: running /docker-entrypoint-initdb.d/02-schema.sql
/usr/local/bin/docker-entrypoint.sh: running /docker-entrypoint-initdb.d/03-data.sql
/usr/local/bin/docker-entrypoint.sh: running /docker-entrypoint-initdb.d/04-indexes.sql
database system is ready to accept connections
```

### 3. Validation Tests

#### Schema Validation
```bash
# Verify schemas exist
docker exec -e PGPASSWORD=postgres123 sveltehr-postgres-dev \
  psql -U postgres -d hr_system -c "\dn+"

# Expected output: hr_public, hr_private, hr_hidden schemas listed
```

#### Role Validation
```bash
# Verify roles created
docker exec -e PGPASSWORD=postgres123 sveltehr-postgres-dev \
  psql -U postgres -d hr_system -c "\du"

# Expected output: hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin roles listed
```

#### Table Count Validation
```bash
# Verify tables created
docker exec -e PGPASSWORD=postgres123 sveltehr-postgres-dev \
  psql -U postgres -d hr_system -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'hr_public';"

# Expected output: 16+ tables
```

#### Performance Validation
```bash
# Measure startup time (should be < 30 seconds)
time docker-compose -f docker-compose.dev.yml up postgres-dev --build
```

### 4. PostGraphile Integration Test
```bash
# Start backend container with PostGraphile
docker-compose -f docker-compose.dev.yml up backend-dev

# Test GraphQL endpoint
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'

# Expected: GraphQL schema response with HR types
```

### 5. Frontend Connection Test
```bash
# Start all containers
docker-compose -f docker-compose.dev.yml up

# Access frontend
open http://localhost:5173

# Expected: SvelteHR application loads without database connection errors
```

## Troubleshooting

### Container Fails to Start
**Symptom**: PostgreSQL container exits with error code 1 or 3
**Solution**:
1. Check logs: `docker logs sveltehr-postgres-dev`
2. Look for SQL syntax errors in initialization files
3. Verify file permissions and Docker volume access
4. Check available disk space

### Initialization Timeout (>30 seconds)
**Symptom**: Container takes longer than 30 seconds to become ready
**Investigation**:
1. Check system resources (CPU, memory)
2. Verify initialization file complexity
3. Monitor Docker container resource limits
4. Review PostgreSQL configuration settings

### Permission Errors
**Symptom**: "role does not exist" or permission denied errors
**Solution**:
1. Verify 01-roles.sql executed successfully
2. Check role creation syntax
3. Ensure proper alphabetical file ordering
4. Validate PostgreSQL role hierarchies

### PostGraphile Connection Issues
**Symptom**: Backend cannot connect to database or GraphQL errors
**Solution**:
1. Verify container networking (same Docker network)
2. Check database URL in backend environment variables
3. Confirm database ready before backend startup
4. Validate schema permissions for PostGraphile user

### Data Persistence Issues
**Symptom**: Data lost after container restart
**Solution**:
1. Verify named volume configuration in docker-compose.yml
2. Check volume mount paths
3. Ensure containers stopped gracefully
4. Validate PostgreSQL data directory permissions

## Success Criteria Checklist

- [ ] Container starts successfully within 30 seconds
- [ ] All three schemas (hr_public, hr_private, hr_hidden) created
- [ ] Five database roles created with proper permissions
- [ ] 16+ tables created in hr_public schema
- [ ] PostGraphile GraphQL endpoint responds successfully
- [ ] Frontend application connects to database
- [ ] Data persists across container restarts
- [ ] Clear error messages on initialization failure
- [ ] No manual intervention required for startup

## Next Steps

After successful quickstart:
1. Run full test suite to verify functionality
2. Begin feature development with reliable database
3. Use container SSH access for debugging if needed
4. Monitor container performance and resource usage

## Development Workflow

```bash
# Daily development startup
docker-compose -f docker-compose.dev.yml up

# Clean restart when needed
docker-compose -f docker-compose.dev.yml down && docker-compose -f docker-compose.dev.yml up

# Full reset (loses all data)
docker-compose -f docker-compose.dev.yml down -v && docker-compose -f docker-compose.dev.yml up
```