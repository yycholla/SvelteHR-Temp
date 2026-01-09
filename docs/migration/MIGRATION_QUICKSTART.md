# Database Migration Quick Start

## TL;DR

Migrations now run **automatically** on every PostgreSQL container start. You don't need to do anything manually!

## For New Developers

### First Time Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd SvelteHR

# 2. Start the database
cd dev-containers
docker compose -f docker-compose.dev.yml up -d postgres-dev

# 3. Wait for migrations to complete (45-60 seconds)
docker logs -f sveltehr-postgres-dev

# 4. Verify migrations applied
npm run db:migrate:status
```

✅ **Done!** All 40+ migrations are applied automatically.

## Daily Development

### Pulling Latest Changes

```bash
# Pull latest code (includes new migrations)
git pull

# Restart PostgreSQL container
docker compose -f dev-containers/docker-compose.dev.yml restart postgres-dev

# OR just wait 10 seconds for healthcheck to run
```

✅ **New migrations apply automatically** - no commands needed!

### Creating a New Migration

```bash
# 1. Create migration file
npm run db:new-migration
# Follow prompts or manually: touch db/migrations/20251016_001_my_feature.sql

# 2. Write your SQL
vim db/migrations/20251016_001_my_feature.sql

# 3. Test locally
docker compose -f dev-containers/docker-compose.dev.yml restart postgres-dev

# 4. Verify it applied
npm run db:migrate:status

# 5. Commit
git add db/migrations/20251016_001_my_feature.sql
git commit -m "feat: add my feature migration"
git push
```

✅ **Teammates automatically get your migration** on their next `git pull` + container restart!

## Common Commands

```bash
# View migration status
npm run db:migrate:status

# Manually trigger migrations (usually not needed)
npm run db:migrate

# Rebuild database from scratch
npm run db:rebuild

# View database logs
npm run db:logs

# Check database health
npm run db:check
```

## Troubleshooting

### Migrations Not Applying?

```bash
# Check healthcheck status
docker compose -f dev-containers/docker-compose.dev.yml ps postgres-dev

# View healthcheck logs
docker logs sveltehr-postgres-dev 2>&1 | tail -50

# Manually trigger
npm run db:migrate
```

### Migration Failed?

```bash
# View error details
npm run db:migrate:status

# Option 1: Fix migration file and rebuild
npm run db:rebuild

# Option 2: Debug manually
docker exec -it sveltehr-postgres-dev psql -U postgres -d hr_system
```

### Inconsistent State Between PCs?

```bash
# Nuclear option: rebuild from scratch
npm run db:rebuild
```

## Migration Template

```sql
-- db/migrations/20251016_001_my_feature.sql
BEGIN;

-- Your schema changes here
CREATE TABLE hr_public.my_new_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_my_new_table_name ON hr_public.my_new_table(name);

-- RLS Policies
ALTER TABLE hr_public.my_new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own records"
    ON hr_public.my_new_table
    FOR SELECT
    USING (created_by = current_user_id());

-- Comments
COMMENT ON TABLE hr_public.my_new_table IS 'Description of my new feature';

COMMIT;
```

## Key Concepts

### Migration Tracking

Every migration is recorded in `hr_public.schema_migrations`:

```sql
SELECT migration_name, applied_at, success
FROM hr_public.schema_migrations
ORDER BY applied_at DESC
LIMIT 10;
```

### Idempotency

Migrations only run once. If already applied, they're skipped:

```
[1/40] Processing: 20250925_001_create_roles.sql
⊙ Skipped (already applied): 20250925_001_create_roles.sql

[2/40] Processing: 20251016_001_my_feature.sql
✓ Applied: 20251016_001_my_feature.sql (234ms)
```

### Automatic Sync

When you:

1. Pull new migrations from Git
2. Restart the container (or wait 10s)
3. Migrations auto-apply

No manual intervention required!

## Architecture

```
┌─────────────────┐
│  Git Pull       │
│  (new migration)│
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Container       │
│ Restart/Health  │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Check Tracking  │
│ Table           │
└────────┬────────┘
         │
         v
    ┌────┴────┐
    │ Pending?│
    └────┬────┘
         │
    Yes  │  No
    ┌────v────┐
    │ Apply   │  Skip
    │ Missing │
    └────┬────┘
         │
         v
    ┌─────────┐
    │ Record  │
    │ Success │
    └─────────┘
```

## Complete Documentation

For detailed information, see:

- [AUTOMATIC_MIGRATIONS.md](./AUTOMATIC_MIGRATIONS.md) - Complete system documentation
- [README.md](./README.md) - Database overview
- [WORKFLOW.md](./WORKFLOW.md) - Development workflow

---

**Questions?** Check the [troubleshooting section](./AUTOMATIC_MIGRATIONS.md#troubleshooting) or ask the team!
