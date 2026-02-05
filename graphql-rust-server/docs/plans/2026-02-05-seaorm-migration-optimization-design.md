# SeaORM Migration Optimization Design

**Date:** 2026-02-05
**Status:** Proposed
**Author:** System Design

## Table of Contents

1. [Overview & Goals](#overview--goals)
2. [Current State Analysis](#current-state-analysis)
3. [Technical Approach & Patterns](#technical-approach--patterns)
4. [Implementation Strategy](#implementation-strategy)
5. [Migration Squashing Strategy](#migration-squashing-strategy)
6. [DRY Migration Registration](#dry-migration-registration)
7. [Testing & Validation Strategy](#testing--validation-strategy)
8. [Implementation Timeline & Phases](#implementation-timeline--phases)
9. [Risks & Mitigation](#risks--mitigation)
10. [Success Metrics](#success-metrics)
11. [Future Improvements](#future-improvements)

---

## Overview & Goals

### Problem Statement

Currently, 10 of 77 migrations use raw SQL (`execute_unprepared()` or `Statement::from_string()`) instead of SeaORM's type-safe migration builder API. Additionally, migration registration is duplicated across `lib.rs` and `main.rs`, creating ~185 lines of duplicate code.

**Issues:**

- Reduced compile-time safety (SQL errors only caught at runtime)
- Harder maintenance (no IDE refactoring support)
- Inconsistent patterns across the migration codebase
- Difficulty understanding what each migration does without reading raw SQL
- Migration registration requires updates in 3 places, causing sync errors

### Goals (in priority order)

1. **Type Safety** - Leverage Rust's type system to catch migration errors at compile time
2. **Maintainability** - Use SeaORM builders for consistent, readable patterns
3. **DRY Principle** - Eliminate duplicate migration registration code
4. **Idempotency** - Preserve existing `IF NOT EXISTS` patterns for safe re-runs
5. **Performance** - Ensure migrations run efficiently (no performance regression)

### Success Criteria

- Reduce raw SQL migrations from 10 to ≤2 (80% reduction)
- Eliminate ~185 lines of duplicate code between lib.rs and main.rs
- (Optional) Reduce total migrations from 77 to ~70 via squashing
- All converted migrations compile and pass existing database tests
- Migration runtime remains ≤5% of current baseline
- Documentation clearly explains when raw SQL is acceptable

### Out of Scope

- Changing migration behavior or database schema
- Adding new migrations
- Auto-generating migrations from entity models
- Production database migrations (pre-production optimization only)

---

## Current State Analysis

### Migration Inventory

- **Total migrations:** 77
- **Using raw SQL:** 10 migrations
- **Using SeaORM builders:** 67 migrations
- **Duplicate lines:** ~185 lines between lib.rs and main.rs

### Raw SQL Migration Categories

| Category                        | Count | Convertible?         | Examples                                             |
| ------------------------------- | ----- | -------------------- | ---------------------------------------------------- |
| Partial indexes (WHERE clauses) | 1     | ✅ Yes               | `m20251118_002` - unique email for non-deleted users |
| Advanced index types (GIN)      | 1     | ✅ Yes (with Custom) | `m20260205_001` - GIN index on ancestor_ids array    |
| Schema/Extension setup          | 1     | ❌ No                | `m20251017_001` - CREATE SCHEMA, CREATE EXTENSION    |
| Complex data migrations         | 1     | 🤔 Maybe             | `m20260205_001` - Recursive CTE for backfill         |
| Simple operations               | 6     | ✅ Yes               | Various - could use builders                         |

### Conversion Priorities

**High Priority (Must Convert):**

1. `m20251118_002` - Partial unique index (perfect builder use case)
2. `m20260205_001` - GIN index creation (use `IndexType::Custom`)
3. `m20251217_002`, `m20251203_001`, `m20251217_001` - Simple table/index operations

**Medium Priority (Should Convert):** 4. `m20251020_004`, `m20251202_006` - Table alterations with indexes

**Low Priority (Keep Raw SQL):** 5. `m20251017_001` - Schema/extension setup (no SeaORM equivalent) 6. `m20260205_001` - Recursive CTE backfill (complex SQL, keep as-is)

### Code Duplication Analysis

**Current Duplication in lib.rs and main.rs:**

- 77 `mod` declarations duplicated
- 77 `Box::new()` lines duplicated
- Migration helpers duplicated
- **Total waste:** ~154 duplicate lines

**Every new migration requires updates in 3 places:**

1. `mod m20260xxx` in lib.rs
2. `mod m20260xxx` in main.rs
3. `Box::new(m20260xxx::Migration)` in both vec![] lists

---

## Technical Approach & Patterns

### SeaORM Research Findings

**✅ CONFIRMED - These CAN be done with SeaORM builders:**

1. **Partial/Conditional Indexes**
   - Sea-query supports `.and_where()` and `.cond_where()` methods
   - Reference: [PR #478](https://github.com/SeaQL/sea-query/pull/478)
   - Example: `Index::create().and_where(Expr::col(User::DeletedAt).is_null())`

2. **Basic Index Types**
   - BTree, Hash, FullText are built-in
   - Reference: [IndexType docs](https://docs.rs/sea-query/latest/sea_query/index/enum.IndexType.html)
   - Usage: `.index_type(IndexType::BTree)`

3. **If Not Exists**
   - `.if_not_exists()` is supported
   - Reference: [IndexCreateStatement docs](https://docs.rs/sea-query/latest/sea_query/index/struct.IndexCreateStatement.html)

**⚠️ REQUIRES WORKAROUNDS:**

1. **GIN Indexes** (for arrays, JSONB)
   - Use `IndexType::Custom(DynIden)`
   - Example: `.index_type(IndexType::Custom(Alias::new("GIN")))`

2. **PostgreSQL Extensions**
   - Still need raw SQL: `CREATE EXTENSION IF NOT EXISTS pgcrypto`

3. **Schema Creation**
   - Still need raw SQL: `CREATE SCHEMA IF NOT EXISTS hr_public`

### Conversion Patterns

#### Pattern 1: Partial Indexes (WHERE clauses)

**Before (Raw SQL):**

```rust
manager.get_connection().execute_unprepared(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique_when_active
     ON hr_public.users(email)
     WHERE deleted_at IS NULL"
).await?;
```

**After (SeaORM Builder):**

```rust
manager
    .create_index(
        Index::create()
            .if_not_exists()
            .name("idx_users_email_unique_when_active")
            .table((Schema::HrPublic, User::Table))
            .col(User::Email)
            .unique()
            .and_where(Expr::col(User::DeletedAt).is_null())
            .to_owned(),
    )
    .await?;
```

#### Pattern 2: GIN Indexes (Custom IndexType)

**Before (Raw SQL):**

```rust
db.execute(Statement::from_string(
    manager.get_database_backend(),
    "CREATE INDEX IF NOT EXISTS idx_departments_ancestor_ids
     ON hr_public.departments USING GIN (ancestor_ids)".to_string(),
)).await?;
```

**After (SeaORM Builder):**

```rust
manager
    .create_index(
        Index::create()
            .if_not_exists()
            .name("idx_departments_ancestor_ids")
            .table((Schema::HrPublic, Departments::Table))
            .col(Departments::AncestorIds)
            .index_type(IndexType::Custom(Alias::new("GIN")))
            .to_owned(),
    )
    .await?;
```

#### Pattern 3: Iden Enums for Type Safety

All conversions require defining Iden enums:

```rust
#[derive(Iden)]
enum Schema {
    HrPublic,
}

#[derive(Iden)]
enum User {
    Table,
    Email,
    DeletedAt,
}

#[derive(Iden)]
enum Departments {
    Table,
    AncestorIds,
}
```

---

## Implementation Strategy

### Migration Conversion Process

#### Step 1: Create Iden Enums

- Define table and column enums for each migration being converted
- Place in migration file itself (not shared across migrations for independence)
- Use PascalCase for enum variants matching table/column names

#### Step 2: Convert Index Operations

- Replace `execute_unprepared()` with `manager.create_index()`
- Use builder methods: `.if_not_exists()`, `.unique()`, `.and_where()`
- For GIN indexes: `IndexType::Custom(Alias::new("GIN"))`

#### Step 3: Convert Table Operations

- Use `Table::alter()`, `Table::drop()` builders
- Maintain `IF EXISTS` / `IF NOT EXISTS` semantics
- Keep column definitions type-safe with `ColumnDef`

#### Step 4: Preserve Down Migrations

- Convert down migrations using same patterns
- Ensure rollback operations match original behavior

### Conversion Order

**Phase 1 - Low Risk (3 migrations)**

- `m20251217_002` - Simple table drop
- `m20251203_001` - Table alterations
- `m20251217_001` - Inline form elements

**Phase 2 - Medium Risk (4 migrations)**

- `m20251118_002` - Partial unique index
- `m20260205_001` - GIN index creation
- `m20251020_004` - User addresses
- `m20251202_006` - Onboarding documents

**Phase 3 - Keep Raw SQL (2-3 migrations)**

- `m20251017_001` - Schema/extension setup
- `m20260205_001` - Recursive CTE backfill (data migration portion only)

### Validation Per Migration

1. Run `cargo check` - ensure compilation
2. Test up migration on clean database
3. Test down migration for rollback
4. Verify schema matches original SQL
5. Run full test suite

---

## Migration Squashing Strategy

**Opportunity:** Since production hasn't launched, we can simplify migration history by merging "fix" migrations into their originals and removing data cleanup migrations.

### Benefits

- Cleaner migration history (no "oops we forgot" migrations)
- Faster fresh database setup (fewer migrations to run)
- Easier onboarding (simpler history to understand)
- Reduced maintenance burden (fewer files to manage)

### Category 1: Data Cleanup Migrations (DELETE)

**Remove Entirely:**

```
✗ m20260120_001_clean_invalid_phone_numbers
✗ m20260120_002_clean_invalid_hire_dates
```

**Rationale:** These only fix bad seed data. With corrected seed generators (already fixed), they serve no purpose on fresh databases.

**Action:** Delete files and remove from `migration/lib.rs`

### Category 2: Schema Fix Migrations (MERGE)

**Merge into Original Migrations:**

| Fix Migration                               | Merge Into                    | What It Fixes                                    |
| ------------------------------------------- | ----------------------------- | ------------------------------------------------ |
| `m20251118_002_fix_email_unique_constraint` | `m20251017_004_hr_core`       | Changes email UNIQUE constraint to partial index |
| `m20251023_003_fix_encryption_keys`         | Original encryption migration | Adds algorithm, user_id columns                  |
| `m20251024_001_fix_document_assignments`    | `m20251017_007_documents`     | Fixes document_assignments schema                |
| `m20260107_001_fix_cron_constraint`         | Original cron migration       | Fixes constraint definition                      |
| `m20251222_003_fix_display_name`            | `m20251017_004_hr_core`       | Adds preferred_name column                       |

### Merge Process

1. **Identify the original migration** being fixed
2. **Apply the fix directly** to the original migration's `up()` method
3. **Update the down()** method to match
4. **Delete the fix migration** file
5. **Remove from lib.rs** registration

### Example - Email Unique Constraint

**Original m20251017_004_hr_core.rs:**

```rust
// OLD: Simple unique constraint
.col(ColumnDef::new(User::Email).string().unique_key().not_null())
```

**After Merging m20251118_002:**

```rust
// Create table without unique constraint
.col(ColumnDef::new(User::Email).string().not_null())

// Later in same migration - create partial unique index
manager
    .create_index(
        Index::create()
            .name("idx_users_email_unique_when_active")
            .table((Schema::HrPublic, User::Table))
            .col(User::Email)
            .unique()
            .and_where(Expr::col(User::DeletedAt).is_null())
            .to_owned(),
    )
    .await?;
```

### Category 3: Keep As-Is

**Do NOT Squash:**

- Feature additions (new tables, columns that aren't fixes)
- Migrations that add genuinely new functionality
- Recent migrations (< 1 month) until validated

### Squashing Safety Process

**Step 1: Create Backup Branch**

```bash
git checkout -b migration-squash-backup
git push origin migration-squash-backup
```

**Step 2: Test Current State**

```bash
# Fresh database with all 77 migrations
cargo run --bin migration fresh
cargo test
```

**Step 3: Perform Squashing**

- Merge fix migrations into originals
- Delete cleanup migration files
- Update `migration/lib.rs` to remove deleted migrations

**Step 4: Test Squashed State**

```bash
# Fresh database with ~65-70 migrations
cargo run --bin migration fresh
cargo test
# Verify schema matches Step 2 exactly
```

**Step 5: Schema Comparison**

```bash
# Dump schema from both versions, compare
pg_dump hr_system --schema-only > schema_before.sql
# (after squashing)
pg_dump hr_system --schema-only > schema_after.sql
diff schema_before.sql schema_after.sql
# Should be identical except migration tracking table
```

**Step 6: Update Migration Tracking**

Since SeaORM tracks applied migrations, you'll need to handle the removed migration names.

**Options:**

- **Option A:** Fresh start (recommended pre-prod): Just use new migration list
- **Option B:** Manual cleanup: Remove deleted migration entries from `seaql_migrations` table

### Estimated Impact

- **Before:** 77 migrations
- **Remove:** 2 data cleanup migrations
- **Merge:** 5 fix migrations into originals
- **After:** ~70 migrations (9% reduction)
- **Setup time:** ~5 seconds faster on fresh DB
- **Clarity:** Significantly improved migration history

---

## DRY Migration Registration

### Problem

lib.rs and main.rs contain ~154 lines of duplicated migration registration code. Adding a migration requires updating 3 locations, leading to sync errors.

**Root Cause:** SeaORM's design expects:

- **lib.rs** - Migration library with `Migrator` struct (used by application)
- **main.rs** - CLI binary entry point (used by `cargo run --bin migration`)

But both need the same migration list!

### Solution: Single Source of Truth

**Simplified main.rs:**

```rust
//! Migration CLI entry point

use migration::{Migrator, migration_validator::MigrationValidator};
use sea_orm_migration::prelude::*;
use std::env;

#[tokio::main]
async fn main() {
    let args: Vec<String> = env::args().collect();

    // Check if the first argument is "validate"
    if args.len() > 1 && args[1] == "validate" {
        println!("🔍 Validating migration files...\n");

        let validator = MigrationValidator::new("./migration");
        let report = validator.validate();

        report.print_report();

        if report.critical_count() > 0 || report.high_count() > 0 {
            std::process::exit(1);
        } else {
            std::process::exit(0);
        }
    }

    // Use Migrator from lib.rs
    cli::run_cli(Migrator).await;
}
```

**That's it!** Reduced from 210 lines to ~25 lines.

### Benefits

- ✅ Only define migrations once (in lib.rs)
- ✅ Impossible to get out of sync
- ✅ ~185 lines of code eliminated
- ✅ New migrations only need 2 additions (mod + vec entry in ONE file)

### Migration Steps

1. Update main.rs to import `Migrator` from lib
2. Remove all duplicate `mod` declarations from main.rs
3. Remove duplicate `MigrationHelpers` declaration
4. Test: `cargo run --bin migration status`

---

## Testing & Validation Strategy

### Level 1: Compile-Time Validation

**Step 1: Rust Compilation**

```bash
cargo check --bin migration
cargo clippy --bin migration -- -D warnings
```

**Pass Criteria:** Zero errors, zero warnings

**Step 2: Type Safety Verification**

- Iden enums correctly reference table/column names
- Index names match conventions
- No raw string literals for schema objects

### Level 2: Migration Execution Testing

**Step 1: Fresh Database Test**

```bash
# Drop and recreate database
dropdb hr_system && createdb hr_system

# Run all migrations
cargo run --bin migration fresh

# Verify success
cargo run --bin migration status
```

**Pass Criteria:** All migrations apply cleanly, status shows "Applied"

**Step 2: Rollback Test**

```bash
# Test down migration
cargo run --bin migration down

# Verify rollback worked
psql hr_system -c "\d hr_public.your_table"

# Re-apply
cargo run --bin migration up
```

**Pass Criteria:** Down/up cycle completes without errors

**Step 3: Idempotency Test**

```bash
# Run migration twice (should skip already-applied)
cargo run --bin migration fresh
cargo run --bin migration up

# Should see: "No pending migrations"
```

**Pass Criteria:** Second run is a no-op

### Level 3: Schema Validation

**Step 1: Schema Comparison**

Before conversion:

```bash
# Generate baseline schema
pg_dump hr_system --schema-only --schema=hr_public > schema_before.sql
```

After conversion:

```bash
# Generate new schema
cargo run --bin migration fresh
pg_dump hr_system --schema-only --schema=hr_public > schema_after.sql

# Compare
diff schema_before.sql schema_after.sql
```

**Pass Criteria:** Schemas are **identical** except:

- Migration tracking table (`seaql_migrations`)
- Comment formatting differences (acceptable)

**Step 2: Index Validation**

Verify indexes match exactly:

```sql
-- List all indexes on affected tables
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'hr_public'
ORDER BY tablename, indexname;
```

**Pass Criteria:**

- Index names match
- Index definitions match (column lists, WHERE clauses, types)
- Unique/non-unique attributes preserved

### Level 4: Integration Testing

**Step 1: Seed Data Test**

```bash
# Run migrations
cargo run --bin migration fresh

# Run seed data
cargo run --bin seed-data

# Verify data inserted correctly
psql hr_system -c "SELECT COUNT(*) FROM hr_public.users;"
```

**Pass Criteria:** Seed data completes without errors

**Step 2: Application Startup Test**

```bash
# Start GraphQL server
cargo run

# Verify server starts
curl http://localhost:4000/health
```

**Pass Criteria:** Server starts, health check passes

**Step 3: GraphQL Query Test**

```bash
# Test a query that uses the modified table/index
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ users { id email } }"}'
```

**Pass Criteria:** Query returns expected results

### Level 5: Performance Validation

**Step 1: Migration Timing**

```bash
# Time migration execution
time cargo run --bin migration fresh
```

**Pass Criteria:**

- Total time within 5% of baseline
- No individual migration >2x slower than before

**Step 2: Query Performance**

For migrations affecting indexes:

```sql
-- Test query using the index
EXPLAIN ANALYZE
SELECT * FROM hr_public.users
WHERE email = 'test@example.com'
  AND deleted_at IS NULL;
```

**Pass Criteria:**

- Query plan uses the index (Index Scan)
- Execution time similar to baseline
- No sequential scans on large tables

### Automated Validation Script

Create `scripts/validate-migration.sh`:

```bash
#!/bin/bash
set -e

MIGRATION_FILE=$1

echo "🔍 Validating migration: $MIGRATION_FILE"

# 1. Compile check
echo "✓ Checking compilation..."
cargo check --bin migration

# 2. Run migration validator
echo "✓ Running migration validator..."
cargo run --bin migration validate

# 3. Fresh database test
echo "✓ Testing fresh migration..."
dropdb hr_system_test 2>/dev/null || true
createdb hr_system_test
DATABASE_URL="postgresql://postgres@localhost/hr_system_test" \
  cargo run --bin migration fresh

# 4. Schema dump
echo "✓ Dumping schema..."
pg_dump hr_system_test --schema-only > /tmp/schema_new.sql

# 5. Rollback test
echo "✓ Testing rollback..."
DATABASE_URL="postgresql://postgres@localhost/hr_system_test" \
  cargo run --bin migration down

# 6. Cleanup
dropdb hr_system_test

echo "✅ All validation checks passed!"
```

**Usage:**

```bash
./scripts/validate-migration.sh m20251118_002
```

### Pre-Merge Checklist

Before merging any converted migration:

- [ ] Compilation passes with zero warnings
- [ ] Migration applies cleanly on fresh database
- [ ] Down migration rolls back successfully
- [ ] Schema dump matches baseline exactly
- [ ] Indexes created with correct definitions
- [ ] Seed data completes without errors
- [ ] GraphQL server starts successfully
- [ ] Integration tests pass
- [ ] Performance within 5% of baseline
- [ ] Code review completed
- [ ] Documentation updated

---

## Implementation Timeline & Phases

**Total Effort Estimate:** 2-3 days

### Phase 0: DRY Migration Registration (Priority 0)

**Effort:** 1 hour

**Tasks:**

- Simplify main.rs to import Migrator from lib.rs
- Remove ~185 lines of duplicate code
- Test migration CLI still works
- Document the change

**Deliverable:** Single source of truth for migration registration

### Phase 1: Migration Squashing (Optional, Recommended)

**Effort:** 4-6 hours

**Tasks:**

- Create backup branch
- Merge 5 fix migrations into their originals
- Delete 2 data cleanup migrations
- Update lib.rs registration
- Run full validation suite
- Schema comparison testing

**Deliverable:** 77 migrations → ~70 migrations (9% reduction)

**Dependencies:** None (can be done independently)

### Phase 2: Low-Risk Conversions

**Effort:** 3-4 hours

**Migrations:** 3 simple table operations

| Migration       | Operation            | Estimated Time |
| --------------- | -------------------- | -------------- |
| `m20251217_002` | Simple table drop    | 45 min         |
| `m20251203_001` | Table alterations    | 60 min         |
| `m20251217_001` | Inline form elements | 60 min         |

**Per Migration:**

1. Define Iden enums (15 min)
2. Convert to builders (20 min)
3. Run validation suite (10 min)
4. Code review & fixes (10 min)

**Deliverable:** 3 migrations converted, validation framework proven

### Phase 3: Medium-Risk Conversions

**Effort:** 6-8 hours

**Migrations:** 4 index-focused operations

| Migration       | Operation            | Complexity | Time   |
| --------------- | -------------------- | ---------- | ------ |
| `m20251118_002` | Partial unique index | Medium     | 90 min |
| `m20260205_001` | GIN index            | Medium     | 90 min |
| `m20251020_004` | User addresses       | Low        | 60 min |
| `m20251202_006` | Onboarding documents | Low        | 60 min |

**Critical:** m20251118_002 (email uniqueness) - test thoroughly with seed data

**Deliverable:** 7 total migrations converted (70% of target)

### Phase 4: Documentation & Finalization

**Effort:** 2-3 hours

**Tasks:**

- Update MIGRATION_GUIDE.md with SeaORM builder patterns
- Add examples for partial indexes, GIN indexes
- Document when raw SQL is acceptable
- Create migration template file
- Update README with new process

**Deliverable:** Complete documentation for future migrations

### Total Timeline

| Phase                 | Duration  | Can Start              |
| --------------------- | --------- | ---------------------- |
| Phase 0 (DRY)         | 1 hour    | Immediately            |
| Phase 1 (Squashing)   | 4-6 hours | After Phase 0          |
| Phase 2 (Low-Risk)    | 3-4 hours | After Phase 0 or 1     |
| Phase 3 (Medium-Risk) | 6-8 hours | After Phase 2          |
| Phase 4 (Docs)        | 2-3 hours | Concurrent with others |

**Parallelization Options:**

- Phase 1 and Phase 2 can run in parallel (different developer or days)
- Phase 4 can start during Phase 2

**Realistic Schedule:**

- **Day 1:** Phase 0 + Phase 1 (squashing) + start Phase 2
- **Day 2:** Complete Phase 2 + Phase 3 (conversions)
- **Day 3:** Phase 4 (documentation) + final validation

---

## Risks & Mitigation

### Risk 1: Schema Drift During Conversion

**Probability:** Medium | **Impact:** High

**Risk:** Converting migrations might accidentally change schema behavior

**Mitigation:**

- Mandatory schema comparison testing (diff schema dumps)
- Index definition verification SQL queries
- Integration tests must pass before merge
- Backup branch created before starting

**Rollback Plan:** Revert to backup branch, no production impact (pre-prod)

### Risk 2: Breaking Existing Development Databases

**Probability:** Low | **Impact:** Medium

**Risk:** Developers with existing local databases might have issues

**Mitigation:**

- Document that fresh migration run is required
- Provide clear migration path:

  ```bash
  # Save any test data if needed
  pg_dump hr_system > backup.sql

  # Reset migrations
  dropdb hr_system && createdb hr_system
  cargo run --bin migration fresh

  # Restore data if needed (optional)
  ```

- Communication in team Slack/chat before merging

**Impact:** 5-10 minutes of developer time per person

### Risk 3: SeaORM Builder Limitations Discovered

**Probability:** Low | **Impact:** Low

**Risk:** Discover that SeaORM can't handle a specific migration pattern

**Mitigation:**

- Research completed (partial indexes, GIN confirmed supported)
- Fallback: Keep that specific migration as raw SQL
- Document the limitation in MIGRATION_GUIDE.md

**Impact:** One migration stays as raw SQL (acceptable)

### Risk 4: Performance Regression

**Probability:** Very Low | **Impact:** Medium

**Risk:** Converted migrations create slightly different indexes affecting query performance

**Mitigation:**

- Query plan comparison (`EXPLAIN ANALYZE`)
- Performance benchmarks as part of validation
- Index definition verification
- If regression found: investigate root cause, fix builder syntax or revert

**Rollback Plan:** Revert specific migration, keep as raw SQL

### Risk 5: Migration Squashing Breaks History

**Probability:** Low | **Impact:** Low

**Risk:** Squashing migrations confuses developers about history

**Mitigation:**

- Phase 1 is optional (can skip if concerned)
- Only squash in pre-production (explicitly stated requirement)
- Git history preserves original migrations
- Document what was squashed in commit message

**Decision Point:** User can choose to skip Phase 1 entirely

---

## Success Metrics

### Quantitative Metrics

| Metric                  | Baseline  | Target  | Measurement                          |
| ----------------------- | --------- | ------- | ------------------------------------ |
| Raw SQL migrations      | 10        | ≤2      | Count in lib.rs                      |
| Code duplication        | 154 lines | 0 lines | diff lib.rs main.rs                  |
| Total migrations        | 77        | ~70     | Count .rs files                      |
| Migration run time      | X seconds | X + 5%  | time cargo run --bin migration fresh |
| Lines of migration code | ~15,000   | Similar | wc -l migration/\*.rs                |

### Qualitative Metrics

- ✅ Type safety: All table/column names use Iden enums
- ✅ Consistency: All migrations follow same patterns
- ✅ Maintainability: Refactoring tools work on migration code
- ✅ Documentation: Clear examples for future migrations
- ✅ Developer experience: Adding migration requires 1 file change only

---

## Future Improvements

**Not included in this project, but potential follow-ups:**

### 1. Migration Generator Tool

CLI to scaffold new migrations with proper Iden enums:

```bash
cargo run --bin new-migration add_user_badges
```

Automatically adds to lib.rs

### 2. Automated Schema Validation in CI

- GitHub Action to run schema comparison on PR
- Fails if schema changes unexpectedly

### 3. Migration Performance Benchmarks

- Track migration execution time over releases
- Alert if regressions detected

### 4. SeaORM Entity Sync Checking

- Tool to verify entity models match actual database schema
- Catch drift between code and database

---

## Summary

**Project:** SeaORM Migration Optimization & DRY Registration

**Core Goals:**

1. ✅ Eliminate ~185 lines of duplicate code (DRY main.rs)
2. ✅ Convert 8/10 raw SQL migrations to SeaORM builders (80% reduction)
3. ✅ (Optional) Squash 7 migrations into originals (9% reduction)
4. ✅ Improve type safety, maintainability, and consistency

**Timeline:** 2-3 days

**Risk Level:** Low (pre-production, comprehensive testing)

**Next Steps:**

1. Get approval for this design
2. Create implementation branch
3. Start with Phase 0 (DRY registration) - 1 hour quick win
4. Decide on Phase 1 (squashing) - optional
5. Proceed through conversion phases with validation

---

## References

- [Sea-query Partial Index Support](https://github.com/SeaQL/sea-query/pull/478)
- [IndexCreateStatement API](https://docs.rs/sea-query/latest/sea_query/index/struct.IndexCreateStatement.html)
- [IndexType Enum](https://docs.rs/sea-query/latest/sea_query/index/enum.IndexType.html)
- [SeaORM Migration Documentation](https://www.sea-ql.org/SeaORM/docs/migration/setting-up-migration/)
