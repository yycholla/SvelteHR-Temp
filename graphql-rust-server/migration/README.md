# SeaORM Migrations for SvelteHR

This directory contains Rust-based database migrations using SeaORM migration framework.

## Migration Modules

| Module | Description | Tables Created |
|--------|-------------|----------------|
| `m20251017_001_schemas` | Schema setup | Creates `hr_public` schema and enables `pgcrypto` extension |
| `m20251017_002_enums` | PostgreSQL enums | Creates all custom enum types (status, priority, etc.) |
| `m20251017_003_auth` | Authentication & RBAC | users, roles, permissions, role_permissions, user_role_assignments, sessions, user_sessions |
| `m20251017_004_hr_core` | HR core tables | departments, leave_types, time_off_policies |
| `m20251017_005_tasks` | Task management | tasks, task_types, task_assignees, task_dependencies, task_audit_entries |
| `m20251017_006_events` | Event system | events, event_attendees, event_waitlist, event_comments, event_history |
| `m20251017_007_documents` | Document management | documents, document_categories, document_versions, document_assignments, document_access_logs, encrypted_file_storage |
| `m20251017_008_reviews` | Performance reviews | performance_reviews, review_cycles, review_templates, review_goals, review_feedback |
| `m20251017_009_employee` | Employee details | emergency_contacts, employee_skills, employee_certifications, employee_vehicles, employee_goals |
| `m20251017_010_time` | Time tracking | attendance_records, leave_requests |
| `m20251017_011_system` | System tables | activity_logs, notifications, linked_resources, rollback_requests, bulk_rollback_batches, bulk_rollback_items, payroll_records, compensation_bands, hr_reports, encryption_keys, system_settings |

## Running Migrations

### Check Migration Status
```bash
cargo run --bin migration status
```

### Apply All Pending Migrations
```bash
cargo run --bin migration up
```

### Apply N Pending Migrations
```bash
cargo run --bin migration up -n 5
```

### Rollback Last Migration
```bash
cargo run --bin migration down
```

### Rollback N Migrations
```bash
cargo run --bin migration down -n 3
```

### Reset Database (Drop all tables and re-apply)
```bash
cargo run --bin migration fresh
```

### Refresh Database (Rollback all + Re-apply all)
```bash
cargo run --bin migration refresh
```

## Environment Variables

Set these in your `.env` file or environment:

```bash
DATABASE_URL=postgres://postgres:postgres123@localhost:5433/hr_system
```

## Migration Pattern

All migrations create tables in the `hr_public` schema and follow these conventions:

1. **UUID Primary Keys**: All tables use `UUID` with `DEFAULT gen_random_uuid()`
2. **Soft Deletes**: All tables have `deleted_at TIMESTAMPTZ` column
3. **Timestamps**: All tables have `created_at` and `updated_at` with auto-default
4. **Foreign Keys**: Proper ON DELETE/UPDATE actions (Cascade, SetNull, Restrict)
5. **Indexes**: Strategic indexes on foreign keys, status columns, and frequently queried fields
6. **Partial Indexes**: For active records (`WHERE deleted_at IS NULL`)

## Schema Consistency

All migration code is generated from SeaORM models in `/src/models/`, ensuring:
- Type-safe schema definitions
- Compile-time validation
- Consistency between ORM models and database schema
- No SQL string interpolation vulnerabilities

## Troubleshooting

### Connection Issues
If you get "connection refused" errors, ensure PostgreSQL is running:
```bash
docker ps | grep postgres
```

### Schema Errors
If migrations fail due to existing objects, you can reset:
```bash
cargo run --bin migration fresh  # WARNING: Drops all data!
```

### Checking Applied Migrations
The `seaql_migrations` table tracks which migrations have been applied:
```sql
SELECT * FROM seaql_migrations ORDER BY applied_at;
```
