# Research: PostgreSQL Container Schema Initialization

## Research Findings

### 1. PostgreSQL Docker Initialization Patterns

**Decision**: Use Docker entrypoint initialization with categorized SQL files
**Rationale**:

- PostgreSQL official Docker image supports automatic initialization via `/docker-entrypoint-initdb.d/`
- Files execute alphabetically, enabling predictable ordering
- Category-based organization (01-roles.sql, 02-schema.sql, 03-data.sql, 04-indexes.sql) provides clear separation
- Supports both .sql and .sh files for complex initialization logic

**Alternatives Considered**:

- Single monolithic init file: Rejected due to maintenance complexity and poor readability
- Migration-based approach: Rejected as this is development environment setup, not production migrations
- Custom initialization scripts: Rejected due to added complexity over standard Docker patterns

### 2. PostgreSQL Extension Management

**Decision**: Enable uuid-ossp and pgcrypto extensions in roles initialization file
**Rationale**:

- uuid-ossp provides uuid_generate_v4() function used throughout existing schema
- pgcrypto provides password hashing functions for authentication
- Extensions must be created before tables that reference their functions
- Placing in roles file ensures early execution in alphabetical order

**Alternatives Considered**:

- Separate extension file: Possible but adds unnecessary file fragmentation
- Create extensions in schema file: Rejected due to timing dependency issues

### 3. PostGraphile Role-Based Security Integration

**Decision**: Create roles and permissions structure compatible with existing PostGraphile configuration
**Rationale**:

- PostGraphile requires specific database roles (hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin)
- Row-Level Security (RLS) policies must be maintained for security compliance
- Existing production schema uses 4-tier RBAC system that must be preserved
- Role creation must happen before schema creation to avoid permission errors

**Alternatives Considered**:

- Simplified role structure: Rejected as would break existing frontend authentication
- Role creation in separate container: Rejected due to initialization timing complexity

### 4. Data Persistence Strategy

**Decision**: Use named Docker volumes for data persistence with full data retention
**Rationale**:

- Named volumes persist across container restarts and rebuilds
- Clarification specified "everything including temporary debugging data" should be retained
- PostgreSQL data directory volume mount preserves all database state
- Enables rapid development cycles without data loss

**Alternatives Considered**:

- Bind mounts: Rejected due to permission complexity and platform compatibility issues
- No persistence: Rejected as violates requirement to preserve existing data

### 5. Error Handling and Failure Recovery

**Decision**: Fail-fast approach with detailed error logging
**Rationale**:

- Clarification specified container should "fail to start with clear error messages"
- PostgreSQL initialization errors are automatically logged to container output
- Docker health checks can verify successful initialization
- Manual intervention preferred over automatic recovery for debugging capability

**Alternatives Considered**:

- Automatic retry with backoff: Rejected per clarification requiring manual intervention
- Fallback to minimal schema: Rejected as would mask initialization issues

### 6. Performance Optimization for 30-Second Target

**Decision**: Optimize initialization order and reduce unnecessary operations
**Rationale**:

- Create indexes after data insertion for faster bulk operations
- Minimize complex stored procedures and triggers during initialization
- Use efficient PostgreSQL configuration for development workloads
- Parallel execution where possible (roles/extensions can run independently)

**Alternatives Considered**:

- Pre-built database image: Rejected due to development flexibility requirements
- Minimal schema approach: Rejected as frontend requires complete schema

### 7. Schema Organization Strategy

**Decision**: Four-file category approach with alphabetical execution
**Rationale**:

- 01-roles.sql: Roles, extensions, basic setup
- 02-schema.sql: Table definitions, constraints, basic indexes
- 03-data.sql: Seed data, default records
- 04-indexes.sql: Performance indexes, complex constraints
- Clear separation of concerns enables maintenance and debugging
- Alphabetical naming ensures predictable execution order

**Alternatives Considered**:

- Timestamp-based files: Rejected as this is not a migration system
- Single comprehensive file: Rejected per clarification requiring category-based approach
- More granular categories: Rejected as adds complexity without clear benefit

## Technical Dependencies Validated

- **PostgreSQL 15-alpine**: ✅ Supports required extensions and RLS features
- **Docker Compose**: ✅ Named volumes and health checks supported
- **PostGraphile**: ✅ Compatible with planned role structure
- **uuid-ossp/pgcrypto**: ✅ Available in PostgreSQL 15-alpine base image

## Implementation Approach Summary

The solution will reorganize existing migration files into a category-based initialization structure within the development container configuration, ensuring reliable startup within performance targets while maintaining all existing functionality and data persistence requirements.
