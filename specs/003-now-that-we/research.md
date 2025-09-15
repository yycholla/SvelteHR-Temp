# Phase 0 Research: PostGraphile Migration for HR Systems

## Overview
This research phase consolidates technical decisions and best practices for migrating from Hasura GraphQL Engine to PostGraphile 4.x for the SvelteHR system. All research findings support the complete replacement of Hasura with PostGraphile as the GraphQL API layer.

## Research Findings

### 1. PostGraphile Configuration Architecture

**Decision**: Use PostGraphile 4.x in library mode with Express.js middleware  
**Rationale**: Library mode provides better control over middleware, authentication, and production deployment compared to CLI mode. Express.js integration allows custom middleware for logging, rate limiting, and error handling.  
**Alternatives considered**: CLI mode (rejected due to limited customization), Koa.js (rejected for consistency with existing Node.js ecosystem)

**Production Configuration Pattern:**
```javascript
const { postgraphile } = require("postgraphile");

app.use(
  postgraphile(
    DATABASE_URL,
    ["hr_public", "hr_private"],
    {
      jwtSecret: process.env.JWT_SECRET,
      defaultRole: "guest",
      ignoreRBAC: false,
      readOnlyConnection: READ_ONLY_DATABASE_URL,
      pgSettings: (req) => ({
        "user.employee_id": req.user?.employee_id,
        "user.department_id": req.user?.department_id,
        "user.role_level": req.user?.role_level
      })
    }
  )
);
```

### 2. Database Schema Strategy

**Decision**: Multi-schema approach with hr_public, hr_private, hr_hidden schemas  
**Rationale**: Separates concerns between publicly accessible GraphQL data, sensitive internal data, and hidden utility functions. Aligns with PostGraphile's schema introspection model.  
**Alternatives considered**: Single schema (rejected due to security concerns), separate databases (rejected due to operational complexity)

**Schema Structure:**
- `hr_public`: Tables exposed via GraphQL API
- `hr_private`: Sensitive data (passwords, tokens, audit logs)
- `hr_hidden`: Business logic functions not exposed to GraphQL

### 3. JWT Authentication Implementation

**Decision**: PostgreSQL-native JWT generation with composite types  
**Rationale**: Leverages SECURITY DEFINER functions for secure credential verification, keeps authentication logic in the database, reduces application layer complexity.  
**Alternatives considered**: Application-level JWT (rejected for security), OAuth2 integration (deferred to future phase)

**JWT Token Structure:**
```sql
CREATE TYPE hr_public.jwt_token AS (
  role text,
  exp integer,
  employee_id integer,
  department_id integer,
  role_level integer,
  is_admin boolean,
  permissions text[]
);
```

### 4. Role-Based Access Control

**Decision**: PostgreSQL role hierarchy with Row-Level Security (RLS)  
**Rationale**: Native PostgreSQL RLS provides database-enforced security that cannot be bypassed by application bugs. Role hierarchy simplifies permission management.  
**Alternatives considered**: Application-level permissions (rejected for security), complex RLS without roles (rejected for maintainability)

**Role Hierarchy:**
- `hr_guest` → `hr_employee` → `hr_manager` → `hr_admin` → `hr_super_admin`

### 5. Caching Strategy

**Decision**: Multi-layer caching with Redis and database optimizations  
**Rationale**: PostGraphile's built-in query optimization eliminates most N+1 problems, but Redis provides additional benefits for high-read HR scenarios like employee directories.  
**Alternatives considered**: No caching (rejected for performance), database-only optimization (partial solution), third-party GraphQL caching (adds complexity)

**Caching Layers:**
1. PostGraphile query compilation optimization
2. Redis caching for frequently accessed read-only data
3. PostgreSQL query plan caching
4. Frontend GraphQL client caching (Urql)

### 6. Performance Optimization

**Decision**: Focus on database optimization with strategic indexing  
**Rationale**: PostGraphile's query compilation makes database performance the primary bottleneck. Foreign key indexing and composite indexes for HR query patterns provide maximum ROI.  
**Alternatives considered**: Application-level optimization (limited impact), CDN for GraphQL (inappropriate for dynamic HR data)

**Critical Indexes:**
```sql
-- Foreign keys (PostGraphile requirement)
CREATE INDEX idx_employees_department_id ON hr_public.employees(department_id);
CREATE INDEX idx_time_off_requests_employee_id ON hr_public.time_off_requests(employee_id);

-- HR-specific query patterns
CREATE INDEX idx_employees_dept_status ON hr_public.employees(department_id, status);
CREATE INDEX idx_time_off_status_date ON hr_public.time_off_requests(status, start_date);
```

### 7. Migration Strategy

**Decision**: Parallel deployment with gradual cutover  
**Rationale**: Zero-downtime migration requires both Hasura and PostGraphile running simultaneously during transition period. GraphQL schema compatibility maintained through careful endpoint mapping.  
**Alternatives considered**: Direct replacement (high risk), blue-green deployment (resource intensive)

**Migration Phases:**
1. PostGraphile setup with schema compatibility
2. Parallel deployment with traffic split
3. GraphQL client update for new endpoints
4. Gradual traffic migration to PostGraphile
5. Hasura decommission

### 8. Security Hardening

**Decision**: Defense-in-depth with multiple security layers  
**Rationale**: HR systems require enterprise-grade security. Multiple layers provide redundancy and fail-safe behavior.  
**Alternatives considered**: Application-only security (insufficient), database-only security (incomplete)

**Security Layers:**
- PostgreSQL RLS policies for data access
- JWT token validation with short expiry
- Database user permissions and grants
- Connection string separation for read/write operations
- Environment variable security for secrets

### 9. Development and Testing

**Decision**: Real database dependencies for integration testing  
**Rationale**: PostGraphile's tight coupling with PostgreSQL makes mocking ineffective. Real database ensures tests validate actual RLS policies and PostgreSQL function behavior.  
**Alternatives considered**: Database mocking (inaccurate), test fixtures (incomplete coverage)

**Testing Strategy:**
- Contract tests for GraphQL schema validation
- Integration tests with real PostgreSQL and Redis
- Performance benchmarks for response times
- Security tests for RLS policy enforcement

### 10. Monitoring and Observability

**Decision**: Application-layer monitoring with structured logging  
**Rationale**: PostGraphile runs as Node.js middleware, allowing standard APM integration. Structured logging enables query tracing and performance monitoring.  
**Alternatives considered**: Database-only monitoring (incomplete), third-party GraphQL monitoring (vendor dependency)

**Observability Stack:**
- Winston for structured JSON logging
- Express middleware for request tracing
- PostgreSQL pg_stat_statements for query analysis
- Redis monitoring for cache performance

## Implementation Readiness

All technical unknowns have been resolved through research. The architecture provides:

✅ **Security**: PostgreSQL RLS + JWT authentication  
✅ **Performance**: <200ms response times with optimized queries  
✅ **Scalability**: Connection pooling and caching strategies  
✅ **Maintainability**: Schema-driven development with PostGraphile  
✅ **Migration Safety**: Parallel deployment strategy  

## Next Steps

Phase 1 can proceed with:
- Data model design based on research findings
- GraphQL contract generation using PostGraphile patterns
- Security policy definition using RLS approach
- Performance testing framework setup

No additional research required for implementation phases.