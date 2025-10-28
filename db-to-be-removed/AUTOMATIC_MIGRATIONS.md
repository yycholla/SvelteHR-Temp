# Automatic Database Migrations

## Overview

SvelteHR uses an **automatic migration system** that runs on every PostgreSQL container start. This ensures migrations are always synchronized across different development machines without manual intervention.

## How It Works

### 🔄 Automatic Migration Flow

```
Container Start
    ↓
PostgreSQL Initializes
    ↓
Healthcheck Runs (after 45s start period)
    ↓
Check Migration Tracking Table
    ↓
Detect Pending Migrations
    ↓
Apply Missing Migrations Only
    ↓
✅ Container Healthy & Up-to-Date
```

### Key Components

1. **Migration Tracking Table** (`hr_public.schema_migrations`)
   - Stores which migrations have been applied
   - Includes checksum, execution time, and status
   - Prevents duplicate application

2. **Init Scripts** (`db/init/`)
   - `01_create_migration_tracking.sh` - Sets up tracking table
   - `02_run_migrations.sh` - Applies pending migrations on first creation

3. **Runtime Scripts** (`db/scripts/`)
   - `check-and-apply-migrations.sh` - Runs on every container start
   - Detects and applies only missing migrations

4. **Custom Healthcheck**
   - Runs migration check after PostgreSQL is ready
   - Non-blocking (container starts even if migrations fail)
   - Provides detailed migration status

## Benefits

### ✅ Multi-PC Development
- **No manual migration commands** needed
- **Automatic synchronization** across development machines
- **Consistent database state** everywhere

### ✅ Idempotent & Safe
- Only applies migrations that haven't run
- Tracks migration history with checksums
- Stops on first error with detailed reporting

### ✅ Docker-Native
- Leverages Docker healthchecks
- No external tools required
- Works with Docker Compose out of the box

## Quick Reference

### Common Commands

```bash
# View migration status
npm run db:migrate:status

# Manually trigger migration check (usually not needed)
npm run db:migrate

# Rebuild database from scratch
npm run db:rebuild

# View migration logs
npm run db:logs

# Check database health
npm run db:check
```

### Adding a New Migration

1. Create migration file:
   ```bash
   npm run db:new-migration
   # Or manually: touch db/migrations/20251016_001_description.sql
   ```

2. Write SQL (use transactions):
   ```sql
   BEGIN;

   CREATE TABLE hr_public.new_feature (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       name VARCHAR(255) NOT NULL
   );

   COMMIT;
   ```

3. **That's it!** The migration will automatically apply on next:
   - Container restart: `docker compose restart postgres-dev`
   - Manual trigger: `npm run db:migrate`

### Migration Status

Check which migrations have been applied:

```bash
npm run db:migrate:status
```

Output:
```
📊 Migration Status Report
==================================
📁 Total migration files: 40
✅ Applied migrations: 40
✅ All migrations applied!

📜 Recent Migration History:
==================================
                migration                  |       applied       | status | time
------------------------------------------+---------------------+--------+------
 20251014_003_create_rbac_system.sql      | 2025-10-16 10:30:15 | ✓      | 234ms
 20251014_002_fix_response_status_enum.s | 2025-10-16 10:30:14 | ✓      | 89ms
 ...
```

## Migration Workflow

### Scenario 1: Fresh Container Start

```bash
# First time starting the database
cd dev-containers
docker compose -f docker-compose.dev.yml up -d postgres-dev

# What happens:
# 1. PostgreSQL initializes
# 2. docker-entrypoint-initdb.d/ scripts run
#    - 01_create_migration_tracking.sh creates tracking table
#    - 02_run_migrations.sh applies ALL migrations
# 3. Healthcheck passes
# 4. Container ready ✅
```

### Scenario 2: Container Restart (Migrations Already Applied)

```bash
docker compose restart postgres-dev

# What happens:
# 1. PostgreSQL starts
# 2. Healthcheck runs check-and-apply-migrations.sh
# 3. Compares migration files vs tracking table
# 4. No pending migrations → Container ready immediately ✅
```

### Scenario 3: New Migration Added

```bash
# Developer 1 adds migration: 20251016_001_new_feature.sql
git add db/migrations/20251016_001_new_feature.sql
git commit -m "feat: add new feature migration"
git push

# Developer 2 pulls changes
git pull

# Developer 2's container automatically updates:
docker compose restart postgres-dev
# OR just wait for healthcheck interval (10s)

# What happens:
# 1. Healthcheck detects new migration file
# 2. Applies 20251016_001_new_feature.sql automatically
# 3. Records in schema_migrations table
# 4. Container remains healthy ✅
```

## Migration Tracking Table

The `hr_public.schema_migrations` table structure:

```sql
CREATE TABLE hr_public.schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64),
    execution_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT
);
```

Query migration history:

```sql
-- View all applied migrations
SELECT * FROM hr_public.schema_migrations
ORDER BY applied_at DESC;

-- Check for failed migrations
SELECT * FROM hr_public.schema_migrations
WHERE success = false;

-- Find pending migrations (compare files vs table)
-- (Done automatically by scripts)
```

## Troubleshooting

### Problem: Migrations Not Auto-Applying

**Check healthcheck status:**
```bash
docker inspect sveltehr-postgres-dev --format='{{json .State.Health}}' | jq
```

**View healthcheck logs:**
```bash
docker logs sveltehr-postgres-dev 2>&1 | grep -A20 "Checking for pending migrations"
```

**Manually trigger migration check:**
```bash
npm run db:migrate
```

### Problem: Migration Failed

**View error details:**
```bash
npm run db:migrate:status
```

Look for failed migrations with error messages.

**Fix the migration file** and then:

```bash
# Option 1: Rebuild database from scratch
npm run db:rebuild

# Option 2: Manually fix and retry
docker exec -it sveltehr-postgres-dev psql -U postgres -d hr_system
# Manually fix the issue in SQL
# Then mark migration as successful or delete failed record
```

### Problem: Inconsistent State Between PCs

**Root causes:**
- Different migration files (Git not synced)
- Failed migrations on one PC but not the other
- Manual database changes

**Resolution:**
```bash
# On problematic PC:
npm run db:rebuild

# This will:
# 1. Destroy the database volume
# 2. Recreate from scratch
# 3. Apply all migrations in order
```

## Architecture Details

### Directory Structure

```
db/
├── init/                                # Docker init scripts (run once)
│   ├── 01_create_migration_tracking.sh  # Setup tracking table
│   └── 02_run_migrations.sh             # Initial migration run
├── migrations/                          # SQL migration files
│   ├── 20250925_001_create_roles.sql
│   ├── 20250925_002_create_schema.sql
│   └── ...
└── scripts/                             # Runtime scripts
    ├── check-and-apply-migrations.sh    # Auto-run on healthcheck
    └── docker-entrypoint-wrapper.sh     # Custom entrypoint (if needed)
```

### Docker Compose Configuration

```yaml
postgres-dev:
  build:
    context: ../
    dockerfile: dev-containers/postgres/Dockerfile  # Custom Dockerfile
  volumes:
    - postgres_dev_data:/var/lib/postgresql/data
    - ../db/init:/docker-entrypoint-initdb.d:ro    # Init scripts
    - ../db/migrations:/migrations:ro               # Migration files
    - ../db/scripts:/usr/local/bin/db-scripts:ro   # Runtime scripts
  healthcheck:
    test: ['/usr/local/bin/healthcheck.sh']        # Custom healthcheck
    interval: 10s
    timeout: 15s
    retries: 6
    start_period: 45s
```

### Custom PostgreSQL Dockerfile

```dockerfile
FROM postgres:15-alpine

# Install bash for our scripts
RUN apk add --no-cache bash

# Copy migration scripts
COPY db/scripts/check-and-apply-migrations.sh /usr/local/bin/
COPY dev-containers/postgres/healthcheck.sh /usr/local/bin/

# Make executable
RUN chmod +x /usr/local/bin/*.sh
```

## Best Practices

### ✅ DO

- **Always use transactions** (`BEGIN` ... `COMMIT`)
- **Make migrations idempotent** when possible
- **Test migrations locally** before committing
- **Keep migrations small and focused**
- **Document complex migrations** in comments
- **Use proper schema prefixes** (`hr_public.table_name`)

### ❌ DON'T

- **Don't modify applied migrations** (creates checksum mismatches)
- **Don't skip migrations** (they run in order)
- **Don't make breaking changes** without coordination
- **Don't rely on manual SQL** outside of migrations
- **Don't commit broken migrations** (test first!)

## Manual Override

If you need to manually control migrations:

```bash
# Skip automatic migrations (temporarily)
docker compose -f dev-containers/docker-compose.dev.yml up -d postgres-dev --no-deps

# Manually run specific migration
docker exec -it sveltehr-postgres-dev \
  psql -U postgres -d hr_system -f /migrations/20251016_001_new_feature.sql

# Mark migration as applied
docker exec -it sveltehr-postgres-dev psql -U postgres -d hr_system <<EOF
INSERT INTO hr_public.schema_migrations (migration_name, success)
VALUES ('20251016_001_new_feature.sql', true);
EOF
```

## Migration Performance

Typical migration execution times:

- **Simple table creation**: 50-100ms
- **Index creation**: 100-500ms
- **Complex schema changes**: 500-2000ms
- **Data migrations**: Varies by data size

Total initialization time (fresh database):
- **40+ migrations**: ~10-15 seconds
- Includes PostgreSQL startup + all migrations

## Rollback Strategy

For production rollbacks, create separate `.rollback.sql` files:

```bash
# Migration
db/migrations/20251016_001_add_feature.sql

# Rollback
db/migrations/20251016_001_add_feature.rollback.sql
```

The automatic system only applies forward migrations. Rollbacks must be manual.

## Future Enhancements

Potential improvements:

- [ ] Migration locking for parallel container starts
- [ ] Dry-run mode for migration preview
- [ ] Migration dependency management
- [ ] Automatic rollback on failure
- [ ] Migration performance benchmarking
- [ ] Web UI for migration status

---

**Last Updated**: 2025-10-16
**System Status**: ✅ Production Ready
**Supported Databases**: PostgreSQL 14+
