# Migration from SQL to SeaORM Rust Migrations

## What Changed?

The database schema management has been migrated from SQL files to **type-safe Rust code** using SeaORM's migration framework.

### Before (SQL-based)

```bash
# Old approach: Manual SQL scripts
./scripts/init-db.sh  # Runs SQL files from db/migrations/
```

### After (Rust-based)

```bash
# New approach: Type-safe Rust migrations
cargo run --bin migration up  # Runs Rust migration code
# OR
# Automatically runs on Docker container startup!
```

## Key Benefits

1. **Type Safety**: All schema changes are validated at compile-time
2. **Version Control**: Migration code is part of your Rust codebase
3. **Rollback Support**: Built-in `up()` and `down()` migrations
4. **Automatic Execution**: Migrations run automatically on container startup
5. **Cross-Platform**: No need for bash scripts or psql client

## Docker Integration

### Automatic Migration on Startup

When you start the `hr-graphql-rust` container, it now:

1. **Waits for PostgreSQL** to be ready
2. **Runs all pending migrations** automatically
3. **Starts the GraphQL server** once migrations complete

```bash
# Just start your services - migrations happen automatically!
docker-compose up -d
```

### Container Startup Logs

You'll see:

```
🚀 Starting SvelteHR GraphQL Rust Server...
⏳ Waiting for PostgreSQL to be ready...
✅ PostgreSQL is ready!
📦 Running SeaORM database migrations...
Applying migration 'm20251017_001_schemas'
Applying migration 'm20251017_002_enums'
Applying migration 'm20251017_003_auth'
...
✅ Migrations completed successfully!
🚀 Starting GraphQL server on 0.0.0.0:4000...
```

## Local Development

### Running Migrations Manually

```bash
cd graphql-rust-server

# Check migration status
cargo run --bin migration status

# Apply all pending migrations
cargo run --bin migration up

# Rollback last migration
cargo run --bin migration down

# Reset database (fresh start)
cargo run --bin migration fresh
```

### Environment Setup

Make sure `DATABASE_URL` is set:

```bash
export DATABASE_URL=postgresql://postgres:postgres123@localhost:5433/hr_system
```

Or use `.env` file in `graphql-rust-server/`:

```env
DATABASE_URL=postgresql://postgres:postgres123@localhost:5433/hr_system
```

## Migration Modules

All 12 migration modules in `/migration/`:

| Order | Module                    | Tables Created                      |
| ----- | ------------------------- | ----------------------------------- |
| 1     | `m20251017_001_schemas`   | Schema setup (hr_public + pgcrypto) |
| 2     | `m20251017_002_enums`     | PostgreSQL enums                    |
| 3     | `m20251017_003_auth`      | Authentication & RBAC (7 tables)    |
| 4     | `m20251017_004_hr_core`   | Departments, leave types, policies  |
| 5     | `m20251017_005_tasks`     | Task management (5 tables)          |
| 6     | `m20251017_006_events`    | Event system (5 tables)             |
| 7     | `m20251017_007_documents` | Document management (6 tables)      |
| 8     | `m20251017_008_reviews`   | Performance reviews (5 tables)      |
| 9     | `m20251017_009_employee`  | Employee details (5 tables)         |
| 10    | `m20251017_010_time`      | Time tracking (2 tables)            |
| 11    | `m20251017_011_system`    | System tables (11 tables)           |

**Total: 47+ tables** across all modules

## Old SQL Files

The old SQL migration files in `db/migrations/` are now **deprecated** and should not be used:

- ❌ `scripts/init-db.sh` - No longer needed
- ❌ `db/migrations/*.sql` - Replaced by Rust migrations
- ✅ `migration/*.rs` - **Use these instead!**

### Archiving Old Files (Optional)

If you want to keep the old SQL files for reference:

```bash
mkdir -p db/migrations/_archive
mv db/migrations/*.sql db/migrations/_archive/
mv scripts/init-db.sh scripts/_archive/
```

## Troubleshooting

### "Migration table already exists"

If you previously ran SQL migrations, SeaORM will detect existing tables and skip them. This is safe!

### "Connection refused"

Make sure PostgreSQL is running:

```bash
docker-compose ps
# Should show sveltehr-postgres-dev as "healthy"
```

### "Migration failed"

Check the error message and container logs:

```bash
docker logs hr-graphql-rust
```

### Fresh Database Start

To completely reset (⚠️ **DESTROYS ALL DATA**):

```bash
# Stop containers
docker-compose down

# Remove PostgreSQL volume
docker volume rm sveltehr_postgres_data

# Recreate volume
docker volume create sveltehr_postgres_data

# Start containers (migrations run automatically)
docker-compose up -d
```

## CI/CD Integration

For automated deployments:

```bash
# In your CI/CD pipeline
cd graphql-rust-server

# Build migration binary
cargo build --release --bin migration

# Run migrations before deploying
./target/release/migration up

# Then start the server
./target/release/hr-graphql-server
```

## FAQ

**Q: Can I still write SQL migrations?**
A: No - all new migrations must be in Rust. This ensures type safety and compile-time validation.

**Q: What happens to existing data?**
A: Existing data is preserved. SeaORM only applies migrations that haven't run yet.

**Q: How do I create a new migration?**
A: Create a new module in `/migration/` following the existing pattern. See `/migration/README.md`.

**Q: Can I rollback migrations?**
A: Yes! Use `cargo run --bin migration down` or implement custom `down()` methods.

**Q: Do migrations run automatically in production?**
A: Yes, if you use the Docker image. The entrypoint script runs migrations on container startup.
