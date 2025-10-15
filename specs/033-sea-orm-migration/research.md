# Research Findings: SeaORM Migration

**Date**: 2025-10-14
**Feature**: 033-sea-orm-migration

## Research Tasks Completed

### 1. SeaORM Migration Patterns from sqlx

**Decision**: Use SeaORM's code generation tools and gradual migration approach
**Rationale**: SeaORM provides `sea-orm-cli` for automatic entity generation from existing database schema, enabling incremental migration without breaking changes.
**Alternatives Considered**:

- Manual entity creation (rejected: error-prone, time-consuming)
- Full rewrite (rejected: high risk, violates feature parity requirement)

**Key Findings**:

- Use `sea-orm-cli generate entity` to auto-generate entities from existing schema
- Maintain existing table structures to preserve frontend compatibility
- Implement repository pattern for clean data access layer

### 2. Authentication Integration with axum-login

**Decision**: Integrate axum-login with SeaORM user store for session management
**Rationale**: axum-login provides robust session handling for axum web framework, with extensible user store that can be backed by SeaORM entities.
**Alternatives Considered**:

- Custom JWT-only auth (rejected: misses session management benefits)
- sea-orm-session (rejected: session-only, lacks comprehensive auth features)

**Key Findings**:

- Implement `UserStore` trait for SeaORM user entity
- Use axum-login's session layer alongside existing JWT auth
- Maintain compatibility with SvelteKit Better Auth tokens

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

**Decision**: Map HR entities with proper SeaORM relationships and state transitions
**Rationale**: HR domain requires complex relationships (users-departments, tasks-assignments, leave-requests-approvals) that SeaORM handles well with type-safe relationships.
**Alternatives Considered**:

- Flat entity structure (rejected: loses relationship benefits)
- Manual relationship handling (rejected: error-prone, violates type safety)

**Key Findings**:

- Define entity relationships using SeaORM's `Related` trait
- Implement state machines for entities with transitions (Task: pending→in_progress→completed)
- Use SeaORM's active model pattern for mutable operations
- Maintain referential integrity with foreign key constraints

## Technical Approach Summary

**Migration Strategy**: Incremental migration using SeaORM code generation tools, maintaining existing database schema while replacing sqlx queries with SeaORM entities and queries.

**Authentication Enhancement**: Add axum-login for session management alongside existing JWT auth, with SeaORM-backed user store.

**Performance Optimization**: Implement connection pooling, eager loading, and query optimization to meet <500ms API response requirements.

**Data Model**: Type-safe entity relationships with state transitions, preserving all existing HR domain relationships and constraints.</content>
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
