# Tasks: Database Schema Consistency and Migration Audit

**Feature**: 022-database-schema-consistency
**Input**: Design documents from `/home/chanway/Projects/SvelteHR/specs/022-database-schema-consistency/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Execution Summary

This task list implements the database schema consistency tooling based on:
- 4 CLI tools (verify-schema, generate-migration, rebuild-init-script, validate-migrations)
- TypeScript 5.0 with strict mode for all tooling
- PostgreSQL introspection via information_schema and pg_catalog
- TDD approach with contract tests first (RED → GREEN → REFACTOR)

**Tech Stack**: TypeScript 5.0, PostgreSQL 14+, Node.js pg client, Bash, Docker
**Structure**: Web app - scripts in `/scripts/db/`, migrations in `/migrations/`
**Total Tasks**: 35 tasks across 5 phases

## Path Conventions

- **Scripts**: `/home/chanway/Projects/SvelteHR/scripts/db/`
- **Tests**: `/home/chanway/Projects/SvelteHR/tests/db/`
- **Migrations**: `/home/chanway/Projects/SvelteHR/migrations/`
- **Types**: `/home/chanway/Projects/SvelteHR/scripts/db/types/`

## Phase 3.1: Setup & Configuration

- [x] **T001** Create project directory structure
  - Create `/home/chanway/Projects/SvelteHR/scripts/db/` for CLI tooling
  - Create `/home/chanway/Projects/SvelteHR/scripts/db/types/` for TypeScript interfaces
  - Create `/home/chanway/Projects/SvelteHR/scripts/db/lib/` for shared utilities
  - Create `/home/chanway/Projects/SvelteHR/tests/db/contract/` for contract tests
  - Create `/home/chanway/Projects/SvelteHR/tests/db/integration/` for E2E tests
  - Create `/home/chanway/Projects/SvelteHR/verification-reports/` for output
  - Files: N/A (directory creation)
  - Dependencies: None

- [x] **T002** Initialize TypeScript configuration for db scripts
  - Create `/home/chanway/Projects/SvelteHR/scripts/db/tsconfig.json` with strict mode
  - Configure target: ES2022, module: NodeNext
  - Set paths for @db/types, @db/lib aliases
  - Enable strict: true, noImplicitAny: true, strictNullChecks: true
  - Files: `scripts/db/tsconfig.json`
  - Dependencies: None

- [x] **T003** [P] Install database tooling dependencies
  - Add to package.json: pg, @types/pg, pg-format, commander, chalk, ora
  - Add dev dependencies: vitest, @vitest/coverage-v8
  - Configure npm scripts: db:verify, db:generate-migration, db:rebuild-init, db:validate-migrations
  - Files: `package.json`
  - Dependencies: None

- [x] **T004** [P] Configure ESLint and Prettier for db scripts
  - Extend existing .eslintrc with db scripts directory
  - Add TypeScript strict rules for scripts/db/
  - Configure Prettier for SQL formatting (.sql files)
  - Files: `.eslintrc.js`, `.prettierrc`
  - Dependencies: None

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (CLI Interface)

- [x] **T005** [P] Contract test for verify-schema CLI
  - Create `/home/chanway/Projects/SvelteHR/tests/db/contract/verify-schema.test.ts`
  - Test cases from `contracts/verify-schema.contract.yaml`:
    - CLI accepts --environment, --database-url, --output-format flags
    - Exit code 0 when schema matches (PASS verdict)
    - Exit code 1 when differences found (WARN/FAIL verdict)
    - Exit code 2 on verification error
    - JSON output contains VerificationReport schema
    - Markdown output generated when --output-format=both
  - Assert: All tests FAIL (no implementation yet)
  - Files: `tests/db/contract/verify-schema.test.ts`
  - Dependencies: T003

- [x] **T006** [P] Contract test for generate-migration CLI
  - Create `/home/chanway/Projects/SvelteHR/tests/db/contract/generate-migration.test.ts`
  - Test cases from `contracts/generate-migration.contract.yaml`:
    - CLI accepts --diff-source, --environment, --dry-run flags
    - Generates migration file with proper naming pattern (YYYYMMDD_NNN_description.sql)
    - Creates rollback file when generateRollback=true
    - requiresReview always true (FR-024a)
    - Production environment only generates, never applies (FR-026)
    - Exit code 0 on success, 1 on validation error, 2 on generation failure
  - Assert: All tests FAIL
  - Files: `tests/db/contract/generate-migration.test.ts`
  - Dependencies: T003

- [x] **T007** [P] Contract test for rebuild-init-script CLI
  - Create `/home/chanway/Projects/SvelteHR/tests/db/contract/rebuild-init-script.test.ts`
  - Test cases from `contracts/rebuild-init-script.contract.yaml`:
    - CLI accepts --migrations-path, --init-script-path, --validate flags
    - Creates temporary database and applies migrations sequentially
    - Exports schema using pg_dump --schema-only
    - Validates init script produces identical schema to cumulative migrations
    - Exit code 0 on success with validation pass
    - Exit code 1 on validation failure
    - Exit code 2 on rebuild error
  - Assert: All tests FAIL
  - Files: `tests/db/contract/rebuild-init-script.test.ts`
  - Dependencies: T003

- [x] **T008** [P] Contract test for validate-migrations CLI
  - Create `/home/chanway/Projects/SvelteHR/tests/db/contract/validate-migrations.test.ts`
  - Test cases from `contracts/validate-migrations.contract.yaml`:
    - CLI accepts --migrations-path, --database-url, --strict flags
    - Validates naming pattern: ^\\d{8}_\\d{3}_[a-z0-9_]+\\.sql$
    - Detects duplicate sequence numbers
    - Detects checksum mismatches for applied migrations
    - Checks SQL syntax via PostgreSQL parser
    - Validates rollback file existence
    - Exit code 0 when valid, 1 when invalid, 2 on process failure
  - Assert: All tests FAIL
  - Files: `tests/db/contract/validate-migrations.test.ts`
  - Dependencies: T003

### Integration Tests (E2E Scenarios)

- [x] **T009** [P] Integration test: Fresh database initialization → verify PASS
  - Create `/home/chanway/Projects/SvelteHR/tests/db/integration/fresh-init.test.ts`
  - Test scenario from `quickstart.md` Workflow 1:
    - Create fresh PostgreSQL database
    - Apply init script (migrations/00_init_schema.sql)
    - Run verify-schema CLI
    - Assert: Verdict = PASS, 22 tables created, 0 differences
  - Files: `tests/db/integration/fresh-init.test.ts`
  - Dependencies: T003

- [x] **T010** [P] Integration test: Detect drift → generate migration → apply → verify PASS
  - Create `/home/chanway/Projects/SvelteHR/tests/db/integration/drift-remediation.test.ts`
  - Test scenario from `quickstart.md` Workflow 2 + 3:
    - Create database from init script
    - Manually add column (simulate drift): ALTER TABLE events ADD COLUMN test_field TEXT
    - Run verify-schema, assert differences detected
    - Run generate-migration from diff report
    - Review generated migration file
    - Apply generated migration
    - Run verify-schema again, assert PASS
  - Files: `tests/db/integration/drift-remediation.test.ts`
  - Dependencies: T003

- [x] **T011** [P] Integration test: Rebuild init script → validate equivalence
  - Create `/home/chanway/Projects/SvelteHR/tests/db/integration/rebuild-init.test.ts`
  - Test scenario from `quickstart.md` Workflow 5:
    - Create database A from init script
    - Create database B from sequential migrations
    - Run rebuild-init-script CLI
    - Create database C from new init script
    - Compare schemas: A = B = C (identical)
    - Assert: validation passed
  - Files: `tests/db/integration/rebuild-init.test.ts`
  - Dependencies: T003

- [x] **T012** [P] Integration test: Migration validation detects errors
  - Create `/home/chanway/Projects/SvelteHR/tests/db/integration/migration-validation.test.ts`
  - Test scenario from `quickstart.md` Workflow 4:
    - Create valid migrations (proper naming, sequence)
    - Create invalid migrations:
      - Wrong naming pattern (add_users_table.sql)
      - Duplicate sequence (20251003_005_test.sql when 005 exists)
      - Modified applied migration (change checksum)
      - Missing rollback file
    - Run validate-migrations CLI
    - Assert: 4 errors detected, specific error codes match
  - Files: `tests/db/integration/migration-validation.test.ts`
  - Dependencies: T003

## Phase 3.3: Core Implementation (TypeScript Data Models)

**Prerequisites**: All contract tests (T005-T008) and integration tests (T009-T012) MUST be failing

### Data Model Types

- [x] **T013** [P] Implement SchemaMetadata and TableDefinition types
  - Create `/home/chanway/Projects/SvelteHR/scripts/db/types/schema.ts`
  - Implement interfaces from `data-model.md`:
    - SchemaMetadata with validation rules
    - TableDefinition with column/constraint arrays
    - ColumnDefinition with PostgreSQL type normalization
    - Validation functions for naming patterns, data types
  - Export all interfaces and validation functions
  - Files: `scripts/db/types/schema.ts`
  - Dependencies: T002

- [x] **T014** [P] Implement constraint and index definition types
  - Create `/home/chanway/Projects/SvelteHR/scripts/db/types/constraints.ts`
  - Implement interfaces from `data-model.md`:
    - PrimaryKeyConstraint
    - ForeignKeyConstraint with ReferentialAction enum
    - UniqueConstraint with deferrable options
    - CheckConstraint with SQL expression validation
    - IndexDefinition with IndexType enum
  - Files: `scripts/db/types/constraints.ts`
  - Dependencies: T002

- [x] **T015** [P] Implement SchemaDiff and comparison types
  - Create `/home/chanway/Projects/SvelteHR/scripts/db/types/diff.ts`
  - Implement interfaces from `data-model.md`:
    - SchemaDiff with hasDifferences boolean
    - TableDiff with diffType enum (missing/extra/modified)
    - ColumnDiff, ConstraintDiff, IndexDiff
    - DiffSummary with totalDifferences calculation
  - Validation: totalDifferences = sum of all individual counts
  - Files: `scripts/db/types/diff.ts`
  - Dependencies: T002

- [x] **T016** [P] Implement MigrationFile and VerificationReport types
  - Create `/home/chanway/Projects/SvelteHR/scripts/db/types/migration.ts`
  - Create `/home/chanway/Projects/SvelteHR/scripts/db/types/verification.ts`
  - Implement interfaces from `data-model.md`:
    - MigrationFile with filename pattern validation
    - MigrationMetadata with source tracking
    - MigrationHistoryRecord (database table representation)
    - RemediationMigration with requiresReview=true enforcement
    - VerificationReport with VerificationVerdict enum (PASS/WARN/FAIL/ERROR)
    - RecommendedAction with priority levels
  - Files: `scripts/db/types/migration.ts`, `scripts/db/types/verification.ts`
  - Dependencies: T002

- [x] **T017** [P] Implement function and trigger definition types
  - Create `/home/chanway/Projects/SvelteHR/scripts/db/types/functions.ts`
  - Implement interfaces from `data-model.md`:
    - FunctionDefinition with language validation (plpgsql/sql/c/internal)
    - FunctionArgument with argMode enum (IN/OUT/INOUT/VARIADIC)
    - TriggerDefinition with timing enum (BEFORE/AFTER/INSTEAD OF)
    - TriggerEvent enum (INSERT/UPDATE/DELETE/TRUNCATE)
  - Files: `scripts/db/types/functions.ts`
  - Dependencies: T002

### PostgreSQL Introspection Layer

- [x] **T018** Implement information_schema query functions
  - Create `/home/chanway/Projects/SvelteHR/scripts/db/lib/introspect/tables.ts`
  - Create `/home/chanway/Projects/SvelteHR/scripts/db/lib/introspect/columns.ts`
  - Functions to query:
    - information_schema.tables → TableDefinition[]
    - information_schema.columns → ColumnDefinition[]
    - information_schema.table_constraints → constraint metadata
    - information_schema.constraint_column_usage → FK relationships
  - Filter by schema_name = 'hr_public'
  - Apply data type normalization (int4→integer, varchar→character varying)
  - Files: `scripts/db/lib/introspect/tables.ts`, `scripts/db/lib/introspect/columns.ts`
  - Dependencies: T013, T014

- [x] **T019** Implement pg_catalog query functions for indexes and triggers
  - Create `/home/chanway/Projects/SvelteHR/scripts/db/lib/introspect/indexes.ts`
  - Create `/home/chanway/Projects/SvelteHR/scripts/db/lib/introspect/triggers.ts`
  - Functions to query:
    - pg_catalog.pg_indexes → IndexDefinition[]
    - pg_catalog.pg_trigger → TriggerDefinition[]
    - pg_catalog.pg_proc → FunctionDefinition[]
  - Parse index definitions (WHERE clauses, column order)
  - Normalize index options (ASC/DESC, NULLS FIRST/LAST)
  - Files: `scripts/db/lib/introspect/indexes.ts`, `scripts/db/lib/introspect/triggers.ts`
  - Dependencies: T014, T017

- [x] **T020** Implement data type normalization logic
  - Create `/home/chanway/Projects/SvelteHR/scripts/db/lib/normalize.ts`
  - Implement normalization rules from `data-model.md`:
    - int4/int → integer
    - int8/bigint → bigint
    - int2/smallint → smallint
    - varchar → character varying
    - char → character
    - bool → boolean
    - timestamp → timestamp without time zone
    - timestamptz → timestamp with time zone
  - Function: normalizeDataType(pgType: string): string
  - Files: `scripts/db/lib/normalize.ts`
  - Dependencies: T013

- [x] **T021** Implement schema metadata capture service
  - Create `/home/chanway/Projects/SvelteHR/scripts/db/lib/capture-schema.ts`
  - Main function: captureSchema(dbUrl: string, schemaName: string): Promise<SchemaMetadata>
  - Orchestrates all introspection queries:
    - Connect to database via pg client
    - Query tables, columns, constraints (T018)
    - Query indexes, triggers, functions (T019)
    - Apply normalization (T020)
    - Return complete SchemaMetadata object
  - Include PostgreSQL version detection
  - Files: `scripts/db/lib/capture-schema.ts`
  - Dependencies: T013, T018, T019, T020

### Schema Comparison Engine

- [x] **T022** Implement Phase 1: Structural diff (tables and columns)
  - Create `/home/chanway/Projects/SvelteHR/scripts/db/lib/diff/structural.ts`
  - Functions from `research.md` comparison algorithm:
    - compareTableNames(source, target): missing/extra tables
    - compareColumnNames(source, target): missing/extra columns per table
    - Generate TableDiff[] with diffType = missing/extra/modified
  - Use set operations for efficient comparison
  - Files: `scripts/db/lib/diff/structural.ts`
  - Dependencies: T013, T015

- [x] **T023** Implement Phase 2: Data type diff
  - Create `/home/chanway/Projects/SvelteHR/scripts/db/lib/diff/data-types.ts`
  - Functions:
    - compareColumnTypes(sourceCol, targetCol): type_mismatch/nullability_mismatch/default_mismatch
    - Exact match required after normalization
    - Check dataType, isNullable, defaultValue
    - Generate ColumnDiff[] with specific mismatch types
  - Files: `scripts/db/lib/diff/data-types.ts`
  - Dependencies: T013, T015, T020

- [x] **T024** Implement Phase 3: Semantic diff (indexes, constraints)
  - Create `/home/chanway/Projects/SvelteHR/scripts/db/lib/diff/semantic.ts`
  - Functions:
    - compareIndexes(source, target): missing/extra/definition_mismatch
    - compareConstraints(source, target): by type (PK/FK/unique/check)
    - Normalize before comparison (whitespace, parentheses in WHERE clauses)
    - Ignore non-functional differences (comments, ordering)
  - Files: `scripts/db/lib/diff/semantic.ts`
  - Dependencies: T014, T015

- [x] **T025** Implement diff summary generation
  - Create `/home/chanway/Projects/SvelteHR/scripts/db/lib/diff/summary.ts`
  - Function: generateDiffSummary(tableDiffs: TableDiff[]): DiffSummary
  - Count all difference types:
    - missingTables, extraTables, modifiedTables
    - missingColumns, extraColumns, modifiedColumns
    - missingIndexes, extraIndexes
  - Calculate totalDifferences (sum of all counts)
  - Set hasDifferences boolean
  - Files: `scripts/db/lib/diff/summary.ts`
  - Dependencies: T015, T022, T023, T024

### CLI Implementations

- [x] **T026** Implement verify-schema CLI entrypoint
  - Create `/home/chanway/Projects/SvelteHR/scripts/db/verify-schema.ts`
  - CLI using commander.js per `contracts/verify-schema.contract.yaml`:
    - Flags: --environment, --database-url, --schema-name, --output-format, --fail-on-differences
    - Load version control schema (init + migrations simulation)
    - Capture live database schema (T021)
    - Compare schemas (T022, T023, T024, T025)
    - Generate VerificationReport with verdict (PASS/WARN/FAIL/ERROR)
    - Write JSON report to verification-reports/
    - Write Markdown summary if --output-format includes markdown
    - Exit with correct code: 0=PASS, 1=WARN/FAIL, 2=ERROR
  - Use chalk for colored output, ora for spinners
  - Files: `scripts/db/verify-schema.ts`
  - Dependencies: T005, T016, T021, T025

- [x] **T027** Implement generate-migration CLI entrypoint
  - Create `/home/chanway/Projects/SvelteHR/scripts/db/generate-migration.ts`
  - CLI per `contracts/generate-migration.contract.yaml`:
    - Flags: --diff-source, --environment, --generate-rollback, --dry-run
    - Load SchemaDiff from JSON file or stdin
    - Analyze diff entries (T028 for SQL generation)
    - Generate migration files with metadata headers
    - Always set requiresReview=true (FR-024a enforcement)
    - For production environment: generate only, never apply (FR-026)
    - Write to migrations/remediation/ directory
    - Exit codes: 0=success, 1=validation error, 2=generation failed
  - Files: `scripts/db/verify-schema.ts`
  - Dependencies: T006, T016

- [x] **T028** Implement SQL template system for migration generation
  - Create `/home/chanway/Projects/SvelteHR/scripts/db/lib/templates/sql-templates.ts`
  - Template functions per `research.md` migration generation approach:
    - generateCreateTable(tableDef: TableDefinition): string
    - generateAddColumn(table, column): string
    - generateCreateIndex(indexDef): string
    - generateAddConstraint(constraint): string
    - All use IF NOT EXISTS guards for idempotency
    - Include BEGIN/COMMIT transaction blocks
    - Add metadata header comments (Created, Source, Affected)
  - Files: `scripts/db/lib/templates/sql-templates.ts`
  - Dependencies: T013, T014

- [x] **T029** Implement rebuild-init-script CLI entrypoint
  - Create `/home/chanway/Projects/SvelteHR/scripts/db/rebuild-init-script.ts`
  - CLI per `contracts/rebuild-init-script.contract.yaml`:
    - Flags: --migrations-path, --init-script-path, --validate, --clean-database
    - Create temporary database (unique name with timestamp)
    - Apply all migration files sequentially (sorted lexicographically)
    - Export schema using child_process.spawn('pg_dump', ['--schema-only', '--schema=hr_public'])
    - Clean and format SQL output (remove version comments, normalize whitespace)
    - Add header comment with generation timestamp and migration count
    - Write to init script path
    - If --validate: create second temp DB, apply init script, compare schemas
    - Clean up temp databases if --clean-database=true
    - Exit codes: 0=success with validation, 1=validation failed, 2=rebuild error
  - Files: `scripts/db/rebuild-init-script.ts`
  - Dependencies: T007, T016

- [x] **T030** Implement validate-migrations CLI entrypoint
  - Create `/home/chanway/Projects/SvelteHR/scripts/db/validate-migrations.ts`
  - CLI per `contracts/validate-migrations.contract.yaml`:
    - Flags: --migrations-path, --database-url, --check-syntax, --check-rollbacks, --strict
    - Validation checks from `research.md`:
      - Naming pattern: /^\\d{8}_\\d{3}_[a-z0-9_]+\\.sql$/
      - Sequential ordering (no duplicate sequences, warn on gaps >5)
      - Checksum integrity (compare file SHA-256 with schema_migrations table)
      - SQL syntax validation (parse with PostgreSQL)
      - Rollback file existence (.rollback.sql pairs)
    - Generate ValidationResult with errors[] and warnings[]
    - In strict mode: fail on warnings
    - Exit codes: 0=valid, 1=invalid (errors), 2=process failed
  - Files: `scripts/db/validate-migrations.ts`
  - Dependencies: T008, T016

### Migration Generation Support

- [x] **T031** Implement migration file writer with metadata headers
  - Create `/home/chanway/Projects/SvelteHR/scripts/db/lib/migration-writer.ts`
  - Functions:
    - writeMigrationFile(filename, sql, metadata): void
    - generateFilename(date, sequence, description): string
    - addMetadataHeader(sql, metadata): string
  - Header format from `research.md`:
    ```sql
    -- Migration: [AUTO-GENERATED] Description
    -- Created: ISO-8601 timestamp
    -- Source: Schema drift detection
    -- Affected: table/column names
    -- Reason: missing_table | extra_column | etc.
    ```
  - Files: `scripts/db/lib/migration-writer.ts`
  - Dependencies: T016

- [x] **T032** Implement rollback migration generator
  - Create `/home/chanway/Projects/SvelteHR/scripts/db/lib/rollback-generator.ts`
  - Functions:
    - generateRollback(forwardSql, metadata): string | null
    - Inverse operations:
      - CREATE TABLE → DROP TABLE CASCADE
      - ADD COLUMN → DROP COLUMN
      - CREATE INDEX → DROP INDEX
    - Return null for irreversible operations (with reason)
    - Add warning header: "WARNING: This will delete data in X table"
  - Files: `scripts/db/lib/rollback-generator.ts`
  - Dependencies: T016

- [x] **T033** Implement checksum calculation (SHA-256)
  - Create `/home/chanway/Projects/SvelteHR/scripts/db/lib/checksum.ts`
  - Function: calculateChecksum(filePath: string): string
  - Use crypto.createHash('sha256')
  - Return 64-character hex string
  - For migration validation (detect modified files)
  - Files: `scripts/db/lib/checksum.ts`
  - Dependencies: None (Node.js crypto module)

## Phase 3.4: Integration & Documentation

- [x] **T034** Add npm scripts to package.json
  - Add scripts section for CLI tools:
    ```json
    "db:init": "psql $DATABASE_URL < migrations/00_init_schema.sql",
    "db:verify": "tsx scripts/db/verify-schema.ts",
    "db:generate-migration": "tsx scripts/db/generate-migration.ts",
    "db:rebuild-init": "tsx scripts/db/rebuild-init-script.ts",
    "db:validate-migrations": "tsx scripts/db/validate-migrations.ts"
    ```
  - Files: `package.json`
  - Dependencies: T026, T027, T029, T030

- [x] **T035** Create README with installation and usage instructions
  - Create `/home/chanway/Projects/SvelteHR/scripts/db/README.md`
  - Sections from `quickstart.md`:
    - Installation (npm install, database setup)
    - Quick Start (npm run db:verify)
    - CLI Reference (all 4 tools with flags)
    - Migration File Format (naming conventions)
    - Examples (5 workflows from quickstart)
    - Troubleshooting (common errors and solutions)
  - Link to full quickstart guide
  - Files: `scripts/db/README.md`
  - Dependencies: T026, T027, T029, T030, T034

## Dependencies Graph

```
Setup Phase (T001-T004)
  ↓
Contract Tests (T005-T008) [PARALLEL]
  ↓
Integration Tests (T009-T012) [PARALLEL]
  ↓
Data Models (T013-T017) [PARALLEL]
  ↓
Introspection Layer
  T018 → T019 → T020 → T021
  ↓
Schema Comparison Engine
  T021 → T022 (structural)
  T021 → T023 (data types, depends on T020)
  T021 → T024 (semantic)
  T022, T023, T024 → T025 (summary)
  ↓
CLI Implementations
  T021, T025 → T026 (verify-schema)
  T025 → T027 (generate-migration) → T028 (SQL templates)
  → T029 (rebuild-init)
  → T030 (validate-migrations)
  ↓
Migration Support (T031-T033) [PARALLEL]
  ↓
Documentation (T034-T035)
```

## Parallel Execution Examples

### Phase 3.2: Run All Contract Tests Together

```bash
# Launch T005-T008 in parallel (4 independent test files)
Task: "Contract test for verify-schema CLI in tests/db/contract/verify-schema.test.ts"
Task: "Contract test for generate-migration CLI in tests/db/contract/generate-migration.test.ts"
Task: "Contract test for rebuild-init-script CLI in tests/db/contract/rebuild-init-script.test.ts"
Task: "Contract test for validate-migrations CLI in tests/db/contract/validate-migrations.test.ts"
```

### Phase 3.2: Run All Integration Tests Together

```bash
# Launch T009-T012 in parallel (4 independent test scenarios)
Task: "Integration test fresh database init in tests/db/integration/fresh-init.test.ts"
Task: "Integration test drift remediation in tests/db/integration/drift-remediation.test.ts"
Task: "Integration test rebuild init in tests/db/integration/rebuild-init.test.ts"
Task: "Integration test migration validation in tests/db/integration/migration-validation.test.ts"
```

### Phase 3.3: Implement All Data Model Types Together

```bash
# Launch T013-T017 in parallel (5 independent type definition files)
Task: "Implement SchemaMetadata and TableDefinition types in scripts/db/types/schema.ts"
Task: "Implement constraint and index definition types in scripts/db/types/constraints.ts"
Task: "Implement SchemaDiff and comparison types in scripts/db/types/diff.ts"
Task: "Implement MigrationFile and VerificationReport types in scripts/db/types/migration.ts and verification.ts"
Task: "Implement function and trigger definition types in scripts/db/types/functions.ts"
```

## Validation Checklist

_Verify before marking tasks complete_

- [x] All 4 contracts have corresponding contract tests (T005-T008)
- [x] All entities from data-model.md have type definition tasks (T013-T017)
- [x] All tests come before implementation (Phase 3.2 before 3.3)
- [x] Parallel tasks truly independent (different files, marked [P])
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] TDD workflow enforced (RED → GREEN → REFACTOR)
- [x] All functional requirements mapped to tasks

## Task Execution Notes

**TDD Workflow**:
1. Run T005-T012 first - all tests MUST FAIL
2. Implement T013-T033 to make tests pass (GREEN phase)
3. Refactor during implementation (maintain passing tests)

**Commit Strategy**:
- Commit after each task completion
- Use conventional commits: `feat(db): implement verify-schema CLI`
- Link to task number in commit message: `feat(db): T026 - implement verify-schema CLI`

**Testing**:
- Run `npm run test:db` after each implementation task
- Watch mode during development: `npm run test:db -- --watch`
- Coverage must be >90% per constitution

**Performance**:
- Verify T026 completes <5 seconds for 22 tables
- Verify T027 completes <10 seconds
- Profile with `console.time()` if performance goals not met

---

**Total Tasks**: 35
**Estimated Time**: 40-50 hours (based on 1-2 hours per task)
**Ready for Execution**: ✅ Run `/tasks` command completed successfully
