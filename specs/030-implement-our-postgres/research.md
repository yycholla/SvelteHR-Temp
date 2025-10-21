# Phase 0: Research & Technical Decisions

**Feature**: Complete PostgreSQL Database API Coverage via GraphQL
**Date**: 2025-10-10
**Status**: Complete

## Research Areas

### 1. GraphQL Schema Organization for Large-Scale APIs (43 Tables)

**Decision**: Use domain-based module organization with trait-based resolver composition

**Rationale**:
- async-graphql supports modular schema composition via `MergedObject` trait
- Organizing by domain (hr, events, tasks, documents, etc.) mirrors the database logical groups
- Each domain can have its own `Query`, `Mutation`, and model definitions
- Prevents single monolithic `schema.rs` file that would exceed 5000+ lines
- Enables parallel development across domains

**Pattern**:
```rust
// src/schema/mod.rs
#[derive(MergedObject, Default)]
pub struct QueryRoot(
    hr::HRQueries,
    events::EventQueries,
    tasks::TaskQueries,
    // ... 9 domains total
);

#[derive(MergedObject, Default)]
pub struct MutationRoot(
    hr::HRMutations,
    events::EventMutations,
    // ...
);
```

**Alternatives Considered**:
- Single-file schema: Rejected due to maintenance complexity at scale
- Table-based organization: Rejected because lacks business context (e.g., "users" vs "HR domain")

**References**:
- async-graphql docs: https://async-graphql.github.io/async-graphql/en/merging_objects.html
- Existing EventAttendee implementation demonstrates single-table pattern

---

### 2. SQLx Query Patterns for Dynamic Filtering & Relationships

**Decision**: Use `QueryBuilder` for dynamic filters, `query_as!` macro for static queries, manual joins for relationships

**Rationale**:
- `QueryBuilder` provides type-safe parameter binding for dynamic WHERE clauses (as shown in existing `event_attendees` query)
- `query_as!` macro offers compile-time SQL verification for static queries (single record fetch)
- Async-graphql DataLoader handles N+1 queries for relationships automatically
- Manual JOIN queries needed for nested relationship loading (user → department → employees)

**Pattern**:
```rust
// Dynamic filtering with QueryBuilder
let mut query = QueryBuilder::new("SELECT * FROM hr_public.users WHERE 1=1");
if let Some(filter) = filter {
    if let Some(department_id) = filter.department_id {
        query.push(" AND department_id = ");
        query.push_bind(department_id);
    }
}

// Static query with compile-time verification
let user = sqlx::query_as!(
    User,
    "SELECT * FROM hr_public.users WHERE id = $1",
    user_id
).fetch_one(pool).await?;

// DataLoader for batched loading
async fn load_departments(ids: &[Uuid]) -> Vec<Department> {
    query_as!(...).fetch_all(pool).await
}
```

**Alternatives Considered**:
- Diesel ORM: Rejected due to async ecosystem immaturity and compilation time overhead
- SeaORM: Rejected due to additional abstraction layer and learning curve
- Raw SQL strings: Rejected due to lack of type safety

**References**:
- SQLx QueryBuilder docs: https://docs.rs/sqlx/latest/sqlx/query_builder/struct.QueryBuilder.html
- Existing implementation in `graphql-rust-server/src/schema/query.rs:49-76`

---

### 3. GraphQL Query Complexity & Depth Limiting

**Decision**: Implement custom `QueryComplexityCalculator` and `DepthLimit` extension from async-graphql

**Rationale**:
- Spec requires max depth 10 to prevent DoS attacks
- Complexity calculation prevents expensive queries (e.g., fetching 1000 users each with 100 goals)
- async-graphql provides built-in extensions for both depth and complexity analysis
- Can reject queries before execution, saving database resources

**Implementation**:
```rust
use async_graphql::extensions::{Analyzer, DepthLimit};

let schema = Schema::build(QueryRoot, MutationRoot, SubscriptionRoot)
    .extension(DepthLimit::new(10)) // Max depth from spec
    .extension(Analyzer::new()) // Enable query analysis
    .limit_depth(10)
    .limit_complexity(1000) // Prevent expensive aggregations
    .finish();
```

**Complexity Formula**:
- Each field: complexity = 1
- Each list field: complexity = limit * child_complexity (default limit = 100)
- Nested relationships multiply: users(100) → goals(50) = 5000 complexity

**Alternatives Considered**:
- Manual depth tracking: Rejected due to error-prone implementation
- No limits: Rejected due to DoS vulnerability

**References**:
- async-graphql extensions: https://async-graphql.github.io/async-graphql/en/extensions.html
- Spec requirement FR-020 (max depth 10) and FR-019 (complexity analysis)

---

### 4. DataLoader Pattern for N+1 Query Prevention

**Decision**: Use async-graphql's built-in DataLoader with per-request batch loading

**Rationale**:
- DataLoader already included as dependency (dataloader 0.17 in Cargo.toml)
- async-graphql provides seamless integration via `DataLoader<K, V, S>` type
- Batches multiple single-record fetches into single SQL `WHERE IN` queries
- Essential for relationship traversal (e.g., 100 event_attendees → load 100 unique events in 1 query)

**Pattern**:
```rust
use async_graphql::dataloader::*;

struct EventLoader(DbPool);

#[async_trait::async_trait]
impl Loader<Uuid> for EventLoader {
    type Value = Event;
    type Error = Arc<sqlx::Error>;

    async fn load(&self, keys: &[Uuid]) -> Result<HashMap<Uuid, Event>, Self::Error> {
        let events = sqlx::query_as!(
            Event,
            "SELECT * FROM hr_public.events WHERE id = ANY($1)",
            keys
        ).fetch_all(&self.0).await?;

        Ok(events.into_iter().map(|e| (e.id, e)).collect())
    }
}

// In context setup
let loader = DataLoader::new(EventLoader(pool.clone()), tokio::spawn);
schema.data(loader);
```

**Alternatives Considered**:
- Manual batching: Rejected due to complexity and error-prone tracking
- Eager loading with JOINs: Rejected due to GraphQL's dynamic field selection (overfetching)

**References**:
- async-graphql DataLoader guide: https://async-graphql.github.io/async-graphql/en/dataloader.html
- dataloader crate: https://docs.rs/dataloader/0.17/dataloader/

---

### 5. Optimistic Locking Implementation in Rust/SQLx

**Decision**: Use `updated_at` timestamp comparison with SQL `WHERE` clause version check

**Rationale**:
- Spec requires optimistic locking (FR-011) to handle concurrent updates
- PostgreSQL doesn't have native optimistic locking, must be application-enforced
- Compare client-provided `updated_at` timestamp with current database value in UPDATE
- If mismatch, return `ConflictError` requiring client to refresh and retry

**Implementation**:
```rust
// GraphQL input includes version
#[derive(InputObject)]
struct UpdateEventInput {
    id: Uuid,
    title: Option<String>,
    updated_at: DateTime<Utc>, // Version field from client
}

// Mutation resolver
async fn update_event(input: UpdateEventInput) -> Result<Event> {
    let result = sqlx::query_as!(
        Event,
        r#"
        UPDATE hr_public.events
        SET title = COALESCE($1, title),
            updated_at = NOW()
        WHERE id = $2 AND updated_at = $3
        RETURNING *
        "#,
        input.title,
        input.id,
        input.updated_at // Version check
    ).fetch_optional(pool).await?;

    match result {
        Some(event) => Ok(event),
        None => Err(Error::new("Conflict: Record was modified by another user"))
    }
}
```

**Alternatives Considered**:
- Version number column: Rejected due to additional schema changes required
- Row-level locking (SELECT FOR UPDATE): Rejected due to long-lived GraphQL connections causing deadlocks
- Last-write-wins: Rejected by spec requirement for conflict detection

**References**:
- Spec requirement FR-011 (optimistic locking with conflict errors)
- PostgreSQL UPDATE docs: https://www.postgresql.org/docs/current/sql-update.html

---

### 6. Soft Delete Implementation with SQLx

**Decision**: Use `deleted_at` timestamp column with trigger-based defaults and query filters

**Rationale**:
- Spec requires soft delete (FR-031) to preserve audit trail
- Add `deleted_at TIMESTAMPTZ DEFAULT NULL` to all mutable tables
- Default queries filter `WHERE deleted_at IS NULL`
- Provide explicit `includeDeleted: Boolean` flag for admin queries
- PostgreSQL trigger automatically sets `deleted_at = NOW()` on DELETE

**Implementation**:
```rust
// GraphQL filter input
#[derive(InputObject)]
struct EventFilter {
    include_deleted: Option<bool>,
    // ... other filters
}

// Query with soft delete filter
let mut query = QueryBuilder::new("SELECT * FROM hr_public.events WHERE 1=1");
if !filter.include_deleted.unwrap_or(false) {
    query.push(" AND deleted_at IS NULL");
}

// Delete mutation (soft delete)
async fn delete_event(id: Uuid) -> Result<bool> {
    sqlx::query!(
        "UPDATE hr_public.events SET deleted_at = NOW() WHERE id = $1",
        id
    ).execute(pool).await?;
    Ok(true)
}

// Trigger to intercept DELETE (migration)
CREATE OR REPLACE FUNCTION soft_delete_event()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE hr_public.events SET deleted_at = NOW() WHERE id = OLD.id;
    RETURN NULL; -- Prevent actual DELETE
END;
$$ LANGUAGE plpgsql;
```

**Alternatives Considered**:
- Hard delete: Rejected by spec requirement FR-031
- Separate `deleted` boolean: Rejected due to lack of deletion timestamp for auditing
- Archive table: Rejected due to complexity of cross-table relationships

**References**:
- Spec requirements FR-031 to FR-033 (soft delete with audit preservation)
- PostgreSQL triggers: https://www.postgresql.org/docs/current/sql-createtrigger.html

---

### 7. JWT Middleware & RBAC Enforcement in Axum

**Decision**: Implement Axum middleware layer for JWT validation, pass user context via request extensions

**Rationale**:
- CLAUDE.md requires RBAC with JWT bearer tokens
- Axum middleware can intercept requests before GraphQL layer
- Extract JWT from `Authorization: Bearer <token>` header
- Validate signature, expiry, and decode user ID + roles
- Store user context in request extensions for resolver access
- GraphQL resolvers check permissions before database queries

**Implementation**:
```rust
use axum::{
    middleware::{self, Next},
    http::{Request, StatusCode},
    Extension,
};
use jsonwebtoken::{decode, Validation, DecodingKey};

#[derive(Clone)]
struct UserContext {
    user_id: Uuid,
    roles: Vec<String>,
    permissions: Vec<String>,
}

async fn jwt_middleware<B>(
    mut req: Request<B>,
    next: Next<B>,
) -> Result<Response, StatusCode> {
    let auth_header = req.headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let token = auth_header.strip_prefix("Bearer ")
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let decoded = decode::<Claims>(
        token,
        &DecodingKey::from_secret(SECRET.as_bytes()),
        &Validation::default()
    ).map_err(|_| StatusCode::UNAUTHORIZED)?;

    let user_ctx = UserContext {
        user_id: decoded.claims.user_id,
        roles: decoded.claims.roles,
        permissions: decoded.claims.permissions,
    };

    req.extensions_mut().insert(user_ctx);
    Ok(next.run(req).await)
}

// In main.rs
let app = Router::new()
    .route("/graphql", post(graphql_handler))
    .layer(middleware::from_fn(jwt_middleware));
```

**Alternatives Considered**:
- GraphQL-level auth: Rejected due to every resolver needing auth logic (repetitive)
- No middleware: Rejected by constitution security requirements

**References**:
- Axum middleware guide: https://docs.rs/axum/latest/axum/middleware/index.html
- jsonwebtoken crate: https://docs.rs/jsonwebtoken/latest/jsonwebtoken/
- CLAUDE.md RBAC requirements (lines 78-101)

---

### 8. RLS Session Variable Passing from Axum to PostgreSQL

**Decision**: Use SQLx transaction-level `SET LOCAL` commands to pass user context to RLS policies

**Rationale**:
- PostgreSQL RLS policies already exist in migrations
- RLS policies check `current_setting('app.user_id')` and `current_setting('app.user_role')`
- SQLx allows executing raw SQL before queries in same transaction
- Set session variables at transaction start, RLS policies automatically enforce

**Implementation**:
```rust
// In GraphQL resolver
async fn get_employees(ctx: &Context<'_>) -> Result<Vec<Employee>> {
    let pool = ctx.data::<DbPool>()?;
    let user = ctx.data::<UserContext>()?;

    // Start transaction and set RLS context
    let mut tx = pool.begin().await?;
    sqlx::query(&format!(
        "SET LOCAL app.user_id = '{}'; SET LOCAL app.user_role = '{}'",
        user.user_id, user.roles[0]
    )).execute(&mut *tx).await?;

    // Query executes with RLS policies active
    let employees = sqlx::query_as!(
        Employee,
        "SELECT * FROM hr_public.users"
    ).fetch_all(&mut *tx).await?;

    tx.commit().await?;
    Ok(employees)
}
```

**Alternatives Considered**:
- Application-level filtering: Rejected due to risk of bypassing RLS policies
- Connection-level session variables: Rejected due to connection pooling (state leakage)
- Separate RLS-aware connection pool: Rejected due to complexity

**References**:
- PostgreSQL SET LOCAL: https://www.postgresql.org/docs/current/sql-set.html
- SQLx transactions: https://docs.rs/sqlx/latest/sqlx/struct.Transaction.html
- Existing RLS policies in migrations/20251009_008_create_rls_policies.sql

---

### 9. Redis Caching Strategy with DataLoader

**Decision**: **DEFERRED** - Use in-memory DataLoader caching initially, evaluate Redis if performance benchmarks show need

**Rationale**:
- DataLoader already provides per-request caching (prevents duplicate fetches in same query)
- Adding Redis adds operational complexity (deployment, cache invalidation)
- Constitution requires <200ms, spec allows <1000ms (performance deviation justified)
- Benchmark performance first with DataLoader + PostgreSQL query optimization
- If benchmarks show >200ms for common queries, add Redis for:
  - User/department lookups (high read, low write)
  - Permission/role definitions (static data)

**Performance Optimization Priority**:
1. PostgreSQL indexes analysis (existing indexes in migrations)
2. DataLoader batching (primary N+1 prevention)
3. Query complexity limits (prevent expensive aggregations)
4. Connection pooling tuning (SQLx default pool size)
5. **THEN** consider Redis if needed

**Alternatives Considered**:
- Immediate Redis integration: Rejected due to premature optimization
- No caching: Rejected by constitution performance requirements

**References**:
- Constitution requirement IV (Performance Standards)
- Spec FR-021 (cache frequently accessed data)

---

## Summary of Technical Decisions

| Area | Decision | Status |
|------|----------|--------|
| Schema Organization | Domain-based modules with `MergedObject` | ✅ Final |
| Database Queries | SQLx `QueryBuilder` + `query_as!` macro | ✅ Final |
| Query Limits | async-graphql `DepthLimit(10)` + complexity analyzer | ✅ Final |
| N+1 Prevention | DataLoader with per-request batching | ✅ Final |
| Concurrency | Optimistic locking via `updated_at` timestamp | ✅ Final |
| Deletion | Soft delete with `deleted_at` timestamp + triggers | ✅ Final |
| Authentication | Axum JWT middleware with request extensions | ✅ Final |
| Authorization | RLS via transaction-level `SET LOCAL` variables | ✅ Final |
| Caching | DataLoader (in-memory), Redis deferred pending benchmarks | ⏸️ Deferred |

---

## Open Questions for Phase 1 Design

1. **GraphQL Subscriptions**: Spec mentions real-time updates (FR-027) but doesn't specify which tables. Need to design subscription architecture (WebSocket vs Server-Sent Events).

2. **Backward Compatibility Layer**: Spec requires frontend compatibility (FR-012 to FR-016). Need to map PostGraphile query patterns to new schema (e.g., `allUsers` vs `users`, `userById` vs `user(id: ...)`).

3. **Migration Strategy**: Dual-API operation period (FR-036) requires both PostGraphile and Rust API running simultaneously. Need coordination plan for schema changes.

4. **Error Handling Standardization**: Need consistent GraphQL error format across all 43 tables (validation errors, not found, unauthorized, conflict, server errors).

5. **Testing Strategy**: Need decision on integration test coverage (all 43 tables individually? Sample subset? Critical paths only?).

---

**Phase 0 Status**: ✅ **COMPLETE** - All unknowns resolved, ready for Phase 1 design
