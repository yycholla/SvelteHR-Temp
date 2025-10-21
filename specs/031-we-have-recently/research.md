# Research: Rust GraphQL API Complete Database Coverage

**Feature**: 031-we-have-recently
**Date**: 2025-10-11
**Status**: Complete

## Research Questions

### 1. Async-GraphQL Best Practices for 40+ Table Schema

**Decision**: Use modular schema composition with domain-based grouping

**Rationale**:
- async-graphql 7.0 supports schema composition via `MergedObject` and `MergedSubscription`
- Group models by domain (Employee, Documents, Events, Tasks, Reviews, Time, System, Analytics)
- Each domain module exports its own `Query`, `Mutation`, and types
- Root schema merges all domain queries/mutations
- Prevents single-file schema bloat (current query.rs is already large)
- Enables parallel development of different domains

**Alternatives Considered**:
- **Single-file approach**: Rejected due to maintainability issues (query.rs already 1000+ lines for 20 models)
- **Per-table modules**: Rejected due to excessive fragmentation (43+ separate files hard to navigate)

**Implementation Pattern**:
```rust
// graphql-rust-server/src/schema/domains/documents.rs
#[derive(Default)]
pub struct DocumentsQuery;

#[Object]
impl DocumentsQuery {
    async fn document(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<Document>> { ... }
    async fn documents(&self, ctx: &Context<'_>, ...) -> Result<DocumentConnection> { ... }
}

// graphql-rust-server/src/schema/query.rs
#[derive(MergedObject, Default)]
pub struct Query(
    CoreQuery,        // Users, Departments, Roles
    DocumentsQuery,   // Documents domain
    EventsQuery,      // Events domain
    // ... other domains
);
```

---

### 2. Relay Cursor Pagination Implementation in Rust

**Decision**: Implement custom Connection/Edge types with base64-encoded cursors

**Rationale**:
- PostGraphile uses Relay cursor pagination with base64-encoded cursors
- async-graphql provides `connection::query` helper for cursor-based pagination
- Cursors encode `(table_name, sort_field, primary_key)` for stable pagination
- Base64 encoding maintains compatibility with PostGraphile cursor format
- Supports `first`/`after` and `last`/`before` bidirectional pagination

**Alternatives Considered**:
- **Offset pagination**: Rejected due to PostGraphile incompatibility
- **Opaque UUID cursors**: Rejected due to lack of sort field support (breaks ordering)

**Implementation Pattern**:
```rust
#[derive(SimpleObject)]
pub struct UserConnection {
    pub edges: Vec<UserEdge>,
    pub page_info: PageInfo,
    pub total_count: i32,
}

#[derive(SimpleObject)]
pub struct UserEdge {
    pub cursor: String,  // base64("users:created_at:uuid")
    pub node: User,
}

#[derive(SimpleObject)]
pub struct PageInfo {
    pub has_next_page: bool,
    pub has_previous_page: bool,
    pub start_cursor: Option<String>,
    pub end_cursor: Option<String>,
}
```

---

### 3. SQLx Compile-Time Query Validation with 43+ Tables

**Decision**: Use SQLx offline mode with pre-generated query metadata

**Rationale**:
- SQLx requires database connection at compile time for query validation
- With 43+ tables, compile-time database connection is slow and fragile
- SQLx offline mode with `.sqlx/` directory caches query metadata
- `cargo sqlx prepare` generates metadata once, commits to version control
- CI/CD builds validate queries without live database connection
- Maintains compile-time safety without runtime overhead

**Alternatives Considered**:
- **Live database during compilation**: Rejected due to slow builds and CI complexity
- **Runtime query validation**: Rejected due to loss of compile-time safety guarantees

**Implementation Pattern**:
```bash
# Development: Generate query metadata
DATABASE_URL=postgres://... cargo sqlx prepare

# CI/CD: Verify queries without database
cargo build --offline
```

---

### 4. N+1 Query Prevention with DataLoader Pattern

**Decision**: Implement DataLoader per relationship type using `async-graphql` DataLoader

**Rationale**:
- async-graphql provides built-in DataLoader support
- Batch loads for 1-to-many relationships (user → skills, user → emergency_contacts)
- Batch loads for many-to-1 relationships (employee → department, task → assignees)
- Caching within single GraphQL request (not across requests)
- Essential for relationships like `User.skills` with 43+ tables of relationships

**Alternatives Considered**:
- **Manual batching**: Rejected due to error-prone implementation and lack of caching
- **Eager loading with JOINs**: Rejected due to Relay cursor pagination incompatibility

**Implementation Pattern**:
```rust
pub struct EmployeeSkillLoader {
    pool: PgPool,
}

#[async_trait::async_trait]
impl Loader<Uuid> for EmployeeSkillLoader {
    type Value = Vec<EmployeeSkill>;
    type Error = Arc<sqlx::Error>;

    async fn load(&self, keys: &[Uuid]) -> Result<HashMap<Uuid, Self::Value>, Self::Error> {
        let skills = sqlx::query_as!(
            EmployeeSkill,
            "SELECT * FROM hr_public.employee_skills WHERE employee_id = ANY($1)",
            keys
        )
        .fetch_all(&self.pool)
        .await?;

        // Group by employee_id
        Ok(skills.into_iter().fold(HashMap::new(), |mut map, skill| {
            map.entry(skill.employee_id).or_default().push(skill);
            map
        }))
    }
}
```

---

### 5. Materialized View Handling in GraphQL

**Decision**: Expose materialized views as read-only query fields with `lastRefreshedAt` tracking

**Rationale**:
- Materialized views (`mv_dashboard_summaries`, `mv_department_metrics`, etc.) are read-only
- Expose as queries (no mutations) with explicit refresh mutation
- Include `last_refreshed_at` timestamp in each view result for staleness indication
- Separate refresh mutation (`refreshDashboardSummaries`) executes `REFRESH MATERIALIZED VIEW CONCURRENTLY`
- Frontend can display data freshness and trigger manual refresh

**Alternatives Considered**:
- **Automatic refresh on query**: Rejected due to performance impact (refreshes are expensive)
- **Hide refresh controls**: Rejected due to lack of transparency for stale data

**Implementation Pattern**:
```rust
#[Object]
impl Query {
    async fn dashboard_summaries(&self, ctx: &Context<'_>) -> Result<DashboardSummary> {
        sqlx::query_as!(
            DashboardSummary,
            "SELECT * FROM hr_public.dashboard_summaries WHERE summary_key = 'global'"
        )
        .fetch_one(pool)
        .await
    }
}

#[Object]
impl Mutation {
    async fn refresh_dashboard_summaries(&self, ctx: &Context<'_>) -> Result<RefreshResult> {
        sqlx::query!("REFRESH MATERIALIZED VIEW CONCURRENTLY hr_public.dashboard_summaries")
            .execute(pool)
            .await?;
        Ok(RefreshResult { success: true, refreshed_at: Utc::now() })
    }
}
```

---

### 6. Model Organization for 23 New Tables

**Decision**: Group models by domain in separate modules under `models/`

**Rationale**:
- Current `models/mod.rs` exports 20 models linearly (no grouping)
- Adding 23+ models will make `mod.rs` unmanageable (500+ lines)
- Group by domain matching database schema organization:
  - `models/employee/` - employee_skills, employee_certifications, employee_vehicles, emergency_contacts, employee_goals
  - `models/documents/` - documents, document_versions, document_categories, document_assignments, document_access_logs, encrypted_file_storage
  - `models/time/` - time_off_policies, attendance_records
  - `models/analytics/` - materialized views (dashboard_summaries, department_metrics, etc.)
  - `models/system/` - rollback_requests, bulk_rollback_batches, bulk_rollback_items, activity_logs
  - `models/events/` - event_comments, event_history, event_waitlist
  - `models/tasks/` - task_types
  - `models/reviews/` - review_templates

**Alternatives Considered**:
- **Flat structure**: Rejected due to 43+ files in single directory
- **Alphabetical grouping**: Rejected due to lack of semantic cohesion

**Implementation Pattern**:
```rust
// graphql-rust-server/src/models/mod.rs
pub mod employee;
pub mod documents;
pub mod time;
pub mod analytics;
pub mod system;
pub mod events;
pub mod tasks;
pub mod reviews;

// Re-export for backward compatibility
pub use employee::{EmployeeSkill, EmployeeCertification, ...};
pub use documents::{Document, DocumentVersion, ...};
```

---

### 7. Contract Test Generation Strategy

**Decision**: Generate contract tests from GraphQL schema using introspection

**Rationale**:
- Contract tests validate GraphQL schema matches PostGraphile expectations
- Use GraphQL introspection to generate test cases for all queries/mutations
- Validate field names (camelCase), types, nullability, pagination structure
- Tests fail before implementation, pass after (TDD compliance)
- Automated test generation from schema ensures no missed coverage

**Alternatives Considered**:
- **Manual test writing**: Rejected due to error-prone process (43+ tables)
- **Runtime schema comparison**: Rejected due to lack of compile-time safety

**Implementation Pattern**:
```rust
// tests/contract/graphql_schema.rs
#[tokio::test]
async fn test_employee_skill_query_schema() {
    let schema = get_schema();

    // Verify query exists
    assert!(schema.has_query("employeeSkill"));

    // Verify field types match PostGraphile
    let query = schema.query("employeeSkill");
    assert_eq!(query.return_type(), "EmployeeSkill");
    assert!(query.has_arg("id", "UUID!"));

    // Verify EmployeeSkill type fields
    let skill_type = schema.type_("EmployeeSkill");
    assert!(skill_type.has_field("id", "UUID!"));
    assert!(skill_type.has_field("employeeId", "UUID!"));  // camelCase
    assert!(skill_type.has_field("skillName", "String!"));
    assert!(skill_type.has_field("proficiencyLevel", "ProficiencyLevel!"));
}
```

---

## Research Summary

All technical unknowns resolved with clear implementation decisions:

1. ✅ **Schema Composition**: Domain-based modular schema using `MergedObject`
2. ✅ **Pagination**: Relay cursor pagination with base64-encoded cursors
3. ✅ **Query Validation**: SQLx offline mode with `.sqlx/` metadata
4. ✅ **N+1 Prevention**: DataLoader per relationship type
5. ✅ **Materialized Views**: Read-only queries with explicit refresh mutations
6. ✅ **Model Organization**: Domain-grouped modules under `models/`
7. ✅ **Contract Tests**: Automated generation from GraphQL schema introspection

**No NEEDS CLARIFICATION markers remain**. Ready for Phase 1: Design & Contracts.
