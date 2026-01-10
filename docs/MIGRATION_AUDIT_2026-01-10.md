# Migration Audit Report - 2026-01-10

## Summary

**Total Migrations**: 70+
**Critical Issues Found**: 29
**Severity**: High (Production database inconsistency)

## Issues Found

### 1. Non-Idempotent ADD COLUMN Statements (21 occurrences)

**Impact**: If a migration partially fails, re-running causes "column already exists" errors and prevents completing the migration.

**Files Affected**:
- `m20251222_003_fix_display_name_add_preferred_name.rs` (2 columns)
- `m20251226_001_add_sync_tracking.rs` (**CRITICAL** - caused production failure) (9 columns)
- `m20251226_002_enhance_sync_log.rs` (10 columns)

**Common Pattern**:
```rust
// ❌ NOT IDEMPOTENT
manager.get_connection().execute_unprepared(
    "ALTER TABLE hr_public.users
    ADD COLUMN employee_number VARCHAR(50),
    ADD COLUMN last_synced_at TIMESTAMPTZ"
).await?;

// ✅ IDEMPOTENT
manager.get_connection().execute_unprepared(
    "ALTER TABLE hr_public.users
    ADD COLUMN IF NOT EXISTS employee_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ"
).await?;
```

### 2. Non-Idempotent CREATE INDEX Statements (8 occurrences)

**Files Affected**:
- `m20251226_001_add_sync_tracking.rs` (6 indexes)
- `m20251017_004_hr_core.rs` (2 indexes - partial/conditional indexes)

**Common Pattern**:
```rust
// ❌ NOT IDEMPOTENT
"CREATE INDEX idx_users_sync_status ON hr_public.users (sync_status)"

// ✅ IDEMPOTENT
"CREATE INDEX IF NOT EXISTS idx_users_sync_status ON hr_public.users (sync_status)"
```

### 3. Poor Error Handling (70+ migrations)

**Impact**: Errors are propagated immediately with `?`, causing partial migrations to be marked as "complete" even when they fail midway.

**Pattern**:
```rust
// ❌ POOR ERROR HANDLING - marks migration as complete even on partial failure
manager.get_connection().execute_unprepared(sql).await?;

// ✅ BETTER ERROR HANDLING - graceful handling of idempotent operations
match manager.get_connection().execute_unprepared(sql).await {
    Ok(_) => Ok(()),
    Err(e) if e.to_string().contains("already exists") => {
        println!("Column already exists, skipping");
        Ok(())
    }
    Err(e) => Err(e)
}
```

## Root Cause Analysis

### m20251226_001_add_sync_tracking.rs Failure

**What Happened**:
1. Migration attempted to add `employee_number` column
2. Column already existed from `m20251222_002_add_quickbooks_employee_fields.rs`
3. PostgreSQL error: `column "employee_number" already exists`
4. **PostgreSQL stopped executing the rest of the ALTER TABLE statement**
5. Columns never added: `last_synced_at`, `last_modified_at`, `quickbooks_sync_token`, `sync_status`
6. Migration marked as "complete" in migrations table
7. Application code expected columns that didn't exist
8. Production login failures: `column users.last_synced_at does not exist`

**Manual Fix Required**:
```sql
ALTER TABLE hr_public.users ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE hr_public.users ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;
ALTER TABLE hr_public.users ADD COLUMN IF NOT EXISTS quickbooks_sync_token VARCHAR(255);
ALTER TABLE hr_public.users ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'pending' NOT NULL;
```

## Recommended Fixes

### Immediate (Critical)

1. ✅ **Manual schema fix applied** - Production database repaired
2. **Fix m20251226_001_add_sync_tracking.rs** - Remove duplicate column, add IF NOT EXISTS
3. **Add migration helpers module** - Standardize error handling

### Short Term

4. **Audit and fix all 21 ADD COLUMN statements** - Add IF NOT EXISTS
5. **Audit and fix all 8 CREATE INDEX statements** - Add IF NOT EXISTS
6. **Test all migrations** - Run against empty DB, verify idempotency

### Long Term

7. **Migration validation CI check** - Automatically detect non-idempotent migrations
8. **Migration template** - Standard template with helpers
9. **Documentation** - Best practices in CONTRIBUTING.md
10. **Transaction wrapping** - Wrap multi-statement migrations in transactions where possible

## Migration Best Practices (Going Forward)

### 1. Always Use IF NOT EXISTS / IF EXISTS

```rust
// Tables
CREATE TABLE IF NOT EXISTS ...

// Columns
ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...

// Indexes
CREATE INDEX IF NOT EXISTS ...

// Drops
DROP TABLE IF EXISTS ...
DROP INDEX IF EXISTS ...
```

### 2. Use Migration Helpers

```rust
use crate::migration_helpers::MigrationHelpers;

// Instead of direct SQL
MigrationHelpers::add_column_if_not_exists(
    manager,
    "hr_public.users",
    "employee_number VARCHAR(50)"
).await?;

MigrationHelpers::create_index_if_not_exists(
    manager,
    "idx_users_employee_number",
    "hr_public.users",
    "employee_number"
).await?;
```

### 3. Test Idempotency

Every migration should be runnable multiple times safely:

```bash
# Run migration
cargo run --bin migration up

# Run again - should be no-op
cargo run --bin migration up

# Both should succeed
```

### 4. Avoid Column Duplication

Check previous migrations before adding columns:
```bash
rg "ADD COLUMN employee_number" graphql-rust-server/migration/
```

### 5. Split Complex Migrations

If a migration has many steps, consider splitting into multiple migrations for easier rollback:

```rust
// Instead of one huge migration with 20 columns
// Split into logical groups:
// - m20251226_001_add_sync_base_fields.rs
// - m20251226_002_add_sync_indexes.rs
// - m20251226_003_add_sync_metadata.rs
```

## Testing Plan

1. **Create test database**
2. **Run all migrations from scratch**
3. **Run all migrations again (test idempotency)**
4. **Verify schema matches production**
5. **Run application tests**

## Files to Fix

### Priority 1 (Broke Production)
- [ ] `graphql-rust-server/migration/m20251226_001_add_sync_tracking.rs`

### Priority 2 (Same Pattern, High Risk)
- [ ] `graphql-rust-server/migration/m20251226_002_enhance_sync_log.rs`
- [ ] `graphql-rust-server/migration/m20251222_003_fix_display_name_add_preferred_name.rs`

### Priority 3 (All Others)
- [ ] All migrations with non-idempotent CREATE INDEX
- [ ] All migrations with direct `.await?` error handling

## Conclusion

The migration system needs systematic improvements to prevent production incidents. The immediate fix has been applied, but architectural changes are needed to prevent recurrence.

**Estimated Effort**:
- Fix critical migrations: 2-4 hours
- Complete audit and fixes: 1-2 days
- CI validation: 1 day
- Documentation: 2-3 hours

**Risk if Not Fixed**:
- Future partial migration failures
- Production database inconsistencies
- Difficult debugging and manual repairs
