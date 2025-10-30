# SeaORM Database Migrations - Production Guide

## Overview

This document explains how database migrations work in production and ensures data safety when creating new migrations.

## How Migrations Work

### Migration Tracking

SeaORM automatically tracks which migrations have been applied using a special table: `seaql_migrations`

```sql
CREATE TABLE seaql_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

When you run `migration up`, SeaORM:
1. Checks the `seaql_migrations` table for applied migrations
2. Compares with the list of available migrations
3. **Only applies new migrations** that haven't been run yet
4. Records each successfully applied migration in the tracking table

### Non-Destructive by Design

The `migration up` command is **non-destructive** and **safe for production**:

- ✅ **Additive**: Only applies new migrations, never touches existing data
- ✅ **Idempotent**: Can be run multiple times safely (skips already-applied migrations)
- ✅ **Automatic**: Runs on every container startup without manual intervention
- ✅ **Tracked**: Maintains migration history in database
- ❌ **Never use `migration fresh`**: This drops all tables (destructive!)
- ❌ **Never use `migration down` in production**: Rolls back migrations (destructive!)

## Production Dockerfile Changes

### Builder Stage - Compiling Migration Binary

```dockerfile
# Build application in release mode
RUN cargo build --release --bin hr-graphql-server

# Build migration binary for production use
RUN cargo build --release --bin migration

# Verify binaries exist
RUN test -f /app/target/release/hr-graphql-server || (echo "Build failed: hr-graphql-server binary not found" && exit 1)
RUN test -f /app/target/release/migration || (echo "Build failed: migration binary not found" && exit 1)
```

### Production Stage - Copying Migration Binary

```dockerfile
# Copy binaries from builder
COPY --from=builder /app/target/release/hr-graphql-server ./hr-graphql-server
COPY --from=builder /app/target/release/migration ./migration-bin

# Copy migration files (required for SeaORM migrations)
COPY --from=builder /app/migration ./migration

# Copy entrypoint script
COPY docker-entrypoint-prod.sh ./docker-entrypoint-prod.sh

# Make binaries and entrypoint executable
RUN chmod +x /app/hr-graphql-server /app/migration-bin /app/docker-entrypoint-prod.sh
```

## Production Entrypoint Script

The entrypoint script (`docker-entrypoint-prod.sh`) runs migrations before starting the server:

```bash
#!/bin/sh
set -e

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
until pg_isready -h "$DB_HOST" -U postgres -d "$DB_NAME" >/dev/null 2>&1; do
  echo "   PostgreSQL is unavailable - sleeping"
  sleep 2
done

# Run SeaORM migrations (ONLY 'up' - non-destructive)
echo "📦 Running SeaORM database migrations..."

if ./migration-bin up; then
    echo "✅ Migrations completed successfully!"
else
    echo "❌ Migration failed! Exiting..."
    exit 1
fi

# Start the GraphQL server
exec ./hr-graphql-server
```

## Creating New Migrations

### Step 1: Create Migration File

```bash
cd migration
cargo run -- generate <migration_name>
```

This creates a new migration file: `migration/src/m<timestamp>_<migration_name>.rs`

### Step 2: Implement Migration Logic

**Safe Patterns (Non-Destructive):**

```rust
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ✅ Add new table
        manager
            .create_table(
                Table::create()
                    .table(NewTable::Table)
                    .if_not_exists() // Safe: won't error if table exists
                    .col(ColumnDef::new(NewTable::Id).uuid().primary_key())
                    .col(ColumnDef::new(NewTable::Name).string().not_null())
                    .to_owned(),
            )
            .await?;

        // ✅ Add new column to existing table
        manager
            .alter_table(
                Table::alter()
                    .table(ExistingTable::Table)
                    .add_column(
                        ColumnDef::new(ExistingTable::NewColumn)
                            .string()
                            .null() // Safe: nullable columns don't break existing data
                    )
                    .to_owned(),
            )
            .await?;

        // ✅ Add index
        manager
            .create_index(
                Index::create()
                    .name("idx_existing_table_new_column")
                    .table(ExistingTable::Table)
                    .col(ExistingTable::NewColumn)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    // Note: down() is not used in production (only for development rollbacks)
    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Rollback logic for development only
        Ok(())
    }
}
```

**Dangerous Patterns (Avoid in Production):**

```rust
// ❌ DANGER: Dropping tables destroys data!
manager.drop_table(Table::drop().table(OldTable::Table).to_owned()).await?;

// ❌ DANGER: Dropping columns destroys data!
manager.alter_table(
    Table::alter()
        .table(Users::Table)
        .drop_column(Users::OldColumn)
        .to_owned()
).await?;

// ❌ DANGER: ALTER COLUMN can break existing data!
manager.alter_table(
    Table::alter()
        .table(Users::Table)
        .modify_column(
            ColumnDef::new(Users::Email)
                .string()
                .not_null() // Making existing nullable column NOT NULL can fail!
        )
        .to_owned()
).await?;
```

### Step 3: Register Migration

Add the new migration to `migration/src/lib.rs`:

```rust
pub use m<timestamp>_<migration_name>::Migration as M<timestamp>Migration;

impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            // ... existing migrations ...
            Box::new(M<timestamp>Migration), // Add new migration here
        ]
    }
}
```

### Step 4: Test Locally

```bash
# Run migrations locally
cargo run --bin migration up

# Verify schema changes
psql -U postgres -d hr_system -c "\d <table_name>"

# If needed, rollback in development
cargo run --bin migration down
```

### Step 5: Commit and Deploy

```bash
git add migration/
git commit -m "Add migration: <description>"
git push
```

When deployed, the production container will automatically apply the new migration on startup.

## Migration Safety Checklist

Before deploying a migration to production:

- [ ] Migration is **additive only** (adds tables/columns, doesn't remove)
- [ ] New columns are **nullable** or have **default values**
- [ ] Migration has been **tested locally** with production-like data
- [ ] `migration up` completes successfully in local environment
- [ ] No `DROP TABLE`, `DROP COLUMN`, or destructive `ALTER` statements
- [ ] Migration is **idempotent** (can be run multiple times safely)
- [ ] Migration logic is in `up()` method (production only uses `up`)
- [ ] Large data migrations use **batch processing** to avoid timeouts
- [ ] Migration is registered in `migration/src/lib.rs`

## Troubleshooting

### Migration Fails on Startup

**Symptoms**: Container fails to start, logs show migration error

**Solutions**:

1. **Check migration logs**:
   ```bash
   docker-compose -f docker-compose.prod.yml logs hr-graphql-rust | grep -A 10 "Migration"
   ```

2. **Inspect seaql_migrations table**:
   ```bash
   docker exec -it sveltehr-postgres-prod psql -U postgres -d hr_system -c "SELECT * FROM seaql_migrations ORDER BY applied_at DESC;"
   ```

3. **Manually fix failed migration**:
   ```bash
   # Connect to database
   docker exec -it sveltehr-postgres-prod psql -U postgres -d hr_system

   # Remove failed migration record (if partially applied)
   DELETE FROM seaql_migrations WHERE version = 'm<timestamp>_<migration_name>';

   # Fix schema manually if needed
   -- ...

   # Restart container to retry migration
   docker-compose -f docker-compose.prod.yml restart hr-graphql-rust
   ```

### Migration Applied But Schema Incorrect

**Symptoms**: Migration marked as applied but schema changes missing

**Cause**: Migration succeeded but didn't make expected changes

**Solution**:

1. Create a **new migration** to fix the schema (never modify existing migrations after deployment)
2. Test the fix migration locally
3. Deploy the fix migration

### Want to Rollback Migration in Development

```bash
# Rollback last migration
cargo run --bin migration down

# Rollback to specific version
cargo run --bin migration down -n <count>

# Fresh database (DEVELOPMENT ONLY!)
cargo run --bin migration fresh
```

## Best Practices

1. **Always add new columns as nullable** or with default values
2. **Never modify existing migrations** after they're deployed
3. **Create new migrations to fix schema issues** instead of editing old ones
4. **Test migrations with production-like data volumes**
5. **Use transactions** where possible (SeaORM handles this automatically)
6. **Document breaking changes** in migration comments
7. **Coordinate with team** before deploying schema-dependent code changes

## Example: Safe Migration Workflow

```rust
// m20251029_add_employee_avatar.rs

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add avatar_url column to users table
        manager
            .alter_table(
                Table::alter()
                    .table(Users::Table)
                    .add_column(
                        ColumnDef::new(Users::AvatarUrl)
                            .string()
                            .null() // Safe: nullable column, existing data unaffected
                    )
                    .to_owned(),
            )
            .await?;

        // Add index for performance
        manager
            .create_index(
                Index::create()
                    .name("idx_users_avatar_url")
                    .table(Users::Table)
                    .col(Users::AvatarUrl)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Users::Table)
                    .drop_column(Users::AvatarUrl)
                    .to_owned()
            )
            .await
    }
}

#[derive(Iden)]
enum Users {
    Table,
    AvatarUrl,
}
```

This migration:
- ✅ Adds a new nullable column (safe, doesn't affect existing rows)
- ✅ Adds an index (performance improvement)
- ✅ Can be rolled back in development (down method)
- ✅ Will be applied automatically on container startup
- ✅ Is tracked in `seaql_migrations` table
- ✅ Won't be reapplied if already run

## Summary

The production migration system is designed to be:
- **Safe**: Only applies pending migrations, never touches existing data
- **Automatic**: Runs on every container startup
- **Tracked**: Maintains migration history
- **Non-destructive**: Uses `migration up` only (never `fresh` or `down`)
- **Recoverable**: Failed migrations can be fixed with new migrations

Always follow the safety checklist before deploying migrations to production!
