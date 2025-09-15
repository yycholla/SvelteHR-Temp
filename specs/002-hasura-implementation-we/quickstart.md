# Quickstart Guide: Hasura HR System

## Prerequisites

- Docker & Docker Compose
- Node.js 20+ and npm
- PostgreSQL 15+ 
- Redis (for caching)

## Quick Start (5 Minutes)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd SvelteHR
git checkout 002-hasura-implementation-we

# Install dependencies
npm install
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Required environment variables
cat >> .env << EOF
# Database
DATABASE_URL=postgresql://hasura:hasura123@localhost:5432/svelteHR
HASURA_GRAPHQL_DATABASE_URL=postgresql://hasura:hasura123@localhost:5432/svelteHR

# Hasura Configuration
HASURA_GRAPHQL_ADMIN_SECRET=your-admin-secret-here
HASURA_GRAPHQL_JWT_SECRET={"type":"HS256","key":"your-256-bit-secret-key"}
HASURA_GRAPHQL_ENABLE_CONSOLE=true

# Performance Settings
HASURA_GRAPHQL_API_LIMITS_ENABLED=true
HASURA_GRAPHQL_API_LIMITS_DEPTH=10
HASURA_GRAPHQL_API_LIMITS_RATE_LIMIT=1000

# Redis (Optional - Enterprise features)
REDIS_URL=redis://localhost:6379
HASURA_GRAPHQL_REDIS_URL=redis://localhost:6379
EOF
```

### 3. Start Services
```bash
# Start PostgreSQL, Redis, and Hasura
docker-compose up -d

# Wait for services to start (30 seconds)
sleep 30

# Apply database schema and seed data
npm run hasura:migrate
npm run hasura:metadata
npm run hasura:seed
```

### 4. Verify Installation
```bash
# Check Hasura is running
curl -X POST \
  http://localhost:8080/v1/graphql \
  -H 'Content-Type: application/json' \
  -H 'x-hasura-admin-secret: your-admin-secret-here' \
  -d '{"query":"{ users { id display_name } }"}'

# Expected response: List of users including admin user
```

### 5. Access Applications

- **Hasura Console**: http://localhost:8080/console
- **GraphQL API**: http://localhost:8080/v1/graphql  
- **SvelteKit Frontend** (after implementation): http://localhost:5173

## Performance Validation

### Test Response Times
```bash
# Install performance testing tool
npm install -g artillery

# Run performance tests
artillery run tests/performance/hasura-load-test.yml

# Expected results for sub-200ms target:
# - P50: <100ms
# - P95: <200ms
# - P99: <500ms
```

### Database Performance Check
```bash
# Connect to PostgreSQL
psql $DATABASE_URL

# Check index usage
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch 
FROM pg_stat_user_indexes 
ORDER BY idx_tup_read DESC;

# Check query performance
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

## Common GraphQL Queries

### Employee Directory (Most Common)
```graphql
query EmployeeDirectory($limit: Int = 50) {
  users(
    where: { is_active: { _eq: true } }
    order_by: { display_name: asc }
    limit: $limit
  ) {
    id
    display_name
    job_information {
      job_title
      department {
        name
      }
    }
    contact_information {
      email
      phone_number
    }
  }
}
```

### Department Hierarchy
```graphql
query DepartmentHierarchy {
  departments(where: { is_active: { _eq: true } }) {
    id
    name
    budget
    employee_count
    manager {
      display_name
    }
    subdepartments {
      id
      name
      employee_count
    }
  }
}
```

### Real-time Employee Status
```graphql
subscription EmployeeStatusUpdates($department_id: uuid!) {
  users(
    where: { 
      job_information: { department_id: { _eq: $department_id } }
      is_active: { _eq: true }
    }
  ) {
    id
    display_name
    onboarding_status
    job_information {
      job_title
    }
  }
}
```

## Authentication Testing

### Get JWT Token
```bash
# Login endpoint (to be implemented)
curl -X POST http://localhost:3001/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email": "admin@svelteHR.com", "password": "admin123"}'

# Use returned token for authenticated requests
TOKEN="your-jwt-token-here"

curl -X POST http://localhost:8080/v1/graphql \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query":"{ users { id display_name } }"}'
```

## Development Workflow

### Frontend Development (SvelteKit)
```bash
# Start development server
npm run dev

# Generate GraphQL types from schema
npm run codegen

# Run frontend tests
npm run test:frontend
```

### Backend Development 
```bash
# Apply new migrations
hasura migrate apply

# Update metadata
hasura metadata apply

# Reload metadata (after schema changes)
hasura metadata reload
```

## Troubleshooting

### Common Issues

#### Hasura Console Not Loading
```bash
# Check if Hasura is running
docker logs hasura-graphql-engine

# Restart if needed
docker-compose restart hasura
```

#### Slow Query Performance
```bash
# Check database connections
SELECT count(*), state FROM pg_stat_activity GROUP BY state;

# Should show reasonable connection count (<50% of max_connections)

# Check slow queries
SELECT query, mean_exec_time FROM pg_stat_statements 
WHERE mean_exec_time > 200 
ORDER BY mean_exec_time DESC;
```

#### Permission Errors
```bash
# Check JWT configuration
echo $HASURA_GRAPHQL_JWT_SECRET

# Test with admin secret instead of JWT
curl -H 'x-hasura-admin-secret: your-admin-secret-here' \
  http://localhost:8080/v1/graphql
```

### Performance Optimization

#### Enable Query Caching (Enterprise)
```yaml
# Add to docker-compose.yml
environment:
  HASURA_GRAPHQL_REDIS_URL: redis://redis:6379
  HASURA_GRAPHQL_CACHE_MAX_ENTRY_TTL: 300
```

#### Monitor Subscription Performance
```bash
# Check active subscriptions
curl -X POST http://localhost:8080/v1/graphql \
  -H 'x-hasura-admin-secret: your-admin-secret-here' \
  -d '{"query":"{ __schema { subscriptionType { name } } }"}'
```

#### Database Optimization
```sql
-- Run in PostgreSQL to optimize for HR workload
ANALYZE;
VACUUM ANALYZE;

-- Check cache hit ratio (should be >95%)
SELECT 
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as cache_hit_ratio
FROM pg_statio_user_tables;
```

## Success Criteria

### Performance Targets ✓
- [ ] P50 response time <100ms
- [ ] P95 response time <200ms  
- [ ] 1000+ concurrent users supported
- [ ] Database connection usage <80%

### Feature Validation ✓
- [ ] Employee directory loads <2 seconds
- [ ] Real-time updates work within 1 second
- [ ] Department hierarchy navigable
- [ ] Role-based access control enforced

### Security Validation ✓
- [ ] JWT authentication working
- [ ] Row-level security policies active
- [ ] Sensitive data properly protected
- [ ] Audit logging functional

## Next Steps

1. **Complete Implementation**: Run `/tasks` command to generate implementation tasks
2. **Frontend Integration**: Implement SvelteKit components with GraphQL
3. **Data Migration**: Execute migration from GelDB
4. **Load Testing**: Validate performance under production load
5. **Security Audit**: Complete penetration testing
6. **Production Deployment**: Deploy to staging/production environments

## Support

- **Documentation**: `/specs/002-hasura-implementation-we/`
- **Schema Reference**: `/contracts/graphql-schema.graphql`
- **Performance Guide**: `/research.md`
- **Issues**: Create GitHub issue with reproduction steps

This quickstart guide provides a working Hasura GraphQL HR system in under 5 minutes, optimized for sub-200ms response times with comprehensive role-based security.