# Migration Best Practices Guide

This guide provides best practices for writing safe, idempotent database migrations for the SvelteHR project.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Core Principles](#core-principles)
3. [Migration Helpers](#migration-helpers)
4. [Common Patterns](#common-patterns)
5. [Testing Migrations](#testing-migrations)
6. [Troubleshooting](#troubleshooting)

## Quick Start

### Creating a New Migration

```bash
cd graphql-rust-server
sea-orm-cli migrate generate your_migration_name
```

### Migration Template

```rust
use sea_orm_migration::prelude::*;
use super::migration_helpers::MigrationHelpers;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add columns with IF NOT EXISTS
        MigrationHelpers::add_column_if_not_exists(
            manager,
            "hr_public.your_table",
            "your_column VARCHAR(255)",
        )
        .await?;

        // Create indexes with IF NOT EXISTS
        MigrationHelpers::create_index_if_not_exists(
            manager,
            "idx_your_index",
            "hr_public.your_table",
            "your_column",
        )
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop operations with IF EXISTS
        MigrationHelpers::drop_index_if_exists(
            manager,
            "hr_public.idx_your_index",
        )
        .await?;

        MigrationHelpers::execute_idempotent(
            manager,
            "ALTER TABLE hr_public.your_table DROP COLUMN IF EXISTS your_column",
            "Drop your_column from your_table",
        )
        .await?;

        Ok(())
    }
}
```

### Validating Your Migration

Before committing, always validate:

```bash
cargo run --bin migration validate
```

This will check for:

- Non-idempotent `ADD COLUMN` statements
- Non-idempotent `CREATE INDEX` statements
- Non-idempotent `CREATE TABLE` statements
- Missing error handling

## Core Principles

### 1. **Idempotency is Mandatory**

Every migration MUST be safely runnable multiple times. If a migration fails midway and is re-run, it should not error.

❌ **BAD - Will fail on second run:**

```rust
manager.get_connection().execute_unprepared(
    "ALTER TABLE users ADD COLUMN email VARCHAR(255)"
).await?;
// Error: column "email" already exists
```

✅ **GOOD - Safe to re-run:**

```rust
MigrationHelpers::add_column_if_not_exists(
    manager,
    "hr_public.users",
    "email VARCHAR(255)",
).await?;
// Success: Column added or already exists
```

### 2. **Use Migration Helpers**

Always prefer `MigrationHelpers` over raw SQL for common operations:

- `add_column_if_not_exists()` - Add single column
- `add_columns_if_not_exist()` - Add multiple columns
- `create_index_if_not_exists()` - Create index
- `drop_index_if_exists()` - Drop index
- `execute_idempotent()` - Execute SQL with error handling

### 3. **Graceful Error Handling**

Never propagate errors immediately without checking if they're recoverable:

❌ **BAD - Immediate error propagation:**

```rust
manager.get_connection().execute_unprepared(sql).await?;
```

✅ **GOOD - Graceful handling:**

```rust
MigrationHelpers::execute_idempotent(
    manager,
    sql,
    "Description of operation",
).await?;
```

### 4. **Avoid Column Duplication**

Before adding a column, check if it already exists in a previous migration:

```bash
# Search for existing column
rg "ADD COLUMN your_column" graphql-rust-server/migration/
```

### 5. **Test Idempotency**

Every migration should pass this test:

```bash
# Run migration
cargo run --bin migration up

# Run again - should succeed with no errors
cargo run --bin migration up
```

## Migration Helpers

### Adding Columns

#### Single Column

```rust
MigrationHelpers::add_column_if_not_exists(
    manager,
    "hr_public.users",
    "employee_number VARCHAR(50)",
).await?;
```

#### Multiple Columns (Recommended for 3+ columns)

```rust
MigrationHelpers::add_columns_if_not_exist(
    manager,
    "hr_public.users",
    &[
        "last_synced_at TIMESTAMPTZ",
        "sync_status VARCHAR(50) NOT NULL DEFAULT 'pending'",
        "sync_token VARCHAR(255)",
    ],
).await?;
```

### Creating Indexes

#### Standard Index

```rust
MigrationHelpers::create_index_if_not_exists(
    manager,
    "idx_users_email",
    "hr_public.users",
    "email",
).await?;
```

#### Composite Index

```rust
MigrationHelpers::create_index_if_not_exists(
    manager,
    "idx_users_dept_status",
    "hr_public.users",
    "department_id, status",
).await?;
```

#### Partial/Conditional Index

```rust
MigrationHelpers::execute_idempotent(
    manager,
    "CREATE INDEX IF NOT EXISTS idx_users_active
     ON hr_public.users(is_active)
     WHERE deleted_at IS NULL",
    "Create partial index for active users",
).await?;
```

### Dropping Indexes

```rust
MigrationHelpers::drop_index_if_exists(
    manager,
    "hr_public.idx_users_old_column",
).await?;
```

### Custom SQL Operations

```rust
MigrationHelpers::execute_idempotent(
    manager,
    r#"
        ALTER TABLE hr_public.users
        ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb
    "#,
    "Add metadata column to users",
).await?;
```

## Common Patterns

### Pattern 1: Adding Tracking Fields

```rust
async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
    MigrationHelpers::add_columns_if_not_exist(
        manager,
        "hr_public.your_table",
        &[
            "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
            "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
            "created_by UUID REFERENCES hr_public.users(id)",
        ],
    )
    .await?;

    // Add trigger for updated_at
    MigrationHelpers::execute_idempotent(
        manager,
        r#"
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ language 'plpgsql';

            DROP TRIGGER IF EXISTS update_your_table_updated_at ON hr_public.your_table;

            CREATE TRIGGER update_your_table_updated_at
                BEFORE UPDATE ON hr_public.your_table
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        "#,
        "Create updated_at trigger",
    )
    .await?;

    Ok(())
}
```

### Pattern 2: Adding Foreign Keys

```rust
async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
    MigrationHelpers::add_column_if_not_exists(
        manager,
        "hr_public.documents",
        "uploaded_by UUID",
    )
    .await?;

    MigrationHelpers::execute_idempotent(
        manager,
        r#"
            ALTER TABLE hr_public.documents
            ADD CONSTRAINT IF NOT EXISTS fk_documents_uploaded_by
            FOREIGN KEY (uploaded_by) REFERENCES hr_public.users(id)
            ON DELETE SET NULL
        "#,
        "Add foreign key for uploaded_by",
    )
    .await?;

    Ok(())
}
```

### Pattern 3: Modifying Existing Columns

```rust
async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
    // Make column nullable
    MigrationHelpers::execute_idempotent(
        manager,
        "ALTER TABLE hr_public.users ALTER COLUMN phone DROP NOT NULL",
        "Make phone column nullable",
    )
    .await?;

    // Change column type
    MigrationHelpers::execute_idempotent(
        manager,
        "ALTER TABLE hr_public.users ALTER COLUMN email TYPE VARCHAR(500)",
        "Increase email column length",
    )
    .await?;

    Ok(())
}
```

### Pattern 4: Data Migrations

```rust
async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
    // Add new column
    MigrationHelpers::add_column_if_not_exists(
        manager,
        "hr_public.users",
        "display_name VARCHAR(255) NOT NULL DEFAULT ''",
    )
    .await?;

    // Populate data (safe to re-run)
    manager.get_connection().execute_unprepared(
        r#"
            UPDATE hr_public.users
            SET display_name = first_name || ' ' || last_name
            WHERE display_name = '' OR display_name IS NULL
        "#,
    ).await?;

    Ok(())
}
```

### Pattern 5: Creating Tables

```rust
async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
    manager
        .create_table(
            Table::create()
                .table((Schema::HrPublic, YourTable::Table))
                .if_not_exists()  // ← CRITICAL: Always include this
                .col(
                    ColumnDef::new(YourTable::Id)
                        .uuid()
                        .not_null()
                        .primary_key()
                        .extra("DEFAULT gen_random_uuid()")
                )
                .col(
                    ColumnDef::new(YourTable::Name)
                        .string()
                        .not_null()
                )
                .to_owned(),
        )
        .await?;

    Ok(())
}
```

## Testing Migrations

### Local Testing

1. **Fresh Database Test:**

   ```bash
   # Drop and recreate database
   cargo run --bin migration fresh

   # Verify application starts
   cargo run
   ```

2. **Idempotency Test:**

   ```bash
   # Run migrations
   cargo run --bin migration up

   # Run again - should succeed
   cargo run --bin migration up
   ```

3. **Rollback Test:**

   ```bash
   # Run migration
   cargo run --bin migration up

   # Rollback
   cargo run --bin migration down

   # Re-apply
   cargo run --bin migration up
   ```

### Pre-Commit Checklist

Before committing a migration:

- [ ] Run `cargo run --bin migration validate` (must pass with 0 critical/high issues)
- [ ] Test on fresh database: `cargo run --bin migration fresh`
- [ ] Test idempotency: Run migration twice
- [ ] Test rollback: `up` → `down` → `up`
- [ ] Verify application starts and works
- [ ] Check for column duplicates: `rg "your_column" migration/`
- [ ] Update `main.rs` and `lib.rs` with new migration module

## Troubleshooting

### Error: "column already exists"

**Problem:** Migration tried to add a column that already exists.

**Solution:**

```rust
// Instead of:
manager.execute_unprepared("ALTER TABLE users ADD COLUMN email VARCHAR(255)").await?;

// Use:
MigrationHelpers::add_column_if_not_exists(
    manager,
    "hr_public.users",
    "email VARCHAR(255)",
).await?;
```

### Error: "relation already exists" (index)

**Problem:** Migration tried to create an index that already exists.

**Solution:**

```rust
// Instead of:
manager.execute_unprepared("CREATE INDEX idx_users_email ON users(email)").await?;

// Use:
MigrationHelpers::create_index_if_not_exists(
    manager,
    "idx_users_email",
    "hr_public.users",
    "email",
).await?;
```

### Partial Migration Failure

**Problem:** Migration failed midway, leaving database in inconsistent state.

**Symptoms:**

- Migration marked as "complete" in `seaql_migrations` table
- Some columns/indexes created, others missing
- Application queries fail with "column does not exist"

**Solution:**

1. **Manually fix the database:**

   ```bash
   # Connect to database
   kubectl exec -n sveltehr-prod sveltehr-postgres-1 -- psql -U postgres -d hr_system

   # Add missing columns manually
   ALTER TABLE hr_public.users ADD COLUMN IF NOT EXISTS missing_column VARCHAR(255);
   ```

2. **Fix the migration file** to be idempotent (use `MigrationHelpers`)

3. **Re-run migrations** (now safe with IF NOT EXISTS guards)

### Validation Failures

**Critical Issues:** Must fix before deploying

- Non-idempotent ADD COLUMN
- Non-idempotent CREATE INDEX
- Non-idempotent CREATE TABLE

**High Priority Issues:** Should fix before deploying

- Missing IF NOT EXISTS on indexes

**Medium Priority Issues:** Can fix gradually

- Direct error propagation (use MigrationHelpers for better logging)

## Migration Review Checklist

When reviewing migration PRs:

- [ ] Does `cargo run --bin migration validate` pass?
- [ ] Are all `ADD COLUMN` statements using `IF NOT EXISTS`?
- [ ] Are all `CREATE INDEX` statements using `IF NOT EXISTS`?
- [ ] Are all `CREATE TABLE` statements using `.if_not_exists()`?
- [ ] Are MigrationHelpers used for common operations?
- [ ] Is there proper error handling (no naked `.await?`)?
- [ ] Has the migration been tested on a fresh database?
- [ ] Has idempotency been verified (run twice)?
- [ ] Are both `up()` and `down()` implemented correctly?
- [ ] Is the migration added to both `main.rs` and `lib.rs`?

## Additional Resources

- [Migration Audit Report](../../docs/MIGRATION_AUDIT_2026-01-10.md) - Detailed audit of all migrations
- [SeaORM Migration Docs](https://www.sea-ql.org/SeaORM/docs/migration/setting-up-migration/)
- [PostgreSQL IF NOT EXISTS](https://www.postgresql.org/docs/current/sql-altertable.html)

## Getting Help

If you encounter migration issues:

1. Check this guide for common patterns
2. Review the migration audit report
3. Run the validator: `cargo run --bin migration validate`
4. Ask in the team chat with:
   - Migration file name
   - Error message
   - What you've already tried
