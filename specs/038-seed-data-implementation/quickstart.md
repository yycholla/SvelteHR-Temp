# Quickstart: Seed Data Implementation

**Feature**: Comprehensive Development Seed Data with Audit Logging
**Branch**: `038-seed-data-implementation`
**Last Updated**: 2025-10-22

## For Developers: Using Seed Data

### Quick Start (5 minutes)

1. **Start development environment**:
   ```bash
   cd graphql-rust-server
   docker-compose up
   ```

2. **Verify seed data loaded**:
   ```bash
   # Check GraphQL playground
   open http://localhost:4000

   # Query users
   query {
     allUsers(first: 10) {
       nodes {
         id
         email
         firstName
         lastName
       }
     }
   }
   ```

3. **Login with test accounts**:
   ```bash
   # Admin user
   Email: admin@mountainhr.dev
   Password: admin123

   # Test users
   Email: user1@mountainhr.dev through user50@mountainhr.dev
   Password: password123
   ```

### Environment Variables

**Required**:
```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/hr_dev
ENABLE_SEED_DATA=true  # Or ENVIRONMENT=development
```

**Optional**:
```bash
SEED_VOLUME_TARGET=small          # small | medium | large (default: small)
SEED_CLEAR_EXISTING=false         # Truncate before seeding (default: false)
SEED_ENABLE_AUDIT=true            # Create audit logs (default: true)
SEED_USER_COUNT=50                # Override user count
SEED_DEPARTMENT_COUNT=10          # Override department count
```

### Manual Execution

**Run seed data independently**:
```bash
cd graphql-rust-server
cargo build --release --bin seed-data
ENABLE_SEED_DATA=true DATABASE_URL="postgresql://..." ./target/release/seed-data
```

**Check execution results**:
```
[INFO] ============================================
[INFO] Seed Data Execution Summary
[INFO] ============================================
[INFO] Batch ID: 550e8400-e29b-41d4-a716-446655440000
[INFO] Execution time: 18.5s
[INFO] Total records created: 2,145
[INFO] Total records skipped: 155
[INFO] Total records failed: 0
```

### Resetting Data

**Option 1: Re-run seed (idempotent)**:
```bash
# Safe - skips existing records
ENABLE_SEED_DATA=true ./target/release/seed-data
```

**Option 2: Clear and re-seed**:
```bash
# Warning: Deletes existing data!
ENABLE_SEED_DATA=true SEED_CLEAR_EXISTING=true ./target/release/seed-data
```

**Option 3: Fresh database**:
```bash
# Drop and recreate database
dropdb hr_dev
createdb hr_dev
./migration run
ENABLE_SEED_DATA=true ./target/release/seed-data
```

### Querying Seed Data

**View audit logs for seed operations**:
```graphql
query SeedDataAuditLogs {
  allActivityLogs(
    condition: { userAgent: "seed-data-binary" }
    first: 100
  ) {
    nodes {
      id
      action
      resourceType
      resourceId
      batchId
      createdAt
      details
    }
  }
}
```

**Find test users by email pattern**:
```graphql
query TestUsers {
  allUsers(
    filter: { email: { like: "user%@mountainhr.dev" } }
    orderBy: EMAIL_ASC
  ) {
    nodes {
      id
      email
      firstName
      lastName
      department {
        name
      }
      userRoleAssignments {
        role {
          name
        }
      }
    }
  }
}
```

## For Implementers: Development Guide

### Phase 1: Project Setup (Day 1)

**1. Add binary target to Cargo.toml**:
```toml
[[bin]]
name = "seed-data"
path = "src/bin/seed_data.rs"
```

**2. Add dependencies**:
```toml
[dependencies]
fake = { version = "2.9", features = ["derive", "chrono", "uuid"] }
# rand already present as optional dependency
```

**3. Create module structure**:
```bash
mkdir -p src/seed_data/builders
touch src/seed_data/mod.rs
touch src/seed_data/config.rs
touch src/seed_data/context.rs
touch src/seed_data/audit.rs
touch src/seed_data/dependencies.rs
touch src/bin/seed_data.rs
```

**4. Update src/lib.rs**:
```rust
pub mod seed_data;
```

### Phase 2: Core Implementation (Days 2-3)

**Priority Order**:
1. Environment safety check (FR-015)
2. SeedConfig and SeedContext structs
3. Audit logging helper
4. Foundation entity builders (roles, permissions, leave types)
5. Core entity builders (departments, users)
6. Extended entity builders
7. Operational entity builders

**Start with roles (simplest)**:
```rust
// src/seed_data/builders/role_builder.rs
pub async fn seed_roles(
    db: &DatabaseConnection,
    context: &SeedContext,
) -> Result<EntitySeedResult> {
    let roles = vec![
        ("Admin", "Full system access", 100),
        ("HR Manager", "HR management access", 75),
        ("Manager", "Team management access", 50),
        ("Employee", "Basic employee access", 25),
    ];

    let mut result = EntitySeedResult::new("roles");

    for (name, description, level) in roles {
        // Check exists
        if Role::find()
            .filter(role::Column::Name.eq(name))
            .one(db)
            .await?
            .is_some()
        {
            result.skipped_count += 1;
            continue;
        }

        // Create
        let role = role::ActiveModel {
            id: Set(Uuid::new_v4()),
            name: Set(name.to_string()),
            description: Set(description.to_string()),
            level: Set(level),
        };

        let created = role.insert(db).await?;
        result.created_count += 1;

        // Audit log
        log_seed_creation(db, context, "roles", created.id).await?;
    }

    Ok(result)
}
```

### Phase 3: Testing (Days 4-5)

**Unit Tests**:
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_seed_roles_idempotent() {
        let db = setup_test_db().await;
        let context = SeedContext::test_context();

        // First run
        let result1 = seed_roles(&db, &context).await.unwrap();
        assert_eq!(result1.created_count, 4);

        // Second run
        let result2 = seed_roles(&db, &context).await.unwrap();
        assert_eq!(result2.skipped_count, 4);
    }
}
```

**Integration Tests**:
```rust
// tests/contract/test_seed_data.rs
#[tokio::test]
async fn test_full_seed_execution() {
    let db = setup_test_db().await;

    // Set environment
    env::set_var("ENABLE_SEED_DATA", "true");
    env::set_var("DATABASE_URL", test_db_url());

    // Execute binary (via library interface)
    let result = execute_seed_data().await.unwrap();

    assert!(result.total_created > 2000);
    assert_eq!(result.total_failed, 0);
}
```

### Phase 4: Container Integration (Day 6)

**Update Dockerfile**:
```dockerfile
# Build seed-data binary
FROM rust:1.75 as builder
WORKDIR /app
COPY . .
RUN cargo build --release --bin seed-data
RUN cargo build --release --bin hr-graphql-server
RUN cargo build --release --bin migration

# Runtime image
FROM debian:bookworm-slim
COPY --from=builder /app/target/release/seed-data /usr/local/bin/
COPY --from=builder /app/target/release/hr-graphql-server /usr/local/bin/
COPY --from=builder /app/target/release/migration /usr/local/bin/
COPY entrypoint.sh /usr/local/bin/
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
```

**Create entrypoint.sh**:
```bash
#!/bin/bash
set -e

echo "Running database migrations..."
migration run

if [ "$ENABLE_SEED_DATA" = "true" ] || [ "$ENVIRONMENT" = "development" ]; then
    echo "Running seed data generation..."
    seed-data || {
        echo "Warning: Seed data generation failed (exit code $?)"
        echo "Continuing with server startup..."
    }
fi

echo "Starting GraphQL server..."
exec hr-graphql-server
```

**Update docker-compose.yml**:
```yaml
services:
  graphql-server:
    build: ./graphql-rust-server
    environment:
      DATABASE_URL: postgresql://postgres:password@db:5432/hr_dev
      ENABLE_SEED_DATA: "true"
      SEED_VOLUME_TARGET: "small"
    ports:
      - "4000:4000"
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: hr_dev
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
```

## Architecture Decisions

### Why Separate Binary (Not Migration)?

**Chosen Approach**: Separate `seed-data` binary

**Alternatives Considered**:
1. ❌ Extend migration system with seed migration
2. ❌ GraphQL mutations for seeding
3. ❌ External script (Python/Node)

**Rationale**:
- Migrations = schema changes (SeaORM best practice)
- Separate binary allows full SeaORM Active Model API
- Can trigger audit logging naturally
- Easier environment control
- More flexible execution timing

### Why Skip-Existing (Not Truncate)?

**Chosen Approach**: Skip existing records by checking unique identifiers

**Alternatives Considered**:
1. ❌ Truncate all tables before seeding
2. ❌ Upsert (update existing)
3. ❌ Manual cleanup required

**Rationale**:
- Preserves manual developer changes
- Safe for repeated execution
- No data loss risk
- Optional truncate via SEED_CLEAR_EXISTING flag

### Why Small Volume Default (10-50)?

**Chosen Approach**: Default to 10-50 records per entity

**Alternatives Considered**:
1. ❌ Large volume (1000+) by default
2. ❌ Minimal (1-5) records
3. ❌ No default (require configuration)

**Rationale**:
- Balances realism with startup time (<30s)
- Sufficient for pagination testing
- Doesn't overwhelm frontend
- Can scale up via SEED_VOLUME_TARGET

## Troubleshooting

### Seed Data Not Running

**Symptom**: Container starts but no seed data appears

**Diagnosis**:
```bash
# Check environment variables
docker-compose exec graphql-server env | grep SEED

# Check binary exists
docker-compose exec graphql-server ls -la /usr/local/bin/seed-data

# Check logs
docker-compose logs graphql-server | grep seed
```

**Solutions**:
- Verify `ENABLE_SEED_DATA=true` in docker-compose.yml
- Rebuild container: `docker-compose build --no-cache`
- Check entrypoint.sh has execute permissions

### Foreign Key Constraint Violations

**Symptom**: Seed execution reports failed records

**Example Error**:
```
[WARN] Entity seeding failed: leave_requests
[WARN]   Failed records: 5
[WARN]   Error: Foreign key constraint violation on user_id
```

**Diagnosis**:
- Check dependency ordering in seed execution
- Verify parent entities exist before child creation

**Solution**:
- Ensure seeding order follows dependency graph (see data-model.md)
- Check users exist before creating leave requests
- Verify departments exist before assigning users

### Performance: >30s Execution Time

**Symptom**: Seed execution exceeds 30-second target

**Diagnosis**:
```bash
# Time execution
time ENABLE_SEED_DATA=true ./seed-data

# Check target counts
env | grep SEED_.*_COUNT
```

**Solutions**:
- Reduce volume: `SEED_VOLUME_TARGET=small`
- Disable audit logging temporarily: `SEED_ENABLE_AUDIT=false`
- Check database connection pooling
- Verify database indexes exist

### Duplicate Key Violations

**Symptom**: Unique constraint errors on re-run

**Example Error**:
```
[ERROR] Duplicate key violation: users(email)
[ERROR] Key (email)=(user5@mountainhr.dev) already exists
```

**Diagnosis**:
- Idempotency check not working
- Concurrent execution detected

**Solution**:
- Verify `find().filter().one()` check before insert
- Use database-level `ON CONFLICT DO NOTHING` for critical entities
- Ensure single-threaded execution (no parallel seeding)

## Reference: Entity Counts

### Default Targets (SEED_VOLUME_TARGET=small)

| Entity | Count | Notes |
|--------|-------|-------|
| Roles | 4 | Fixed set |
| Permissions | 30 | Core permission set |
| RolePermissions | ~60 | Role-permission mappings |
| Departments | 10 | Org structure |
| Users | 50 | With roles and departments |
| UserRoleAssignments | 50+ | At least one per user |
| LeaveTypes | 5 | Common types |
| LeaveBalances | 250 | Users × leave types |
| LeaveRequests | 35 | Subset with requests |
| EmployeeSkills | 150 | ~3 per user |
| EmployeeCertifications | 25 | Sparse |
| EmergencyContacts | 75 | ~1.5 per user |
| UserAddresses | 50 | One per user |
| Events | 25 | Mixed types |
| EventAttendees | 150 | ~6 per event |
| Documents | 30 | Metadata only |
| ReviewCycles | 3 | Quarterly/annual |
| PerformanceReviews | 20 | Subset reviewed |
| Tasks | 50 | Mixed statuses |
| TaskAssignees | 75 | ~1.5 per task |
| TimeEntries | 125 | Past 2 weeks |
| ActivityLogs | ~1100 | One per created entity |

**Total**: ~2,300 records across all tables

## Next Steps

1. ✅ Review specification and data model
2. ⏭️ Implement Phase 1: Project setup
3. ⏭️ Implement Phase 2: Core builders
4. ⏭️ Implement Phase 3: Tests
5. ⏭️ Implement Phase 4: Container integration
6. ⏭️ Deploy to development environment
7. ⏭️ Verify all success criteria (SC-001 through SC-010)

## Additional Resources

- **Specification**: `specs/038-seed-data-implementation/spec.md`
- **Research**: `specs/038-seed-data-implementation/research.md`
- **Data Model**: `specs/038-seed-data-implementation/data-model.md`
- **Contract**: `specs/038-seed-data-implementation/contracts/seed-binary.md`
- **SeaORM Docs**: https://www.sea-ql.org/SeaORM/docs/
- **fake-rs Docs**: https://docs.rs/fake/latest/fake/
