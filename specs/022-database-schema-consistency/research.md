# Research: Database Schema Consistency and Migration Audit

**Feature**: 022-database-schema-consistency
**Date**: 2025-10-03
**Status**: Complete

## Research Questions

### 1. PostgreSQL Schema Introspection Methods

**Question**: What is the most reliable method to extract complete schema information from PostgreSQL programmatically?

**Decision**: Use `information_schema` and `pg_catalog` system catalogs with TypeScript/Node.js pg client

**Rationale**:
- `information_schema.tables` provides portable cross-database table metadata
- `information_schema.columns` gives complete column definitions with data types
- `information_schema.table_constraints` and `information_schema.constraint_column_usage` provide full constraint information
- `pg_catalog.pg_indexes` provides index definitions
- `pg_catalog.pg_trigger` and `pg_catalog.pg_proc` for functions/triggers
- Standard SQL queries, highly reliable, well-documented
- Can be executed with read-only database permissions
- Outputs can be easily compared programmatically

**Alternatives Considered**:
- **pg_dump with --schema-only**: Produces SQL which is harder to parse/compare programmatically, but excellent for generating initialization scripts
- **pg_describe_object()**: Lower-level, more complex to use
- **psql \d commands**: Not programmatic, requires parsing output

**Implementation Notes**:
- Use both approaches: `information_schema` for comparison, `pg_dump` for init script generation
- Query order: tables → columns → constraints → indexes → functions/triggers
- Filter by schema name ('hr_public') to avoid system tables

### 2. Migration File Naming and Versioning Strategy

**Question**: How should migration files be numbered and tracked to ensure consistent ordering?

**Decision**: Timestamp-based naming with sequential numbering: `YYYYMMDD_NNN_description.sql`

**Rationale**:
- Current project already uses this pattern (e.g., `20251003_003_add_rollback_requests_requested_at_index.sql`)
- Timestamp prefix provides chronological ordering
- Sequential number within day prevents conflicts
- Description suffix makes purpose clear
- Lexicographical sorting matches execution order
- Compatible with existing migration tools (Flyway, Liquibase patterns)

**Alternatives Considered**:
- **Auto-incrementing integers**: Conflict risk when multiple developers work in parallel
- **Git commit hashes**: Not human-readable, harder to maintain order
- **UUID-based**: No inherent ordering

**Implementation Notes**:
- Validate naming pattern: `^\d{8}_\d{3}_[a-z0-9_]+\.sql$`
- Track applied migrations in `schema_migrations` table (if doesn't exist, create it)
- Migration files must be immutable after applied to non-dev environments

### 3. Schema Comparison Algorithm

**Question**: What algorithm provides accurate, human-readable schema difference detection?

**Decision**: Three-phase comparison: structural diff → data type diff → semantic diff

**Rationale**:
- **Phase 1 - Structural**: Compare table names, column names, constraint names (simple set operations)
- **Phase 2 - Data Types**: Compare column data types, default values, nullability (exact match required)
- **Phase 3 - Semantic**: Compare indexes, foreign key relationships, check constraints (normalize before compare)
- Produces categorized diff report: missing, extra, modified
- Can generate remediation SQL from diff results
- Supports incremental reporting (fail fast on critical diffs)

**Alternatives Considered**:
- **SQL dump string comparison**: Brittle, whitespace-sensitive, order-dependent
- **Checksumming table DDL**: Loses granularity of what changed
- **Database diffing tools (migra, apgdiff)**: External dependencies, less control

**Implementation Notes**:
- Normalize data types (e.g., `int4` = `integer`, `varchar` = `character varying`)
- Ignore non-functional differences (comments, whitespace, ordering)
- Report format: JSON for programmatic use, Markdown for human review
- Exit codes: 0 = identical, 1 = differences found, 2 = error

### 4. Migration Generation Approach

**Question**: How should missing migration files be automatically generated from schema drift?

**Decision**: Template-based SQL generation with metadata comments

**Rationale**:
- Generate CREATE/ALTER statements based on drift type (missing table, missing column, etc.)
- Include metadata header: creation timestamp, source (auto-generated), affected objects
- Use parameterized templates for common operations (ADD COLUMN, CREATE TABLE, CREATE INDEX)
- Output idempotent SQL (`IF NOT EXISTS` where supported)
- Never auto-apply - always require manual review

**Alternatives Considered**:
- **Copy existing DDL verbatim**: May not be idempotent or reversible
- **Fully automated application**: Violates safety requirements (FR-024a)
- **Manual-only approach**: Too error-prone for large discrepancies

**Implementation Notes**:
- Migration file template:
  ```sql
  -- Migration: [AUTO-GENERATED] [Description]
  -- Created: [ISO-8601 timestamp]
  -- Source: Schema drift detection
  -- Affected: [table/column/constraint names]

  BEGIN;

  [Generated DDL with IF NOT EXISTS guards]

  COMMIT;
  ```
- Generate corresponding rollback migration where possible
- For production drift: only generate, never apply (FR-026)

### 5. CI/CD Integration Pattern

**Question**: How should schema verification integrate into existing CI/CD pipelines without blocking deployments?

**Decision**: GitHub Actions workflow with informational status checks

**Rationale**:
- Add new workflow: `.github/workflows/schema-verify.yml`
- Runs on: pull requests, pushes to main, scheduled (daily)
- Connect to staging database (not production per FR-009)
- Generate verification report as workflow artifact
- Post comment on PR with summary (pass/fail/differences found)
- Set check status to "neutral" (warning) on drift, not "failure"
- Allows merge but surfaces issues

**Alternatives Considered**:
- **Blocking check**: Would prevent urgent hotfixes (rejected per FR-009a)
- **Manual-only verification**: Relies on developer discipline
- **Pre-commit hooks**: Too slow for large schema checks

**Implementation Notes**:
- Use GitHub Actions matrix for multiple environments (dev, staging)
- Cache database connection credentials in GitHub Secrets
- Artifact retention: 30 days for audit trail
- Slack/email notifications on drift detection (optional)

### 6. Initialization Script Maintenance Strategy

**Question**: How should the initialization script stay synchronized with migration files?

**Decision**: Automated rebuild from cumulative migrations with validation

**Rationale**:
- Initialization script (`init-schema.sql`) = sum of all migrations applied sequentially
- Regenerate init script when new migration is merged to main branch
- Validation: apply init script to fresh DB, apply all migrations to fresh DB, compare results
- Both paths must produce identical schema (FR-002)
- Automated check in CI/CD ensures they stay in sync

**Alternatives Considered**:
- **Manual updates to init script**: Error-prone, guaranteed to drift
- **Init script only (no migrations)**: Loses change history and rollback capability
- **Migrations only (no init script)**: Slow initial setup (25+ sequential migrations)

**Implementation Notes**:
- Script: `scripts/db/rebuild-init-schema.sh`
- Process:
  1. Create temp database
  2. Apply all migrations sequentially
  3. Export schema with `pg_dump --schema-only`
  4. Clean and format output
  5. Write to `migrations/00_init_schema.sql`
  6. Validate by comparing to applying init script directly

### 7. Migration Rollback Documentation

**Question**: How should rollback procedures be documented and validated per FR-013?

**Decision**: Paired migration files with automated rollback test generation

**Rationale**:
- For each forward migration `YYYYMMDD_NNN_description.sql`, create `YYYYMMDD_NNN_description.rollback.sql`
- Rollback migrations stored in `migrations/rollbacks/` subdirectory
- Automated test: apply forward migration, apply rollback, verify schema matches original
- Some migrations inherently non-rollbackable (data deletion, column drops) - document with `-- ROLLBACK: NOT POSSIBLE - [reason]`

**Alternatives Considered**:
- **Embedded rollback in same file**: Harder to execute, mixing concerns
- **No rollback migrations**: Violates FR-013, risky for production
- **Transactional DDL only**: Not all PostgreSQL DDL is transactional

**Implementation Notes**:
- Rollback validation test suite in `tests/migrations/rollback.test.ts`
- Test structure:
  1. Take schema snapshot
  2. Apply forward migration
  3. Apply rollback migration
  4. Compare snapshot to current schema
  5. Assert: identical (or document acceptable differences)

## Technology Stack Decisions

### Primary Language: TypeScript (Node.js)

**Chosen**: TypeScript 5.0 with Node.js 18+ for all tooling scripts

**Rationale**:
- Matches project's existing technology stack (SvelteKit, TypeScript)
- Excellent PostgreSQL client libraries (`pg`, `pg-promise`)
- Strong typing for schema metadata
- Can reuse existing TypeScript compilation pipeline
- Native JSON handling for report generation

### Testing Framework: Vitest

**Chosen**: Vitest 3.2.3 (project standard)

**Rationale**:
- Already used in project for unit tests
- Fast execution, watch mode for development
- TypeScript support out of the box
- Can test both Node.js scripts and database interactions
- Coverage reporting built-in

### Schema Comparison Library: Custom Implementation

**Chosen**: Custom TypeScript comparison logic (not using external diff library)

**Rationale**:
- Domain-specific comparison needs (PostgreSQL schema semantics)
- Normalization requirements (data type aliases, etc.)
- Need control over diff format and reporting
- Relatively simple logic (set operations on table/column lists)
- Avoids external dependency

### Documentation Format: Markdown + JSON

**Chosen**: Markdown for human reports, JSON for programmatic reports

**Rationale**:
- Markdown integrates with GitHub, easy to read in PRs
- JSON enables automation (CI/CD parsing, notifications)
- Dual output supports both developer UX and tooling integration

## Risk Analysis

### Risk 1: Existing Migration Files May Be Invalid

**Likelihood**: Medium
**Impact**: High
**Mitigation**:
- First audit pass will identify any historical inconsistencies
- Generated remediation migrations will document missing changes
- Validation tests ensure future migrations maintain consistency

### Risk 2: Performance Impact on CI/CD

**Likelihood**: Low
**Impact**: Medium
**Mitigation**:
- Schema comparison is read-only, no locks
- Estimated <5 seconds for 22 tables
- Runs in parallel with other CI checks
- Can be made optional/manual for urgent deploys

### Risk 3: Migration Numbering Conflicts

**Likelihood**: Medium (multiple developers)
**Impact**: Low
**Mitigation**:
- Timestamp+sequence pattern reduces conflicts
- Pre-commit hook to check for duplicate numbers
- CI check for sequential ordering
- Clear documentation on migration naming

## Implementation Constraints

1. **No production database access**: Tooling must work with development and staging only (FR-009, FR-026)
2. **Manual review gate**: All generated migrations require explicit approval before application (FR-024a)
3. **Non-blocking CI**: Schema verification warns but doesn't prevent merges (FR-009a)
4. **Backward compatibility**: Must work with existing 25+ migration files without modification
5. **Idempotency**: Generated migrations must be safe to run multiple times where possible (FR-012)

## Success Criteria Mapping

| Success Metric | Implementation Approach |
|----------------|------------------------|
| Zero Schema Drift | Automated verification tool runs in CI/CD, reports differences |
| Fresh Setup Success | Comprehensive README with validated init script |
| Deployment Reliability | Init script = cumulative migrations (automated validation) |
| Migration Coverage | Audit identifies and documents all undocumented changes |
| Documentation Completeness | CHANGELOG auto-generated from migration file headers |

## Next Steps (Phase 1)

1. Design data model for schema metadata representation
2. Define API contracts (CLI interface for verification tool)
3. Generate contract tests for verification tool
4. Create quickstart guide for running verification
5. Update CLAUDE.md with database tooling patterns

---

**Research Complete**: 2025-10-03
**All technical unknowns resolved**
**Ready for Phase 1: Design & Contracts**
