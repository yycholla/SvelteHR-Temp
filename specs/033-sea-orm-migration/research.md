# Research Findings: SeaORM Migration

**Date**: 2025-10-14
**Feature**: 033-sea-orm-migration

## Research Tasks Completed

### 1. SeaORM Migration Patterns from sqlx

**Decision**: Use SeaORM's code generation tools with comprehensive manual relationship mapping and gradual migration approach
**Rationale**: Analysis of full_backup.sql reveals 20+ tables with complex relationships, computed columns, business logic functions, and advanced features (encryption, audit trails, soft deletes). SeaORM provides `sea-orm-cli` for automatic entity generation, but manual mapping is required for:

- Complex self-referential hierarchies (departments, tasks)
- Computed columns (display_name, full_name)
- Business logic functions (RBAC, audit triggers)
- Advanced features (encryption, versioning, waitlists)

**Alternatives Considered**:

- Manual entity creation (rejected: error-prone, time-consuming for 20+ entities)
- Full rewrite (rejected: high risk, violates feature parity requirement)
- Schema-first migration (rejected: would break existing frontend and lose business logic)

**Key Findings**:

- Use `sea-orm-cli generate entity` to auto-generate base entities from existing schema
- Manually map 20+ entities with proper relationships and constraints
- Preserve existing table structures, functions, and triggers
- Handle computed columns through SeaORM entity methods
- Maintain soft delete patterns with `deleted_at` filtering
- Preserve business logic functions (calculate_business_days, RBAC functions)
- Support advanced features (document encryption, event waitlists, audit trails)

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

**Decision**: Map 20+ HR entities with proper SeaORM relationships, computed columns, business logic, and advanced features
**Rationale**: Full schema analysis reveals complex HR system with 20+ entities, business logic functions, encryption, audit trails, and advanced features that require comprehensive SeaORM mapping.
**Alternatives Considered**:

- Flat entity structure (rejected: loses relationship benefits and business logic)
- Manual relationship handling (rejected: error-prone, violates type safety)
- Ignore computed columns (rejected: breaks frontend compatibility)
- Skip advanced features (rejected: loses core functionality)

**Key Findings**:

- Define 20+ entities with proper SeaORM relationships and constraints
- Handle computed columns (display_name, full_name) through SeaORM entity methods
- Preserve business logic functions (calculate_business_days, RBAC functions, audit triggers)
- Implement state machines for entities with transitions (Task: todo→in_progress→completed)
- Use SeaORM's active model pattern for mutable operations with validation
- Maintain referential integrity with foreign key constraints and cascade rules
- Map existing enum types to SeaORM enum columns
- Handle self-referential relationships (departments hierarchy, task dependencies)
- Preserve soft delete patterns with `deleted_at` filtering
- Support advanced features (document encryption, event waitlists, audit trails)
- Maintain private schema entities (compensation_records) with proper access controls

### 5. Frontend Compatibility and GraphQL API Preservation

**Decision**: Maintain 100% GraphQL API compatibility with existing SvelteKit frontend across 20+ entities
**Rationale**: Complete schema analysis reveals extensive frontend dependencies on specific field names, relationships, and query patterns that must be preserved during migration.
**Alternatives Considered**:

- Modify frontend queries (rejected: violates feature parity requirement)
- Break API compatibility (rejected: breaks existing functionality)
- Partial migration (rejected: incomplete feature parity)

**Key Findings**:

- Preserve exact field names across 20+ entities (display_name, full_name, department_id, manager_id)
- Maintain GraphQL resolver signatures and return types for all entities
- Keep DataLoader batching patterns for relationship loading
- Preserve pagination structure (nodes, totalCount, pageInfo) for all collections
- Maintain filtering and sorting query patterns for complex queries
- Handle computed columns through SeaORM entity methods
- Preserve error response formats and status codes
- Maintain authentication context passing in resolvers
- Support advanced features (event waitlists, document versioning, audit trails)
- Preserve private schema access controls for sensitive data

## Technical Approach Summary

**Migration Strategy**: Incremental migration of 20+ entities using SeaORM code generation tools with comprehensive manual relationship mapping, maintaining existing database schema, computed columns, business logic functions, and constraints while replacing sqlx queries with SeaORM entities and queries.

**Frontend Compatibility**: 100% preservation of existing GraphQL API across all 20+ entities including field names, relationships, pagination, filtering, and authentication patterns to maintain SvelteKit frontend functionality.

**Authentication Enhancement**: Integrate axum-login with SeaORM user store while maintaining JWT compatibility with SvelteKit Better Auth, including RBAC, session management, and private schema access controls.

**Performance Optimization**: Implement SeaORM connection pooling, eager loading for complex relationships, and query optimization to meet <500ms API response requirements while preserving existing performance characteristics and business logic functions.

**Data Model**: Type-safe entity relationships with state transitions, computed columns, and business logic preservation, maintaining all existing HR domain relationships, constraints, soft delete patterns, and advanced features (encryption, audit trails, versioning).

**Risk Mitigation**: Comprehensive testing strategy including data integrity validation, API compatibility testing, and gradual rollout with rollback capabilities, plus preservation of business logic functions and advanced features.</content>
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
