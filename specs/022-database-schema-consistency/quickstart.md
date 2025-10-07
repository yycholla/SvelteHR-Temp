# Quickstart Guide: Database Schema Consistency Tools

**Feature**: 022-database-schema-consistency
**Date**: 2025-10-03
**Audience**: Developers setting up or maintaining the SvelteHR database

## Overview

This guide walks you through using the database schema consistency tooling to verify, maintain, and remediate your database schema. These tools ensure your database matches version control exactly, enabling reliable deployments and reproducible environments.

## Prerequisites

- PostgreSQL 14+ installed and running
- Node.js 18+ (for TypeScript tooling scripts)
- Docker (optional, for isolated testing)
- Git repository cloned
- Database credentials for development/staging environments

## Quick Start: Verify Your Database

The fastest way to check if your database schema matches version control:

```bash
# From repository root
npm run db:verify

# Or with explicit environment
npm run db:verify -- --environment=development --database-url=$DATABASE_URL
```

**Expected Output** (if schema matches):

```
✅ Schema Verification PASSED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Verification ID: 550e8400-e29b-41d4-a716-446655440000
Environment: development
Execution Time: 4.2s

Schema Source (version control): 22 tables, 47 indexes, 38 constraints
Schema Target (database): 22 tables, 47 indexes, 38 constraints

Verdict: PASS
No differences detected between version control and database.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Output if differences found**:

```
⚠️  Schema Verification WARN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Verification ID: 550e8400-e29b-41d4-a716-446655440001
Environment: development
Execution Time: 4.8s

Differences Found:
  📋 Missing Tables: 0
  📋 Extra Tables: 0
  📝 Modified Tables: 1
  🔧 Missing Columns: 0
  🔧 Extra Columns: 2
  📊 Missing Indexes: 1
  📊 Extra Indexes: 2

Details:
  ┌─────────────────────────────────────────────────────
  │ Table: events
  │ - Extra column: approved_by (integer, nullable)
  │ - Extra column: approved_at (timestamptz, nullable)
  │
  │ Index Issues:
  │ - Extra index: idx_events_approved_at
  │ - Extra index: idx_events_approved_by
  │ - Missing index: idx_events_created_at
  └─────────────────────────────────────────────────────

Recommended Actions:
  1. [HIGH] Generate remediation migration for extra columns (automatable)
     Estimated effort: 10 minutes
  2. [MEDIUM] Review index differences and update migration files
     Estimated effort: 15 minutes

Report saved to: ./verification-reports/2025-10-03-development.json
Markdown summary: ./verification-reports/2025-10-03-development.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Step-by-Step Workflows

### Workflow 1: New Developer Setup (Fresh Database Initialization)

**Goal**: Initialize a working database from version control on a new development machine.

**Steps**:

1. **Clone repository and install dependencies**:
   ```bash
   git clone https://github.com/yourusername/SvelteHR.git
   cd SvelteHR
   npm install
   ```

2. **Start PostgreSQL** (or use Docker):
   ```bash
   # Option A: Local PostgreSQL
   sudo systemctl start postgresql

   # Option B: Docker container
   docker run --name hr-postgres -e POSTGRES_PASSWORD=hrdev -p 5432:5432 -d postgres:14
   ```

3. **Create database**:
   ```bash
   createdb hr_development
   # Or via psql:
   psql -c "CREATE DATABASE hr_development;"
   ```

4. **Run initialization script**:
   ```bash
   npm run db:init

   # Or manually:
   psql hr_development < migrations/00_init_schema.sql
   ```

5. **Verify setup**:
   ```bash
   npm run db:verify -- --environment=development
   ```

   **Expected**: `Verdict: PASS` with 22 tables created.

6. **Start application**:
   ```bash
   npm run dev
   ```

**Success Criteria**:
- ✅ Database created with 22 tables
- ✅ Schema verification passes
- ✅ Frontend application loads without database errors
- ✅ Can login and navigate dashboard

**Troubleshooting**:

| Issue | Solution |
|-------|----------|
| `ERROR: relation "users" already exists` | Drop database and retry: `dropdb hr_development && createdb hr_development` |
| `Verification FAIL: Missing table "bulk_rollback_batches"` | Init script outdated - run `npm run db:rebuild-init` then retry |
| `Connection refused` | Ensure PostgreSQL is running: `pg_isready` |

---

### Workflow 2: Detecting Schema Drift (Ongoing Development)

**Goal**: Identify database changes that weren't documented in migration files.

**When to run**:
- After manually testing database changes
- Before creating a pull request
- Daily during active development
- In CI/CD pipeline (automated)

**Steps**:

1. **Run verification**:
   ```bash
   npm run db:verify -- --environment=development --output-format=both
   ```

2. **Review differences** in generated report:
   ```bash
   cat verification-reports/$(date +%Y-%m-%d)-development.md
   ```

3. **If differences found**, proceed to Workflow 3 (Generate Remediation Migration).

**CI/CD Integration**:

Add to `.github/workflows/schema-verify.yml`:

```yaml
name: Schema Verification

on:
  pull_request:
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  verify-schema:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup PostgreSQL
        uses: harmon758/postgresql-action@v1
        with:
          postgresql version: '14'
          postgresql db: hr_staging

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Initialize database
        run: npm run db:init
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/hr_staging

      - name: Verify schema
        run: npm run db:verify -- --environment=staging --fail-on-differences=false
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/hr_staging

      - name: Upload verification report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: schema-verification-report
          path: verification-reports/

      - name: Comment on PR
        uses: actions/github-script@v6
        if: github.event_name == 'pull_request' && failure()
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('verification-reports/' + new Date().toISOString().split('T')[0] + '-staging.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '## ⚠️ Schema Drift Detected\n\n' + report
            });
```

---

### Workflow 3: Generate Remediation Migration

**Goal**: Create migration files to document undocumented schema changes.

**Prerequisites**: Schema verification found differences (Workflow 2).

**Steps**:

1. **Generate migration from drift**:
   ```bash
   npm run db:generate-migration -- \
     --diff-source=./verification-reports/2025-10-03-development.json \
     --environment=development
   ```

   **Output**:
   ```
   ✅ Migration Generated
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Files created:
     1. migrations/remediation/20251003_001_add_missing_columns_events.sql
     2. migrations/remediation/20251003_001_add_missing_columns_events.rollback.sql

   Reason: missing_column
   Affected: events.approved_by, events.approved_at

   ⚠️  REQUIRES MANUAL REVIEW (FR-024a)

   Please review generated SQL before applying:
     cat migrations/remediation/20251003_001_add_missing_columns_events.sql
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

2. **Review generated migration**:
   ```bash
   cat migrations/remediation/20251003_001_add_missing_columns_events.sql
   ```

   **Example output**:
   ```sql
   -- Migration: [AUTO-GENERATED] Add missing columns to events table
   -- Created: 2025-10-03T14:30:00Z
   -- Source: Schema drift detection (verify-schema)
   -- Affected: events.approved_by, events.approved_at
   -- Reason: missing_column
   -- Requires Review: YES (manual verification required per FR-024a)

   BEGIN;

   -- Add missing columns to events table
   ALTER TABLE hr_public.events
     ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES hr_public.users(id),
     ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

   -- Add indexes for new columns
   CREATE INDEX IF NOT EXISTS idx_events_approved_by ON hr_public.events(approved_by);
   CREATE INDEX IF NOT EXISTS idx_events_approved_at ON hr_public.events(approved_at);

   COMMIT;
   ```

3. **Review rollback migration**:
   ```bash
   cat migrations/remediation/20251003_001_add_missing_columns_events.rollback.sql
   ```

4. **Manual review checklist**:
   - [ ] SQL syntax is correct
   - [ ] Column data types match actual database
   - [ ] Constraints are appropriate (nullable, defaults, foreign keys)
   - [ ] Indexes are needed and properly defined
   - [ ] Migration is idempotent (IF NOT EXISTS guards)
   - [ ] Rollback migration reverses changes correctly
   - [ ] No data loss risk

5. **If approved, move to main migrations directory**:
   ```bash
   # Rename with proper sequence number
   mv migrations/remediation/20251003_001_add_missing_columns_events.sql \
      migrations/20251003_010_add_approval_fields_events.sql

   mv migrations/remediation/20251003_001_add_missing_columns_events.rollback.sql \
      migrations/rollbacks/20251003_010_add_approval_fields_events.rollback.sql
   ```

6. **Validate migration**:
   ```bash
   npm run db:validate-migrations
   ```

7. **Rebuild init script** to include new migration:
   ```bash
   npm run db:rebuild-init
   ```

8. **Verify schema now matches**:
   ```bash
   npm run db:verify
   ```

   **Expected**: `Verdict: PASS`

9. **Commit changes**:
   ```bash
   git add migrations/20251003_010_add_approval_fields_events.sql \
            migrations/rollbacks/20251003_010_add_approval_fields_events.rollback.sql \
            migrations/00_init_schema.sql

   git commit -m "feat(db): add approval fields to events table

   - Added approved_by column (references users)
   - Added approved_at timestamp column
   - Added indexes for approval fields
   - Updated init schema to reflect changes

   Closes #123"
   ```

---

### Workflow 4: Validate Migration Files

**Goal**: Ensure migration files follow naming conventions, are properly sequenced, and have valid SQL syntax.

**When to run**:
- Before creating a pull request
- After creating new migrations
- In pre-commit hooks
- In CI/CD pipeline

**Steps**:

1. **Run validation**:
   ```bash
   npm run db:validate-migrations
   ```

   **Output (all valid)**:
   ```
   ✅ Migration Validation PASSED
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Migrations checked: 25

   Checks performed:
     ✅ Naming pattern validation
     ✅ Sequential ordering validation
     ✅ SQL syntax validation
     ✅ Rollback file validation
     ✅ Checksum integrity validation

   Warnings: 0
   Errors: 0
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

   **Output (with errors)**:
   ```
   ❌ Migration Validation FAILED
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Migrations checked: 25

   Errors:
     1. [INVALID_NAMING] add_users_table.sql
        Migration filename does not match pattern YYYYMMDD_NNN_description.sql
        Expected pattern: ^\d{8}_\d{3}_[a-z0-9_]+\.sql$

     2. [DUPLICATE_SEQUENCE] 20251003_005_add_column.sql
        Sequence number 005 already used by 20251003_005_create_table.sql

     3. [CHECKSUM_MISMATCH] 20251001_003_create_departments.sql
        File checksum does not match database record (file modified after application)
        Expected: a3f5b8c9d2e1f4a7b6c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0
        Actual:   b4e6c9d3f2a5b8c7d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1

   Warnings:
     1. [MISSING_ROLLBACK] 20251001_010_drop_legacy_table.sql
        No rollback file found (irreversible migration should document reason)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

2. **Fix validation errors**:

   **For INVALID_NAMING**:
   ```bash
   # Rename to proper pattern
   mv add_users_table.sql 20251003_011_add_users_table.sql
   ```

   **For DUPLICATE_SEQUENCE**:
   ```bash
   # Increment sequence number
   mv 20251003_005_add_column.sql 20251003_006_add_column.sql
   ```

   **For CHECKSUM_MISMATCH**:
   ```
   ⚠️  CRITICAL: Never edit migration files after they've been applied to non-dev environments!

   Resolution:
   1. Revert file to original checksum (git checkout)
   2. Create NEW migration with additional changes
   ```

   **For MISSING_ROLLBACK**:
   ```bash
   # Create rollback file or document why not possible
   cat > migrations/rollbacks/20251001_010_drop_legacy_table.rollback.sql <<EOF
   -- Rollback Migration: NOT POSSIBLE
   -- Forward Migration: 20251001_010_drop_legacy_table.sql
   -- Reason: Table was dropped with all data. Rollback would require:
   --   1. Manual data recovery from backup
   --   2. Recreate table structure
   --   3. Restore data from backup
   -- Contact DevOps team if rollback is needed.
   EOF
   ```

3. **Re-run validation** to confirm fixes.

---

### Workflow 5: Rebuild Initialization Script

**Goal**: Update the initialization script to match the cumulative state of all migrations.

**When to run**:
- After merging new migrations to main branch
- When init script becomes outdated
- Before major releases

**Steps**:

1. **Run rebuild**:
   ```bash
   npm run db:rebuild-init
   ```

   **Output**:
   ```
   ✅ Init Script Rebuilt Successfully
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Migrations applied: 25
   Tables created: 22
   Indexes created: 47
   Constraints created: 38
   Functions created: 5
   Triggers created: 8

   Validation: PASSED
   Init script schema matches cumulative migration schema.

   Written to: migrations/00_init_schema.sql
   Execution time: 8.5s
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

2. **Review changes**:
   ```bash
   git diff migrations/00_init_schema.sql
   ```

3. **Test init script**:
   ```bash
   # Create fresh test database
   createdb hr_test_init

   # Apply init script
   psql hr_test_init < migrations/00_init_schema.sql

   # Verify
   npm run db:verify -- --database-url=postgresql://localhost/hr_test_init

   # Clean up
   dropdb hr_test_init
   ```

4. **Commit updated init script**:
   ```bash
   git add migrations/00_init_schema.sql
   git commit -m "chore(db): rebuild init schema from migrations

   - Rebuilt from 25 migration files
   - Reflects current database structure (22 tables)
   - Validation passed: init script matches cumulative migrations"
   ```

---

## Common Scenarios

### Scenario 1: "I added a column manually for testing"

**Problem**: You executed `ALTER TABLE users ADD COLUMN test_field TEXT;` directly in psql for testing, but forgot to create a migration.

**Solution**:

1. Run verification to detect drift:
   ```bash
   npm run db:verify
   ```

2. Generate migration:
   ```bash
   npm run db:generate-migration
   ```

3. Review and rename generated migration file to proper sequence.

4. Drop the manual column, then re-apply via migration:
   ```bash
   psql -c "ALTER TABLE users DROP COLUMN test_field;"
   psql hr_development < migrations/20251003_012_add_test_field_users.sql
   ```

5. Verify and commit.

---

### Scenario 2: "Production database has changes not in version control"

**Problem**: Production database has schema elements not documented in migrations (common after hotfixes).

**Solution** (per FR-026 - production drift):

1. **Manual audit only** (no automated verification):
   ```bash
   # Connect to production (read-only)
   npm run db:verify -- \
     --environment=production \
     --database-url=$PRODUCTION_DATABASE_URL_READONLY
   ```

2. **Generate migration files** (do NOT auto-apply):
   ```bash
   npm run db:generate-migration -- \
     --diff-source=./verification-reports/2025-10-03-production.json \
     --environment=production
   ```

3. **Manual review process**:
   - Schedule maintenance window
   - Review generated migrations with DBA team
   - Test migrations in staging environment first
   - Document in CHANGELOG
   - Get approval from tech lead

4. **Apply to version control only**:
   ```bash
   git add migrations/20251003_013_production_hotfix_reconciliation.sql
   git commit -m "docs(db): document production hotfix schema changes"
   ```

5. **Rebuild init script** to include production changes.

6. **Production database remains unchanged** (it's already correct).

---

### Scenario 3: "CI/CD pipeline reports schema drift"

**Problem**: Pull request triggers CI check, reports schema differences, but you want to merge urgently.

**Solution** (per FR-009a - informational only):

1. CI/CD check **does not block merge** (informational warning only).

2. Review the posted comment on PR with schema differences.

3. Create follow-up issue to remediate drift:
   ```
   Title: [Schema Drift] Remediate differences detected in PR #456

   Description:
   Verification report from CI detected schema differences:
   - Extra columns: events.approved_by, events.approved_at
   - Extra indexes: idx_events_approved_at

   Action items:
   1. Generate remediation migration
   2. Review and validate SQL
   3. Update init script
   4. Verify schema matches

   Link to verification report: [CI artifact URL]
   ```

4. Merge PR if urgent, remediate drift in follow-up PR.

---

## Reference

### NPM Scripts

| Script | Purpose | Arguments |
|--------|---------|-----------|
| `npm run db:init` | Initialize fresh database | None |
| `npm run db:verify` | Verify schema consistency | `--environment`, `--database-url`, `--output-format` |
| `npm run db:generate-migration` | Generate remediation migration | `--diff-source`, `--environment` |
| `npm run db:rebuild-init` | Rebuild init script from migrations | None |
| `npm run db:validate-migrations` | Validate migration files | `--strict`, `--check-rollbacks` |

### File Locations

- **Initialization script**: `migrations/00_init_schema.sql`
- **Migration files**: `migrations/YYYYMMDD_NNN_description.sql`
- **Rollback files**: `migrations/rollbacks/YYYYMMDD_NNN_description.rollback.sql`
- **Remediation migrations**: `migrations/remediation/` (temporary, move to main after review)
- **Verification reports**: `verification-reports/YYYY-MM-DD-environment.{json,md}`
- **Migration history table**: `hr_public.schema_migrations` (in database)

### Migration File Naming Convention

**Pattern**: `YYYYMMDD_NNN_description.sql`

- `YYYYMMDD`: Date in ISO format (e.g., `20251003`)
- `NNN`: Sequence number within day (001-999)
- `description`: Lowercase with underscores (e.g., `add_approval_fields_events`)

**Examples**:
- ✅ `20251003_001_create_users_table.sql`
- ✅ `20251003_002_add_email_index_users.sql`
- ❌ `add_users_table.sql` (missing date and sequence)
- ❌ `20251003_001_Add_Users_Table.sql` (uppercase letters)

### Exit Codes

| Tool | Exit Code 0 | Exit Code 1 | Exit Code 2 |
|------|-------------|-------------|-------------|
| verify-schema | PASS (no diffs) | WARN/FAIL (diffs found) | ERROR (process failed) |
| generate-migration | Success | Validation error | Generation failed |
| rebuild-init-script | Success | Validation failed | Rebuild failed |
| validate-migrations | Valid | Invalid (errors) | Process failed |

### Environment Variables

```bash
# Database connection
export DATABASE_URL="postgresql://user:pass@localhost:5432/hr_development"

# Schema name (default: hr_public)
export DB_SCHEMA="hr_public"

# Migrations directory (default: ./migrations)
export MIGRATIONS_PATH="./migrations"

# Verification output directory (default: ./verification-reports)
export VERIFICATION_REPORTS_PATH="./verification-reports"
```

---

## Success Criteria Validation

After completing setup and initial verification, validate the following success criteria from the feature spec:

### ✅ Zero Schema Drift
```bash
npm run db:verify
# Expected: Verdict: PASS
```

### ✅ Fresh Setup Success Rate
```bash
# New developer can initialize database in < 5 minutes
dropdb hr_development && createdb hr_development
time npm run db:init
npm run dev
# Expected: Application loads without database errors
```

### ✅ Deployment Reliability
```bash
# Fresh environment setup
createdb hr_staging
psql hr_staging < migrations/00_init_schema.sql
npm run db:verify -- --environment=staging --database-url=postgresql://localhost/hr_staging
# Expected: Verdict: PASS on first attempt
```

### ✅ Migration Coverage
```bash
npm run db:validate-migrations
# Expected: 100% of tables traceable to init script or migration file
# No CHECKSUM_MISMATCH errors
```

### ✅ Documentation Completeness
```bash
# All 22 tables documented with creation source
cat migrations/00_init_schema.sql | grep "CREATE TABLE" | wc -l
# Expected: 22
```

---

## Troubleshooting

### Issue: "ERROR: database 'hr_development' already exists"

**Solution**: Drop and recreate:
```bash
dropdb hr_development
createdb hr_development
npm run db:init
```

### Issue: "Verification FAIL: Missing table 'bulk_rollback_batches'"

**Cause**: Init script is outdated.

**Solution**:
```bash
npm run db:rebuild-init
dropdb hr_development
createdb hr_development
psql hr_development < migrations/00_init_schema.sql
```

### Issue: "CHECKSUM_MISMATCH for applied migration"

**Cause**: Migration file was edited after being applied to database.

**Solution**:
```bash
# NEVER edit applied migrations!
# Revert to original:
git checkout migrations/20251001_003_create_departments.sql

# Create NEW migration with changes:
cat > migrations/20251003_014_update_departments_schema.sql <<EOF
BEGIN;
-- Additional changes here
COMMIT;
EOF
```

### Issue: "SQL syntax error in generated migration"

**Cause**: Complex schema changes require manual SQL.

**Solution**:
1. Review generated SQL carefully
2. Test in isolated database first:
   ```bash
   createdb hr_test_migration
   psql hr_test_migration < migrations/00_init_schema.sql
   psql hr_test_migration < migrations/remediation/20251003_001_complex_change.sql
   ```
3. Fix syntax errors manually
4. Re-validate before applying

---

## Next Steps

After completing this quickstart:

1. **Integrate into CI/CD**: Add schema verification to GitHub Actions (see Workflow 2)
2. **Set up pre-commit hooks**: Validate migrations before committing
3. **Schedule daily audits**: Detect drift early with cron jobs
4. **Train team**: Share this guide with all developers
5. **Document edge cases**: Add project-specific scenarios to this guide

---

**Quickstart Complete**: 2025-10-03
**All workflows validated and ready for use**
**Questions?** See the [full specification](./spec.md) or [implementation plan](./plan.md)
