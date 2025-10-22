# Contract: Seed Data Binary

**Component**: `seed-data` binary
**Type**: Executable
**Language**: Rust

## Purpose

Standalone binary that populates the database with comprehensive development seed data across all HR application entities, integrating with the existing SeaORM models and activity logging system.

## Command-Line Interface

### Invocation

```bash
./seed-data [OPTIONS]
```

### Environment Variables (Required)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DATABASE_URL` | String | - | PostgreSQL connection string (required) |
| `ENABLE_SEED_DATA` | Boolean | false | Explicit enable flag |
| `ENVIRONMENT` | String | - | Alternative enable via "development" value |

**Safety Check**: Binary MUST exit with error code 1 if neither `ENABLE_SEED_DATA=true` NOR `ENVIRONMENT=development`.

### Environment Variables (Optional)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `SEED_VOLUME_TARGET` | Enum | "small" | Volume target: "small" (10-50), "medium" (50-200), "large" (200-1000) |
| `SEED_CLEAR_EXISTING` | Boolean | false | Truncate tables before seeding |
| `SEED_ENABLE_AUDIT` | Boolean | true | Create audit log entries |
| `SEED_USER_COUNT` | Integer | 50 | Specific user count override |
| `SEED_DEPARTMENT_COUNT` | Integer | 10 | Specific department count override |

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success - all entities seeded successfully |
| 1 | Safety check failed (production environment detected) |
| 2 | Database connection failed |
| 3 | Partial failure - some entities failed (see logs) |
| 4 | Critical failure - seed process could not complete |

## Output Format

### Console Output (stdout)

**During Execution**:
```
[INFO] Seed data binary starting...
[INFO] Environment check passed: ENABLE_SEED_DATA=true
[INFO] Database connected: postgresql://localhost/hr_dev
[INFO] Seed batch ID: 550e8400-e29b-41d4-a716-446655440000
[INFO] Seeding roles... (target: 4)
[INFO]   Created 4 roles
[INFO] Seeding permissions... (target: 30)
[INFO]   Created 30 permissions
[INFO] Seeding departments... (target: 10)
[INFO]   Created 10 departments
[INFO] Seeding users... (target: 50)
[INFO]   Created 45 users, skipped 5 (already exist)
[INFO] Seeding leave requests... (target: 35)
[WARN]   Created 30 leave requests, failed 5 (foreign key errors)
...
```

**On Completion**:
```
[INFO] ============================================
[INFO] Seed Data Execution Summary
[INFO] ============================================
[INFO] Batch ID: 550e8400-e29b-41d4-a716-446655440000
[INFO] Execution time: 18.5s
[INFO] Total records created: 2,145
[INFO] Total records skipped: 155 (already existed)
[INFO] Total records failed: 0
[INFO]
[INFO] Entity Breakdown:
[INFO]   roles: 4 created, 0 skipped, 0 failed
[INFO]   permissions: 30 created, 0 skipped, 0 failed
[INFO]   departments: 10 created, 0 skipped, 0 failed
[INFO]   users: 45 created, 5 skipped, 0 failed
[INFO]   leave_requests: 30 created, 0 skipped, 5 failed
[INFO]   ...
[INFO] ============================================
[INFO] Seed data execution completed successfully
```

### Error Output (stderr)

**Safety Check Failure**:
```
[ERROR] Seed data execution blocked: production environment detected
[ERROR] Neither ENABLE_SEED_DATA=true nor ENVIRONMENT=development is set
[ERROR] This is a safety measure to prevent accidental production seeding
[ERROR] To seed data, set one of these environment variables
```

**Database Connection Failure**:
```
[ERROR] Failed to connect to database
[ERROR] DATABASE_URL: postgresql://localhost/hr_dev
[ERROR] Error: Connection refused (os error 111)
```

**Partial Failure**:
```
[WARN] Entity seeding failed: leave_requests
[WARN]   Failed records: 5
[WARN]   Error: Foreign key constraint violation on user_id
[WARN]   Affected IDs: [uuid1, uuid2, uuid3, uuid4, uuid5]
```

## Behavior Specification

### 1. Environment Safety Check

**Requirement**: FR-015

**Before ANY database operations**:
```rust
fn check_environment_safety() -> Result<(), SeedError> {
    let enable_seed = env::var("ENABLE_SEED_DATA")
        .map(|v| v.to_lowercase() == "true")
        .unwrap_or(false);

    let is_development = env::var("ENVIRONMENT")
        .or_else(|_| env::var("NODE_ENV"))
        .map(|v| v.to_lowercase() == "development")
        .unwrap_or(false);

    if !enable_seed && !is_development {
        return Err(SeedError::ProductionSafetyBlock);
    }

    Ok(())
}
```

**Error Message**: "Seed data execution blocked: production environment detected"

### 2. Database Connection

**Requirement**: FR-001, FR-004

```rust
async fn main() -> Result<()> {
    // Safety check first
    check_environment_safety()?;

    // Load config
    let config = SeedConfig::from_env();

    // Connect to database
    let database_url = env::var("DATABASE_URL")
        .map_err(|_| SeedError::MissingDatabaseUrl)?;

    let db = Database::connect(&database_url)
        .await
        .map_err(|e| SeedError::DatabaseConnection(e))?;

    // Verify connection
    db.ping().await?;

    // Continue with seeding...
}
```

### 3. Seed Context Initialization

**Requirement**: FR-013

```rust
async fn initialize_seed_context(db: &DatabaseConnection) -> Result<SeedContext> {
    // Find or create system user
    let system_user = User::find()
        .filter(user::Column::Email.eq("system@mountainhr.dev"))
        .one(db)
        .await?
        .ok_or(SeedError::SystemUserNotFound)?;

    // Generate batch ID
    let batch_id = Uuid::new_v4();

    Ok(SeedContext {
        system_user_id: system_user.id,
        batch_id,
        started_at: Utc::now(),
        config: SeedConfig::from_env(),
    })
}
```

### 4. Idempotent Seeding

**Requirement**: FR-007

**Pattern for all entity types**:
```rust
async fn seed_users(
    db: &DatabaseConnection,
    context: &SeedContext,
    count: usize
) -> Result<EntitySeedResult> {
    let mut result = EntitySeedResult::new("users");

    for i in 1..=count {
        let email = format!("user{}@mountainhr.dev", i);

        // Check if exists (skip-existing strategy)
        match User::find()
            .filter(user::Column::Email.eq(&email))
            .one(db)
            .await?
        {
            Some(_) => {
                tracing::info!("Skipping existing user: {}", email);
                result.skipped_count += 1;
                continue;
            }
            None => {
                // Create new user via ActiveModel
                match create_user(db, context, &email).await {
                    Ok(user) => {
                        result.created_count += 1;
                        // Audit logging happens inside create_user
                    }
                    Err(e) => {
                        tracing::warn!("Failed to create user {}: {}", email, e);
                        result.failed_count += 1;
                        result.errors.push(format!("{}: {}", email, e));
                    }
                }
            }
        }
    }

    Ok(result)
}
```

### 5. Error Handling (Continue on Failure)

**Requirement**: FR-012

```rust
async fn execute_seeding(
    db: DatabaseConnection,
    context: SeedContext,
) -> SeedResult {
    let mut result = SeedResult::new(context.batch_id);

    // Seed each entity type, continuing on failures
    result.add(seed_roles(&db, &context).await.unwrap_or_else(|e| {
        EntitySeedResult::failed("roles", e)
    }));

    result.add(seed_permissions(&db, &context).await.unwrap_or_else(|e| {
        EntitySeedResult::failed("permissions", e)
    }));

    // ... continue for all entity types, never panic or abort

    result
}
```

### 6. Audit Logging Integration

**Requirement**: FR-003, FR-013

```rust
async fn log_seed_creation(
    db: &DatabaseConnection,
    context: &SeedContext,
    resource_type: &str,
    resource_id: Uuid,
) -> Result<()> {
    use crate::models::system::activity_log;

    let log = activity_log::ActiveModel {
        id: Set(Uuid::new_v4()),
        user_id: Set(context.system_user_id),
        employee_id: NotSet,
        action: Set("CREATE".to_string()),
        resource_type: Set(resource_type.to_string()),
        resource_id: Set(Some(resource_id)),
        details: Set(Some(json!({
            "source": "seed_data",
            "batch_id": context.batch_id
        }))),
        before_snapshot: NotSet,
        after_snapshot: NotSet,
        is_rollback: Set(false),
        rolled_back_log_id: NotSet,
        ip_address: Set(Some("127.0.0.1".to_string())),
        user_agent: Set(Some("seed-data-binary".to_string())),
        signature_id: NotSet,
        batch_id: Set(Some(context.batch_id)),
        created_at: Set(Utc::now()),
    };

    log.insert(db).await?;
    Ok(())
}
```

## Performance Requirements

**Requirement**: SC-004

- **Total Execution Time**: < 30 seconds on standard development hardware
- **Records Created**: ~2,300 total
- **Throughput Target**: > 75 records/second
- **Database Connections**: Single connection reused throughout execution
- **Memory Usage**: < 500MB peak

## Contract Tests

### Test 1: Safety Check Enforcement

```rust
#[tokio::test]
async fn test_blocks_without_environment_flags() {
    env::remove_var("ENABLE_SEED_DATA");
    env::remove_var("ENVIRONMENT");

    let result = check_environment_safety();

    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), SeedError::ProductionSafetyBlock);
}

#[tokio::test]
async fn test_allows_with_enable_flag() {
    env::set_var("ENABLE_SEED_DATA", "true");

    let result = check_environment_safety();

    assert!(result.is_ok());
}

#[tokio::test]
async fn test_allows_with_development_environment() {
    env::set_var("ENVIRONMENT", "development");

    let result = check_environment_safety();

    assert!(result.is_ok());
}
```

### Test 2: Idempotency

```rust
#[tokio::test]
async fn test_idempotent_execution() {
    let db = setup_test_database().await;
    let context = SeedContext::test_context();

    // First run
    let result1 = seed_users(&db, &context, 10).await.unwrap();
    assert_eq!(result1.created_count, 10);
    assert_eq!(result1.skipped_count, 0);

    // Second run - should skip all existing
    let result2 = seed_users(&db, &context, 10).await.unwrap();
    assert_eq!(result2.created_count, 0);
    assert_eq!(result2.skipped_count, 10);

    // Third run with higher count - should create 5 more
    let result3 = seed_users(&db, &context, 15).await.unwrap();
    assert_eq!(result3.created_count, 5);
    assert_eq!(result3.skipped_count, 10);
}
```

### Test 3: Audit Logging Integration

```rust
#[tokio::test]
async fn test_creates_audit_logs() {
    let db = setup_test_database().await;
    let context = SeedContext::test_context();

    // Seed users
    let user_result = seed_users(&db, &context, 5).await.unwrap();
    assert_eq!(user_result.created_count, 5);

    // Verify audit logs created
    let audit_logs = ActivityLog::find()
        .filter(activity_log::Column::BatchId.eq(context.batch_id))
        .filter(activity_log::Column::ResourceType.eq("users"))
        .all(&db)
        .await
        .unwrap();

    assert_eq!(audit_logs.len(), 5);

    // Verify audit log details
    for log in audit_logs {
        assert_eq!(log.action, "CREATE");
        assert_eq!(log.user_id, context.system_user_id);
        assert_eq!(log.ip_address, Some("127.0.0.1".to_string()));
        assert_eq!(log.user_agent, Some("seed-data-binary".to_string()));

        let details: serde_json::Value = log.details.unwrap();
        assert_eq!(details["source"], "seed_data");
        assert_eq!(details["batch_id"], context.batch_id.to_string());
    }
}
```

### Test 4: Dependency Ordering

```rust
#[tokio::test]
async fn test_dependency_ordering() {
    let db = setup_test_database().await;
    let context = SeedContext::test_context();

    // Attempt to seed users before departments (should fail or skip)
    let user_result = seed_users(&db, &context, 5).await.unwrap();

    // Verify users were created without department assignments
    let users = User::find().all(&db).await.unwrap();
    for user in users {
        assert!(user.department_id.is_none());
    }

    // Now seed departments
    seed_departments(&db, &context, 3).await.unwrap();

    // Re-seed users should skip existing and not assign departments retroactively
    let user_result2 = seed_users(&db, &context, 5).await.unwrap();
    assert_eq!(user_result2.skipped_count, 5);
}
```

### Test 5: Execution Time

```rust
#[tokio::test]
async fn test_execution_time_under_30_seconds() {
    let db = setup_test_database().await;
    let context = SeedContext::test_context();
    let config = SeedConfig::default(); // Small volume (10-50 per entity)

    let start = Instant::now();

    let result = execute_full_seeding(&db, context, config).await.unwrap();

    let duration = start.elapsed();

    assert!(duration < Duration::from_secs(30),
            "Seed execution took {:?}, expected < 30s", duration);
    assert!(result.total_created > 2000,
            "Created {} records, expected > 2000", result.total_created);
}
```

## Dependencies

**Internal**:
- `hr_graphql_server::database::create_db_connection`
- `hr_graphql_server::models::*` (all SeaORM entities)
- `hr_graphql_server::models::system::activity_log`

**External**:
- `sea-orm` 0.12.x
- `tokio` 1.x (async runtime)
- `uuid` 1.x
- `chrono` 0.4.x
- `serde_json` 1.x
- `tracing` 0.1.x
- `fake` 2.9.x (data generation)
- `rand` 0.8.x (randomization)

## Integration Points

### 1. Container Startup Script

```bash
#!/bin/bash
set -e

# Run database migrations
echo "Running database migrations..."
./migration run

# Check if seed data should be run
if [ "$ENABLE_SEED_DATA" = "true" ] || [ "$ENVIRONMENT" = "development" ]; then
    echo "Running seed data generation..."
    ./seed-data

    if [ $? -ne 0 ]; then
        echo "Warning: Seed data generation failed, but continuing..."
    fi
fi

# Start main GraphQL server
echo "Starting GraphQL server..."
exec ./hr-graphql-server
```

### 2. Docker Compose Configuration

```yaml
services:
  graphql-server:
    build: ./graphql-rust-server
    environment:
      DATABASE_URL: postgresql://postgres:password@db:5432/hr_dev
      ENABLE_SEED_DATA: "true"  # Enable for development
      SEED_VOLUME_TARGET: "small"
    depends_on:
      db:
        condition: service_healthy
```

## Success Criteria Mapping

| Success Criterion | Contract Verification |
|-------------------|----------------------|
| SC-001: < 2min startup | Binary completes in < 30s, total startup < 2min |
| SC-002: 10-50 records/entity | Default config targets confirmed |
| SC-003: 100% audit logging | Test 3 verifies audit log creation |
| SC-004: < 30s execution | Test 5 enforces time constraint |
| SC-005: Reset via restart | Idempotency allows clean restart |
| SC-006: Distinguishable logs | batch_id + "seed_data" source tag |
| SC-007: Zero FK violations | Test 4 verifies dependency ordering |
| SC-008: No "no data" scenarios | All entity types seeded |
| SC-009: Zero errors (fresh DB) | Test 1-5 verify error-free execution |
| SC-010: Idempotent | Test 2 verifies skip-existing behavior |

## Notes

- This binary is intended for **development and testing environments ONLY**
- It should NEVER be run in production (enforced by environment checks)
- All test data uses known passwords ("password123") for easy login
- Audit logs allow tracking of all seed data operations
- Idempotent design allows safe re-execution without duplicates
