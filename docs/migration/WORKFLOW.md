# Database Migration Workflow

Quick reference for common database operations.

## Development Workflow

### 1. Create a New Migration

```bash
npm run db:new-migration add_feature_name
```

This creates a new timestamped migration file in `db/migrations/` with a template.

### 2. Edit the Migration

Open the generated file and add your SQL:

```sql
BEGIN;

-- Add your schema changes
CREATE TABLE IF NOT EXISTS hr_public.my_new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_my_table_name ON hr_public.my_new_table(name);

COMMIT;
```

### 3. Test the Migration

Rebuild the database from scratch to test all migrations:

```bash
npm run db:rebuild
```

This will:
- Stop the postgres container
- Delete the database volume
- Start a fresh container
- Run all migrations in order

### 4. Check Results

View migration execution logs:

```bash
npm run db:logs
```

Check table count:

```bash
npm run db:check
```

### 5. Verify Schema

Compare against baseline:

```bash
npm run db:verify
```

### 6. Update Baseline (if schema changed intentionally)

After confirming your migration works:

```bash
npm run db:snapshot
git add schema-snapshots/baseline-schema.json
git commit -m "chore: update schema baseline after adding feature_name"
```

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run db:new-migration <name>` | Create new migration file |
| `npm run db:rebuild` | Rebuild database from scratch |
| `npm run db:logs` | View migration execution logs |
| `npm run db:check` | Count tables in hr_public schema |
| `npm run db:verify` | Check for schema drift |
| `npm run db:snapshot` | Create new baseline snapshot |

## Migration Best Practices

### Always Use Transactions

```sql
BEGIN;
-- your changes
COMMIT;
```

### Make Migrations Idempotent

```sql
-- ✅ Good
CREATE TABLE IF NOT EXISTS hr_public.users (...);
ALTER TABLE hr_public.users ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- ❌ Bad
CREATE TABLE hr_public.users (...);
ALTER TABLE hr_public.users ADD COLUMN email VARCHAR(255);
```

### Use Proper Schema Prefixes

```sql
-- ✅ Good
CREATE TABLE hr_public.tasks (...);
CREATE INDEX idx_tasks_status ON hr_public.tasks(status);
ALTER TABLE hr_public.tasks ENABLE ROW LEVEL SECURITY;

-- ❌ Bad
CREATE TABLE tasks (...);  -- might create in wrong schema
```

### Add Comments for Documentation

```sql
COMMENT ON TABLE hr_public.tasks IS 'Project and HR task management';
COMMENT ON COLUMN hr_public.tasks.status IS 'Current status: todo, in_progress, done';
```

### Test Failure Scenarios

Before committing, intentionally break your migration to verify error handling:

```bash
# Add a syntax error temporarily
# Run npm run db:rebuild
# Verify it stops at the error and shows details
# Fix and retest
```

## Debugging Failed Migrations

If a migration fails:

1. **Check the logs** for exact error:
   ```bash
   docker logs sveltehr-postgres-dev 2>&1 | grep ERROR -A10
   ```

2. **Identify the failed migration**:
   The script shows exactly which file failed

3. **Fix the migration file**

4. **Rebuild from scratch**:
   ```bash
   npm run db:rebuild
   ```

## Docker Container Management

### Start/Stop Database

```bash
# Start
cd dev-containers && docker compose -f docker-compose.dev.yml up -d postgres-dev

# Stop
docker compose -f docker-compose.dev.yml down postgres-dev

# Stop and remove volume
docker compose -f docker-compose.dev.yml down postgres-dev
docker volume rm sveltehr_postgres_dev_data
```

### Connect to Database

```bash
# Using docker exec
docker exec -it sveltehr-postgres-dev psql -U postgres -d hr_system

# Using local psql (if installed)
psql postgresql://postgres:postgres123@localhost:5433/hr_system
```

### View Container Status

```bash
docker ps | grep postgres
docker logs sveltehr-postgres-dev
```

## Migration File Structure

```
db/
├── init/
│   └── 00_run_migrations.sh    # Entrypoint script (auto-runs all migrations)
└── migrations/
    ├── 20250925_001_create_roles.sql
    ├── 20250925_002_create_schema.sql
    ├── ...
    └── 20251010_005_review_goals.sql
```

**Key Points:**
- Files run in **alphabetical order** (timestamp-based)
- Only `.sql` files in `migrations/` are executed
- `.bak`, `.disabled`, `_archive/` are ignored
- Script stops on first error

## Consolidated Migrations

We use feature-based migration files:

- **20251010_001_events_system.sql** - Complete events + notifications (6 tables)
- **20251010_002_tasks_system.sql** - Task management (6 tables)
- **20251010_003_audit_rollback_system.sql** - Audit + rollback (4 tables)
- **20251010_004_documents_system.sql** - Document management (8 tables)
- **20251010_005_review_goals.sql** - Review goals junction

Each includes:
- Table creation
- Indexes
- Foreign keys
- Functions/triggers
- RLS policies
- Comments

## Production Deployment

⚠️ **Important**: The current setup is for development only!

For production, implement:

1. **Migration versioning** (track which migrations ran)
2. **Rollback capabilities** (create DOWN migrations)
3. **Backup before migrate**
4. **Use a proper migration tool**:
   - Flyway
   - Liquibase
   - migrate (Go)
   - node-pg-migrate

## Troubleshooting

### "permission denied" on script

```bash
chmod +x db/init/00_run_migrations.sh
chmod +x scripts/db/new-migration.sh
```

### "volume in use" error

Another container is using the volume:

```bash
docker ps -a | grep postgres
docker rm -f <container-id>
```

### Migrations not running

Check volume mounts in `dev-containers/docker-compose.dev.yml`:

```yaml
volumes:
  - ../db/init:/docker-entrypoint-initdb.d:ro
  - ../db/migrations:/migrations:ro
```

### "schema not found"

Ensure `hr_public` schema is created in early migration:

```sql
CREATE SCHEMA IF NOT EXISTS hr_public;
```
