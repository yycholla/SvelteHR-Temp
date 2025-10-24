# Research: Seed Data Implementation

**Date**: 2025-10-22
**Feature**: Comprehensive Development Seed Data with Audit Logging
**Branch**: `038-seed-data-implementation`

## Executive Summary

This research document analyzes the existing Rust GraphQL backend codebase to determine the best approach for implementing comprehensive seed data functionality using SeaORM. The backend already has basic seed data in migrations (admin user, roles, permissions), but we need to expand this to comprehensive development seed data with proper audit logging integration.

## Existing Infrastructure Analysis

### 1. Technology Stack

- **Rust Edition**: 2021
- **SeaORM Version**: 0.12.x (with postgres, runtime-tokio-rustls, macros, UUID, chrono support)
- **Database**: PostgreSQL (via SQLx 0.7)
- **Async Runtime**: Tokio 1.x (full features)
- **Migration Framework**: sea-orm-migration 0.12

### 2. Project Structure

```
graphql-rust-server/
├── src/
│   ├── main.rs              # Server entry point with DB connection setup
│   ├── lib.rs               # Library exports
│   ├── auth/                # Authentication system
│   ├── database.rs          # Database connection utilities
│   ├── models/              # SeaORM entity models
│   │   ├── user.rs
│   │   ├── role.rs
│   │   ├── permission.rs
│   │   ├── department.rs
│   │   ├── employee/        # Employee-related sub-models
│   │   ├── documents/       # Document management models
│   │   ├── events/          # Calendar event models
│   │   ├── reviews/         # Performance review models
│   │   ├── tasks/           # Task management models
│   │   ├── time/            # Time tracking models
│   │   └── system/          # System models including activity_log
│   ├── services/            # Business logic layer
│   ├── graphql/             # GraphQL schema and resolvers
│   └── utils/               # Shared utilities
├── migration/               # SeaORM migrations
│   ├── main.rs
│   ├── lib.rs
│   ├── m20251017_001_schemas.rs
│   ├── m20251017_002_enums.rs
│   ├── m20251017_003_auth.rs        # Auth tables
│   ├── m20251017_004_hr_core.rs     # Core HR tables
│   ├── m20251017_005_tasks.rs       # Task management tables
│   ├── m20251017_006_events.rs      # Event management tables
│   ├── m20251017_007_documents.rs   # Document management tables
│   ├── m20251017_008_reviews.rs     # Performance review tables
│   ├── m20251017_009_employee.rs    # Employee-related tables
│   ├── m20251017_010_time.rs        # Time tracking tables
│   ├── m20251017_011_system.rs      # System tables (activity_logs, etc.)
│   └── m20251017_012_seed.rs        # Basic seed data (admin user, roles, permissions)
└── tests/
    ├── contract/            # Contract tests
    └── load/                # Load testing
```

### 3. Existing Audit Logging System

**Location**: `src/models/system/activity_log.rs`

**Entity Structure**:
```rust
pub struct ActivityLog {
    pub id: Uuid,                           // Primary key
    pub user_id: Uuid,                      // Actor
    pub employee_id: Option<Uuid>,          // Optional employee context
    pub action: String,                     // Action performed (CREATE, UPDATE, DELETE, etc.)
    pub resource_type: String,              // Entity type
    pub resource_id: Option<Uuid>,          // Entity ID
    pub details: Option<JsonValue>,         // Additional details
    pub before_snapshot: Option<JsonValue>, // State before
    pub after_snapshot: Option<JsonValue>,  // State after
    pub is_rollback: bool,                  // Rollback flag
    pub rolled_back_log_id: Option<Uuid>,  // Original log if rollback
    pub ip_address: Option<String>,        // Request IP
    pub user_agent: Option<String>,        // Request user agent
    pub signature_id: Option<Uuid>,        // Signature for verification
    pub batch_id: Option<Uuid>,            // Batch operation ID
    pub created_at: DateTime<Utc>,         // Timestamp
}
```

**Key Findings**:
- Comprehensive audit logging system already exists
- Supports before/after snapshots for change tracking
- Has batch_id for grouping related operations
- GraphQL integration with async-graphql
- Uses SeaORM Active Record pattern

### 4. Database Schema (from migrations)

**Core Tables Identified**:

#### Auth Domain (m20251017_003_auth.rs)
- `hr_public.users` - User accounts with authentication
- `hr_public.roles` - RBAC roles (Admin, HR Manager, Manager, Employee)
- `hr_public.permissions` - Granular permissions (resource + action)
- `hr_public.role_permissions` - Role-permission assignments
- `hr_public.user_role_assignments` - User-role assignments
- `hr_public.sessions` - Session management

#### HR Core Domain (m20251017_004_hr_core.rs)
- `hr_public.departments` - Organizational departments
- `hr_public.leave_types` - Leave type definitions
- `hr_public.leave_balances` - Employee leave balances
- `hr_public.leave_requests` - Leave request records

#### Task Management (m20251017_005_tasks.rs)
- `hr_public.tasks` - Task records
- `hr_public.task_assignees` - Task-user assignments
- `hr_public.task_dependencies` - Task dependency graph
- `hr_public.task_audit_entries` - Task-specific audit trail

#### Events (m20251017_006_events.rs)
- `hr_public.events` - Calendar events
- `hr_public.event_attendees` - Event-user attendance
- `hr_public.event_comments` - Event discussions
- `hr_public.event_recurrence_rules` - Recurring event definitions

#### Documents (m20251017_007_documents.rs)
- `hr_public.documents` - Document metadata
- `hr_public.document_access_logs` - Document access audit trail
- `hr_public.document_versions` - Document version history

#### Performance Reviews (m20251017_008_reviews.rs)
- `hr_public.review_cycles` - Review period definitions
- `hr_public.performance_reviews` - Review records
- `hr_public.review_goals` - Goal definitions
- `hr_public.review_feedback` - Peer/manager feedback

#### Employee Extended (m20251017_009_employee.rs)
- `hr_public.employee_skills` - Employee skill records
- `hr_public.employee_certifications` - Certifications
- `hr_public.employee_vehicles` - Vehicle information
- `hr_public.emergency_contacts` - Emergency contact info
- `hr_public.employee_goals` - Employee goal tracking
- `hr_public.user_addresses` - Address information

#### Time Tracking (m20251017_010_time.rs)
- `hr_public.time_entries` - Time tracking records
- `hr_public.time_off_policies` - Time off policy definitions

#### System (m20251017_011_system.rs)
- `hr_public.activity_logs` - System-wide audit trail
- `hr_public.notifications` - User notification system
- `hr_public.system_settings` - Configuration key-value store
- `hr_public.linked_resources` - Cross-entity relationships

### 5. Existing Seed Data Approach

**Current Implementation** (`m20251017_012_seed.rs`):
- Uses raw SQL via `manager.get_connection().execute_unprepared()`
- Implements ON CONFLICT DO NOTHING for idempotency
- Creates minimal seed data (1 admin user, 4 roles, ~25 permissions)
- Runs as part of database migrations

**Limitations of Current Approach**:
- Raw SQL bypasses SeaORM ActiveModel system
- Does NOT trigger audit logging
- Minimal data volume (not suitable for realistic testing)
- No relationship depth (e.g., no employees, departments, leave requests)

## Recommended Approach

### Architecture Decision: Separate Binary

**Recommendation**: Create a separate binary (`[[bin]]` entry in Cargo.toml) for seed data generation rather than extending migrations.

**Rationale**:
1. **Separation of Concerns**: Migrations = schema changes; Seed data = test data population
2. **Environment Control**: Easily enable/disable via environment variables
3. **Execution Timing**: Run after migrations complete, during container startup
4. **SeaORM Integration**: Can use full SeaORM Active Model API with audit logging
5. **Development Flexibility**: Can be run independently without migration system

### Implementation Strategy

#### 1. New Binary Target

Add to `Cargo.toml`:
```toml
[[bin]]
name = "seed-data"
path = "src/bin/seed_data.rs"
```

#### 2. Module Structure

```
src/
└── seed_data/
    ├── mod.rs                  # Module entry point, orchestration
    ├── config.rs               # Seed configuration (volumes, options)
    ├── builders/               # Entity-specific builders
    │   ├── mod.rs
    │   ├── user_builder.rs     # Generates realistic users
    │   ├── role_builder.rs     # Ensures roles exist
    │   ├── department_builder.rs
    │   ├── employee_builder.rs
    │   ├── leave_builder.rs
    │   ├── event_builder.rs
    │   ├── document_builder.rs
    │   ├── review_builder.rs
    │   ├── task_builder.rs
    │   └── time_builder.rs
    ├── audit.rs                # Audit logging integration
    ├── context.rs              # Seed execution context (system user, batch ID)
    └── dependencies.rs         # Dependency resolution and ordering

src/bin/
└── seed_data.rs                # Binary entry point
```

#### 3. Execution Flow

```rust
// Pseudo-code for seed_data binary

async fn main() -> Result<()> {
    // 1. Environment check
    check_environment_safety()?; // ENABLE_SEED_DATA || ENVIRONMENT=development

    // 2. Load configuration
    let config = SeedConfig::from_env();

    // 3. Database connection
    let db = create_db_connection(&database_url).await?;

    // 4. Create seed context (system user, batch ID for audit logs)
    let context = SeedContext::new(&db).await?;

    // 5. Execute seeding in dependency order
    let result = SeedOrchestrator::new(db, context, config)
        .seed_roles()           // Foundation: roles and permissions
        .seed_departments()     // Core entities
        .seed_users()           // Users with role assignments
        .seed_employees()       // Employee profiles
        .seed_leave_types()
        .seed_leave_requests()
        .seed_events()
        .seed_documents()
        .seed_reviews()
        .seed_tasks()
        .seed_time_entries()
        .execute()
        .await?;

    // 6. Report results
    log_seed_summary(&result);

    Ok(())
}
```

#### 4. Idempotency Pattern

```rust
// Example idempotency check
async fn seed_users(db: &DatabaseConnection, context: &SeedContext, count: usize) -> Result<Vec<UserModel>> {
    let mut created = Vec::new();

    for i in 0..count {
        let email = format!("user{}@mountainhr.dev", i);

        // Check if exists by unique identifier
        let existing = User::find()
            .filter(user::Column::Email.eq(&email))
            .one(db)
            .await?;

        if existing.is_some() {
            tracing::info!("Skipping existing user: {}", email);
            continue; // Skip existing strategy
        }

        // Create new user via SeaORM ActiveModel
        let user = user::ActiveModel {
            id: Set(Uuid::new_v4()),
            email: Set(email),
            password_hash: Set(hash_password("password123")),
            first_name: Set(fake_first_name()),
            last_name: Set(fake_last_name()),
            ..Default::default()
        };

        let user_model = user.insert(db).await?;

        // Create audit log entry
        log_seed_creation(db, context, "users", user_model.id).await?;

        created.push(user_model);
    }

    Ok(created)
}
```

#### 5. Audit Logging Integration

```rust
// Audit logging helper for seed operations
async fn log_seed_creation(
    db: &DatabaseConnection,
    context: &SeedContext,
    resource_type: &str,
    resource_id: Uuid,
) -> Result<()> {
    use crate::models::system::activity_log;

    let log = activity_log::ActiveModel {
        id: Set(Uuid::new_v4()),
        user_id: Set(context.system_user_id),  // System user for seed operations
        employee_id: NotSet,
        action: Set("CREATE".to_string()),
        resource_type: Set(resource_type.to_string()),
        resource_id: Set(Some(resource_id)),
        details: Set(Some(json!({"source": "seed_data", "batch_id": context.batch_id}))),
        before_snapshot: NotSet,
        after_snapshot: NotSet,  // Could capture full entity if desired
        is_rollback: Set(false),
        rolled_back_log_id: NotSet,
        ip_address: Set(Some("127.0.0.1".to_string())),  // Localhost for seed
        user_agent: Set(Some("seed-data-binary".to_string())),
        signature_id: NotSet,
        batch_id: Set(Some(context.batch_id)),
        created_at: Set(Utc::now()),
    };

    log.insert(db).await?;
    Ok(())
}
```

### 6. Container Integration

**Docker Compose / Kubernetes Integration**:

```dockerfile
# Add to Dockerfile
RUN cargo build --release --bin seed-data

# Entry point script
#!/bin/bash
set -e

# Run migrations first
./migration run

# Check if seeding is enabled
if [ "$ENABLE_SEED_DATA" = "true" ] || [ "$ENVIRONMENT" = "development" ]; then
    echo "Seeding development data..."
    ./seed-data
fi

# Start main server
exec ./hr-graphql-server
```

**Environment Variables**:
- `ENABLE_SEED_DATA=true` - Explicit seed enable
- `ENVIRONMENT=development` - Alternative trigger
- `SEED_VOLUME_TARGET=small|medium|large` - Optional volume control (default: small = 10-50)

## Data Generation Libraries

### Recommended: `fake-rs`

**Rationale**:
- Pure Rust library for generating realistic fake data
- Supports multiple locales
- Type-safe generation with derive macros
- No external dependencies

**Usage**:
```rust
use fake::{Fake, Faker};
use fake::faker::name::en::*;
use fake::faker::internet::en::*;
use fake::faker::address::en::*;

let first_name: String = FirstName().fake();
let email: String = SafeEmail().fake();
let city: String = CityName().fake();
```

**Add to Cargo.toml**:
```toml
[dependencies]
fake = { version = "2.9", features = ["derive", "chrono", "uuid"] }
rand = "0.8"  # Already present as optional
```

## Dependency Resolution Order

**Seeding Order (respecting foreign keys)**:

1. **Foundation** (no dependencies):
   - Roles
   - Permissions
   - Role-Permission assignments
   - Leave Types
   - Time Off Policies

2. **Core Entities** (foundation dependencies):
   - Departments (can be self-referential for parent_id)
   - System User (for audit context)

3. **Primary Entities** (core dependencies):
   - Users (→ departments)
   - User-Role assignments (→ users, roles)

4. **Extended Entities** (primary dependencies):
   - Employee Skills (→ users)
   - Employee Certifications (→ users)
   - Employee Vehicles (→ users)
   - Emergency Contacts (→ users)
   - Employee Goals (→ users)
   - User Addresses (→ users)
   - Leave Balances (→ users, leave_types)

5. **Operational Entities** (multiple dependencies):
   - Leave Requests (→ users, leave_types)
   - Events (→ users as creator)
   - Event Attendees (→ events, users)
   - Documents (→ users as uploader)
   - Review Cycles (→ departments)
   - Performance Reviews (→ users, review_cycles)
   - Review Goals (→ performance_reviews)
   - Review Feedback (→ performance_reviews, users)
   - Tasks (→ users as creator)
   - Task Assignees (→ tasks, users)
   - Task Dependencies (→ tasks)
   - Time Entries (→ users)

6. **Audit Trail** (created automatically):
   - Activity Logs (via audit logging system)

## Risk Analysis

### High Risk Areas

1. **Foreign Key Constraint Violations**
   - **Mitigation**: Strict dependency ordering; validate references before insertion

2. **Unique Constraint Violations**
   - **Mitigation**: Idempotent checks; unique email/name generation with counters

3. **Accidental Production Execution**
   - **Mitigation**: Strict environment variable checks; fail-fast with clear error messages

4. **Performance Impact on Startup**
   - **Mitigation**: Target 10-50 records per entity (< 30s execution time); batch inserts where possible

### Medium Risk Areas

1. **Schema Migration Compatibility**
   - **Mitigation**: Run seed data AFTER migrations complete; version check if needed

2. **Audit Log Volume**
   - **Mitigation**: Use batch_id for grouping; consider optional audit logging for seed data

3. **Memory Consumption**
   - **Mitigation**: Stream creation rather than loading all in memory; limit data volumes

## Alternative Approaches Considered

### Alternative 1: Extend Migration System

**Rejected Because**:
- Raw SQL doesn't trigger audit logging
- Migrations should be schema-only per SeaORM best practices
- Cannot easily use SeaORM Active Model API
- Less flexible for environment-specific behavior

### Alternative 2: GraphQL Mutations

**Rejected Because**:
- Requires authentication/authorization complexity
- Slower execution (HTTP overhead)
- Cannot run automatically on container startup
- Audit logging would work but adds unnecessary complexity

### Alternative 3: External Seeding Script (Python/Node)

**Rejected Because**:
- Adds another language to the stack
- Cannot reuse Rust models and validation
- More deployment complexity
- Doesn't integrate with existing SeaORM/audit system

## Technology-Specific Considerations

### SeaORM Best Practices

1. **Use ActiveModel for Insertions**: Ensures model validation and relationships
2. **Use Entity::find() for Existence Checks**: Leverages ORM query builder
3. **Batch Operations**: Use `Entity::insert_many()` where relationships allow
4. **Connection Pooling**: Reuse database connection throughout seeding process

### Rust-Specific Patterns

1. **Builder Pattern**: Use for complex entity construction (e.g., UserBuilder)
2. **Result Type**: Propagate errors with `?` operator; fail fast on critical errors
3. **Async/Await**: Leverage Tokio runtime for parallel seed operations where safe
4. **Type Safety**: Use UUID types, enums for statuses, DateTime<Utc> for timestamps

## Success Criteria Validation

### Measurable Outcomes Alignment

- **SC-001**: Binary completes in <2 minutes → Small volume target (10-50 records) supports this
- **SC-002**: 10-50 records per entity → Configurable in SeedConfig
- **SC-003**: 100% audit logging → Every SeaORM insert triggers audit via helper function
- **SC-004**: <30s execution time → Small volume + batch operations achieve this
- **SC-005**: Reset via container restart → Binary re-runs idempotently with optional clear flag
- **SC-006**: Distinguishable audit logs → Use batch_id + "seed_data" source tag
- **SC-007**: Zero constraint violations → Dependency ordering enforced
- **SC-008**: No "no data" scenarios → Comprehensive entity coverage
- **SC-009**: Zero errors/warnings → Idempotent checks prevent duplicates
- **SC-010**: Idempotent execution → Skip-existing strategy verified

## Open Questions for Planning Phase

1. **Optional Reset Flag**: Should `SEED_CLEAR_EXISTING=true` truncate tables before seeding? (FR-011)
2. **Configurable Volumes**: Implement `SEED_VOLUME=small|medium|large` or hardcode to 10-50? (FR-014)
3. **Fake Data Locale**: Use `en_US` or support multiple locales?
4. **Document File Storage**: Seed document *metadata* only, or generate dummy files?
5. **Historical Timestamps**: Create entities with varied `created_at` to simulate history? (User Story 5)

## Conclusion

The existing Rust GraphQL backend provides a solid foundation for implementing comprehensive seed data:

- **SeaORM 0.12** with full Active Model support
- **Existing audit logging system** ready for integration
- **Well-structured migrations** defining all database tables
- **Clear project organization** with services, models, and utilities

**Recommended Path Forward**:
1. Create separate `seed-data` binary
2. Implement builder pattern for each entity type
3. Use SeaORM Active Model API for all insertions
4. Integrate with existing activity_log system
5. Execute automatically on container startup when enabled
6. Target 10-50 records per entity type for optimal testing

**Estimated Effort**: 40-60 developer hours across 15-20 atomic tasks
