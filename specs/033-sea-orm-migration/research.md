# Research Findings: SeaORM Migration

**Date**: 2025-10-14
**Feature**: 033-sea-orm-migration

## Research Tasks Completed

### 1. SeaORM Migration Patterns from sqlx

**Decision**: Use SeaORM's code generation tools with manual relationship mapping and gradual migration approach
**Rationale**: SeaORM provides `sea-orm-cli` for automatic entity generation from existing database schema, enabling incremental migration. However, complex relationships and computed columns require manual mapping to maintain frontend compatibility.
**Alternatives Considered**:

- Manual entity creation (rejected: error-prone, time-consuming)
- Full rewrite (rejected: high risk, violates feature parity requirement)
- Schema-first migration (rejected: would break existing frontend)

**Key Findings**:

- Use `sea-orm-cli generate entity` to auto-generate base entities from existing schema
- Manually map complex relationships (self-referential, computed columns, multi-table joins)
- Preserve existing table structures and constraints to maintain data integrity
- Implement repository pattern for clean data access layer
- Handle computed columns through SeaORM's active model pattern or custom methods
- Maintain soft delete patterns with `deleted_at` timestamps

### 2. Authentication Integration with axum-login

**Decision**: Integrate axum-login with SeaORM user store while maintaining JWT compatibility
**Rationale**: axum-login provides robust session handling for axum web framework, with extensible user store that can be backed by SeaORM entities. Must maintain existing JWT token compatibility with SvelteKit Better Auth.
**Alternatives Considered**:

- Custom JWT-only auth (rejected: misses session management benefits)
- sea-orm-session (rejected: session-only, lacks comprehensive auth features)
- Replace JWT with sessions (rejected: breaks existing SvelteKit integration)

**Key Findings**:

- Implement `UserStore` trait for SeaORM user entity with password hashing
- Use axum-login's session layer alongside existing JWT auth middleware
- Maintain JWT token validation for GraphQL API compatibility
- Map existing user roles to SeaORM entity permissions
- Handle password hashing migration from current implementation
- Preserve existing RBAC hierarchy and permission checks

### 3. Performance Optimization Strategies for SeaORM

**Decision**: Implement connection pooling, query optimization, and caching
**Rationale**: SeaORM supports advanced performance features that can improve upon sqlx while maintaining the <500ms API response target.
**Alternatives Considered**:

- Basic query migration (rejected: misses optimization opportunities)
- Premature optimization (rejected: violates performance requirements)

**Key Findings**:

- Use `sqlx::PgPool` for connection pooling (SeaORM compatible)
- Implement eager loading for relationships to reduce N+1 queries
- Add database indexes for frequently queried fields
- Use SeaORM's query builder for complex filtering

### 4. Entity Relationship Mapping for HR Domain

**Decision**: Map HR entities with proper SeaORM relationships, computed columns, and state transitions
**Rationale**: HR domain requires complex relationships, computed columns, and business logic that SeaORM handles well with type-safe relationships and active models.
**Alternatives Considered**:

- Flat entity structure (rejected: loses relationship benefits)
- Manual relationship handling (rejected: error-prone, violates type safety)
- Ignore computed columns (rejected: breaks frontend compatibility)

**Key Findings**:

- Define entity relationships using SeaORM's `Related` trait and `Entity` associations
- Handle computed columns (display_name, full_name) through SeaORM's column mapping
- Implement state machines for entities with transitions (Task: todo→in_progress→completed)
- Use SeaORM's active model pattern for mutable operations with validation
- Maintain referential integrity with foreign key constraints and cascade rules
- Map existing enum types to SeaORM enum columns
- Handle self-referential relationships (departments hierarchy, task dependencies)
- Preserve soft delete patterns with `deleted_at` filtering

### 5. Frontend Compatibility and GraphQL API Preservation

**Decision**: Maintain 100% GraphQL API compatibility with existing SvelteKit frontend
**Rationale**: Frontend depends on specific field names, relationships, and query patterns that must be preserved during migration.
**Alternatives Considered**:

- Modify frontend queries (rejected: violates feature parity requirement)
- Break API compatibility (rejected: breaks existing functionality)

**Key Findings**:

- Preserve exact field names (display_name, full_name, department_id, manager_id)
- Maintain GraphQL resolver signatures and return types
- Keep DataLoader batching patterns for relationship loading
- Preserve pagination structure (nodes, totalCount, pageInfo)
- Maintain filtering and sorting query patterns
- Handle computed columns through SeaORM entity methods
- Preserve error response formats and status codes
- Maintain authentication context passing in resolvers

## Technical Approach Summary

**Migration Strategy**: Incremental migration using SeaORM code generation tools with manual relationship mapping, maintaining existing database schema, computed columns, and constraints while replacing sqlx queries with SeaORM entities and queries.

**Frontend Compatibility**: 100% preservation of existing GraphQL API including field names, relationships, pagination, filtering, and authentication patterns to maintain SvelteKit frontend functionality.

**Authentication Enhancement**: Integrate axum-login with SeaORM user store while maintaining JWT compatibility with SvelteKit Better Auth, including RBAC and session management.

**Performance Optimization**: Implement SeaORM connection pooling, eager loading for complex relationships, and query optimization to meet <500ms API response requirements while preserving existing performance characteristics.

**Data Model**: Type-safe entity relationships with state transitions, computed columns, and business logic preservation, maintaining all existing HR domain relationships, constraints, and soft delete patterns.

**Risk Mitigation**: Comprehensive testing strategy including data integrity validation, API compatibility testing, and gradual rollout with rollback capabilities.</content>
</xai:function_call: write>  
Assistant: Now I need to execute Phase 1: Design & Contracts. First, extract entities from the feature spec to create data-model.md. From the spec, the key entities are:

- User
- Department
- Employee Records
- Tasks (with states: pending → in_progress → completed/cancelled)
- Leave Requests (with states: pending → approved/rejected/cancelled)
- Performance Reviews (with states: draft → submitted → in_review → completed)
- Audit Logs
- Notifications
- Documents
- Reports

Let me create the data-model.md file. Then generate API contracts from functional requirements. Finally, update agent context. But first, let me create data-model.md. The contracts would be GraphQL schema files based on the existing GraphQL operations. Let me check what GraphQL operations exist.

From the project structure, there's src/lib/graphql/operations/rollback-requests.graphql. Let me check what other operations exist.

Actually, for the contracts, I should create GraphQL schema contracts based on the entities and requirements. Let me create the data-model.md first.

Then for contracts, I can create a basic GraphQL schema outline. Finally, create quickstart.md and update agent context.

Let me start with data-model.md.

<xai:function_call name="write">
<parameter name="filePath">specs/033-sea-orm-migration/data-model.md
