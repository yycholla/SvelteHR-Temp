# Task System Schema Migration Guide

## Overview

This migration replaces the old simple `hr_public.tasks` table with a comprehensive task management system that includes:

- ✅ **Task hierarchies** (parent/child subtasks)
- ✅ **Task types** (system and custom)
- ✅ **Task dependencies** (with circular dependency prevention)
- ✅ **Linked resources** (connect tasks to documents, events, employees, etc.)
- ✅ **Audit trail** (complete history of all task changes)
- ✅ **RLS policies** (role-based access control)
- ✅ **Advanced fields** (archived, requires_manual_reassignment, etc.)

## Migration Files

The migration consists of 8 files that must be applied in order:

1. `20251009_000_migrate_to_new_task_schema.sql` - Drops old tasks table
2. `20251009_001_create_task_enums.sql` - Creates task status, priority, resource type enums
3. `20251009_002_create_task_types_table.sql` - Creates task_types table with seed data
4. `20251009_003_create_tasks_table.sql` - Creates new tasks table with full feature set
5. `20251009_004_create_task_audit_entries.sql` - Creates audit trail table
6. `20251009_005_create_task_dependencies.sql` - Creates dependencies with cycle detection
7. `20251009_006_create_linked_resources.sql` - Creates linked resources table
8. `20251009_007_create_rls_policies.sql` - Creates RLS policies for security

## How to Apply the Migration

### Option 1: Using the Migration Script (Recommended)

From your Docker backend container:

```bash
# Copy the migration script to the container
docker cp /tmp/apply_task_migrations.sql sveltehr-backend:/tmp/

# Copy the runner script
docker cp /tmp/run_task_migration.sh sveltehr-backend:/tmp/

# Execute the migration
docker exec -it sveltehr-backend bash /tmp/run_task_migration.sh
```

### Option 2: Manual psql Execution

```bash
# Connect to database
docker exec -it postgres psql -U sveltehr_user -d svelteHR

# Run migrations manually
\i migrations/20251009_000_migrate_to_new_task_schema.sql
\i migrations/20251009_001_create_task_enums.sql
\i migrations/20251009_002_create_task_types_table.sql
\i migrations/20251009_003_create_tasks_table.sql
\i migrations/20251009_004_create_task_audit_entries.sql
\i migrations/20251009_005_create_task_dependencies.sql
\i migrations/20251009_006_create_linked_resources.sql
\i migrations/20251009_007_create_rls_policies.sql
```

### Option 3: Using scripts/init-db.sh

The init-db.sh script should automatically apply these migrations if it's configured to run all SQL files in migrations/.

## What Changes

### Before (Old Schema)
```sql
hr_public.tasks (
  id, assignee_id, assigner_id, department_id,
  assigned_to_department_id, title, description,
  priority, status, due_date, completed_at,
  created_at, updated_at
)
```

### After (New Schema)
```sql
-- Main tasks table with hierarchy
tasks (
  id, title, description, assignee_id, creator_id,
  task_type_id, status, priority, due_date,
  parent_task_id, archived, archived_at, archived_by,
  requires_manual_reassignment, created_at, updated_at
)

-- Task types (system and custom)
task_types (
  id, name, description, is_system, created_at, created_by
)

-- Task dependencies (with circular prevention)
task_dependencies (
  id, blocking_task_id, blocked_task_id,
  dependency_type, created_at
)

-- Linked resources
linked_resources (
  id, task_id, resource_type, resource_id,
  resource_title, availability_status, last_checked, created_at
)

-- Complete audit trail
task_audit_entries (
  id, task_id, action_type, changed_fields,
  new_values, user_id, timestamp
)
```

## Schema Differences

### Removed Fields
- `assigner_id` → replaced with `creator_id`
- `department_id` → not needed (use linked_resources)
- `assigned_to_department_id` → not needed (use linked_resources)
- `completed_at` → use `status = 'Completed'` + audit trail

### Added Fields
- `creator_id` - User who created the task
- `task_type_id` - Reference to task_types table
- `parent_task_id` - For subtask hierarchies
- `archived`, `archived_at`, `archived_by` - Soft delete support
- `requires_manual_reassignment` - For orphaned task handling

### Changed Enums
- Status: `'todo'` → `'To Do'`, `'in_progress'` → `'In Progress'`, etc.
- Priority: `'low'` → `'Low'`, `'medium'` → `'Medium'`, etc.

## Post-Migration Verification

After running the migration, verify the schema:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('tasks', 'task_types', 'task_dependencies', 'linked_resources', 'task_audit_entries');

-- Check task_types seed data
SELECT * FROM task_types;

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('tasks', 'task_audit_entries');

-- Check policies exist
SELECT schemaname, tablename, policyname FROM pg_policies
WHERE tablename IN ('tasks', 'task_audit_entries');
```

Expected output:
- 5 tables created
- 4 task types seeded (General, Onboarding, Assessment, Training)
- RLS enabled on tasks and task_audit_entries
- 5 RLS policies created

## Troubleshooting

### Migration Fails on "tasks table already exists"

If the old tasks table wasn't dropped:
```sql
DROP TABLE IF EXISTS hr_public.tasks CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
```

### PostGraphile Not Seeing New Schema

Restart PostGraphile after migration:
```bash
docker restart sveltehr-backend
```

### GraphQL Queries Still Failing

1. Check PostGraphile logs for schema introspection errors
2. Verify all migrations completed successfully
3. Check that RLS policies allow your user to read tasks
4. Restart the frontend dev server to clear any cached schema

## Impact on Frontend

The GraphQL operations in `src/lib/graphql/tasks-operations.ts` are already configured for the new schema. After the migration:

1. ✅ All queries will work with the new schema
2. ✅ Task hierarchies can be queried
3. ✅ Dependencies can be managed
4. ✅ Linked resources can be attached
5. ✅ Audit trail is available

No frontend code changes needed!

## Rollback (Emergency Only)

If you need to rollback to the old schema:

```sql
-- Drop new tables
DROP TABLE IF EXISTS linked_resources CASCADE;
DROP TABLE IF EXISTS task_dependencies CASCADE;
DROP TABLE IF EXISTS task_audit_entries CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS task_types CASCADE;

-- Drop enums
DROP TYPE IF EXISTS audit_action_type_enum;
DROP TYPE IF EXISTS availability_status_enum;
DROP TYPE IF EXISTS resource_type_enum;
DROP TYPE IF EXISTS task_priority_enum;
DROP TYPE IF EXISTS task_status_enum;

-- Restore old table
-- (run the 03_create_tasks_table.sql migration)
```

⚠️ **Warning**: This will lose all task data in the new schema!

## Support

For issues with migration:
1. Check PostgreSQL logs: `docker logs postgres`
2. Check backend logs: `docker logs sveltehr-backend`
3. Verify migration files are in the correct directory
4. Ensure database user has sufficient permissions
