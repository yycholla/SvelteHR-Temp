# Database Structure

This directory contains all database initialization and migration scripts.

## 🚀 Automatic Migrations

**NEW**: Migrations now run automatically on every PostgreSQL container start!

- ✅ **Zero manual intervention** - migrations apply automatically
- ✅ **Multi-PC sync** - consistent database state across machines
- ✅ **Migration tracking** - prevents duplicate applications
- ✅ **Docker-native** - leverages healthchecks and init scripts

**Quick Start**: See [MIGRATION_QUICKSTART.md](./MIGRATION_QUICKSTART.md)

**Full Documentation**: See [AUTOMATIC_MIGRATIONS.md](./AUTOMATIC_MIGRATIONS.md)

## Directory Structure

```
db/
├── init/                                # Initialization scripts (run once on container creation)
│   ├── 01_create_migration_tracking.sh  # Setup migration tracking table
│   └── 02_run_migrations.sh             # Apply all pending migrations
├── migrations/                          # SQL migration files (versioned schema changes)
│   ├── 20250925_001_create_roles.sql
│   ├── 20250925_002_create_schema.sql
│   └── ... (40+ migrations)
├── scripts/                             # Runtime scripts (run on every container start)
│   └── check-and-apply-migrations.sh    # Auto-detects and applies pending migrations
├── AUTOMATIC_MIGRATIONS.md              # Complete automatic migration documentation
├── MIGRATION_QUICKSTART.md              # Quick start guide
└── README.md                            # This file
```

## Migration Naming Convention

All migrations follow the pattern: `YYYYMMDD_NNN_description.sql`

- `YYYYMMDD`: Date when migration was created
- `NNN`: Sequence number (001, 002, etc.)
- `description`: Brief description of what the migration does

Example: `20251010_001_events_system.sql`

## How It Works

### Automatic Migration System

The system runs migrations automatically using Docker healthchecks:

**On First Container Creation:**

1. PostgreSQL initializes
2. Init scripts run (`01_create_migration_tracking.sh`, `02_run_migrations.sh`)
3. Migration tracking table created
4. All migrations applied in order
5. Recorded in `hr_public.schema_migrations`

**On Every Subsequent Start:**

1. PostgreSQL starts
2. Healthcheck runs after 45s
3. `check-and-apply-migrations.sh` detects pending migrations
4. Only new/missing migrations are applied
5. Container marked healthy

**Benefits:**

- ✅ Automatic sync across development machines
- ✅ No manual `npm run migrate` needed
- ✅ Idempotent - migrations only run once
- ✅ Tracked with checksums and execution time

See [AUTOMATIC_MIGRATIONS.md](./AUTOMATIC_MIGRATIONS.md) for complete details.

### Adding New Migrations

1. Create a new migration file in `db/migrations/`:

   ```bash
   touch db/migrations/20251010_006_add_new_feature.sql
   ```

2. Write your SQL (always use transactions):

   ```sql
   BEGIN;

   -- Your schema changes here
   CREATE TABLE hr_public.new_table (...);

   COMMIT;
   ```

3. Test locally:

   ```bash
   # Rebuild database from scratch
   docker compose -f dev-containers/docker-compose.dev.yml down postgres-dev
   docker volume rm sveltehr_postgres_dev_data
   docker compose -f dev-containers/docker-compose.dev.yml up -d postgres-dev
   ```

4. Verify:

   ```bash
   # Check logs
   docker logs sveltehr-postgres-dev 2>&1 | grep -A5 "your_migration_name"

   # Verify schema
   npm run db:verify
   ```

### Migration Best Practices

1. **Always use transactions** (`BEGIN` ... `COMMIT`)
2. **Make migrations idempotent** when possible:
   - Use `CREATE TABLE IF NOT EXISTS`
   - Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
   - Use `DROP ... IF EXISTS` before creating
3. **Test rollbacks** in development
4. **Keep migrations focused** - one logical change per file
5. **Document breaking changes** in comments
6. **Use proper schema prefixes** (e.g., `hr_public.table_name`)

### Debugging Failed Migrations

If a migration fails during initialization:

1. Check container logs:

   ```bash
   docker logs sveltehr-postgres-dev 2>&1 | grep ERROR
   ```

2. The script will show exactly which migration failed and the error details

3. Fix the migration file

4. Rebuild from scratch:
   ```bash
   docker compose -f dev-containers/docker-compose.dev.yml down postgres-dev
   docker volume rm sveltehr_postgres_dev_data
   docker compose -f dev-containers/docker-compose.dev.yml up -d postgres-dev
   ```

### Current Migration Status

Run schema verification to check current state:

```bash
npm run db:verify
```

This compares the live database against `schema-snapshots/baseline-schema.json`.

### Consolidated Migrations

We've organized migrations into feature-based files for better maintainability:

- **20251010_001_events_system.sql** - Complete events system (6 tables)
- **20251010_002_tasks_system.sql** - Complete task management (6 tables)
- **20251010_003_audit_rollback_system.sql** - Audit logging and rollback (4 tables)
- **20251010_004_documents_system.sql** - Document management (8 tables)
- **20251010_005_review_goals.sql** - Performance review goals junction

Each consolidated migration includes:

- Table creation with all columns
- Indexes and constraints
- Functions and triggers
- Row-Level Security (RLS) policies
- Comments and documentation

## Production Deployment

For production, use a proper migration tool like:

- **Flyway** (Java-based)
- **Liquibase** (Java-based with XML/YAML/SQL)
- **migrate** (Go-based, simple)
- **node-pg-migrate** (Node.js-based)

The current setup is optimized for development where we frequently rebuild from scratch.

## Troubleshooting

### "relation already exists" errors

- The migration was run before. Either:
  - Add `IF NOT EXISTS` to your CREATE statements
  - Drop and recreate the database volume

### "column does not exist" errors

- Check schema prefix: use `hr_public.table_name`, not just `table_name`
- Verify column names match actual table definition

### "permission denied" errors

- Check RLS policies
- Verify role grants in migration files
- Ensure proper role hierarchy

## Schema Snapshot & Drift Detection

Update baseline after schema changes:

```bash
npm run db:snapshot
git add schema-snapshots/baseline-schema.json
git commit -m "chore: update schema baseline"
```
