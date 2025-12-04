# Database Schema Consistency Tools

**Feature**: 022-database-schema-consistency
**Version**: 1.0.0
**Last Updated**: 2025-10-03

## Overview

This directory contains TypeScript-based CLI tools for maintaining database schema consistency in the SvelteHR project. These tools ensure that your PostgreSQL database schema matches version control exactly, enabling reliable deployments and reproducible environments.

### Key Features

- ✅ **Schema Verification**: Detect drift between database and version control
- ✅ **Migration Generation**: Auto-generate migrations from detected drift
- ✅ **Init Script Rebuilding**: Keep initialization script synchronized with migrations
- ✅ **Migration Validation**: Ensure migration files follow conventions and integrity checks
- ✅ **Constitutional Compliance**: Enforces FR-024a (manual review) and FR-026 (production safety)

## Prerequisites

- **PostgreSQL** 14+ installed and running
- **Node.js** 18+ with npm
- **TypeScript** 5.0+
- **tsx** runtime (installed via devDependencies)
- Database credentials for target environments

## Installation

```bash
# From repository root
npm install

# Verify installation
npm run db:verify -- --help
```

## Quick Start

### 1. Verify Database Schema

```bash
npm run db:verify -- \
  --environment=development \
  --database-url=$DATABASE_URL
```

### 2. Generate Migration from Drift

```bash
npm run db:generate-migration -- \
  --diff-source=./verification-reports/2025-10-03-development.json \
  --environment=development
```

### 3. Validate Migration Files

```bash
npm run db:validate-migrations -- \
  --migrations-path=./migrations \
  --strict
```

### 4. Rebuild Init Script

```bash
npm run db:rebuild-init -- \
  --migrations-path=./migrations \
  --init-script-path=./migrations/00_init_schema.sql \
  --validate
```

## CLI Tools Reference

### 1. verify-schema

**Purpose**: Verify that database schema matches version control (init script + migrations).

**Usage**:

```bash
tsx scripts/db/verify-schema.ts [options]
```

**Options**:
| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--environment` | string | `development` | Environment: development, staging, production |
| `--database-url` | string | `$DATABASE_URL` | PostgreSQL connection URL |
| `--schema-name` | string | `hr_public` | PostgreSQL schema to verify |
| `--migrations-path` | string | `./migrations` | Path to migration files directory |
| `--init-script-path` | string | `./migrations/00_init_schema.sql` | Path to init script |
| `--output-format` | string | `both` | Output format: json, markdown, both |
| `--output-path` | string | `./verification-reports` | Directory for reports |
| `--fail-on-differences` | boolean | `true` | Exit code 1 if differences found |

**Exit Codes**:

- `0`: PASS - No differences detected
- `1`: WARN/FAIL - Differences detected
- `2`: ERROR - Process failed (connection error, etc.)

**Example**:

```bash
npm run db:verify -- \
  --environment=staging \
  --database-url=postgresql://user:pass@localhost:5432/hr_staging \
  --output-format=both
```

**Output Files**:

- `verification-reports/YYYY-MM-DD-environment.json` - Full report
- `verification-reports/YYYY-MM-DD-environment.md` - Human-readable summary

---

### 2. generate-migration

**Purpose**: Generate migration files from schema drift detected by verify-schema.

**Usage**:

```bash
tsx scripts/db/generate-migration.ts [options]
```

**Options**:
| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--diff-source` | string | **required** | Path to diff report JSON file |
| `--environment` | string | `development` | Target environment (affects safety checks) |
| `--migrations-path` | string | `./migrations` | Directory to write migration files |
| `--remediation-subdir` | string | `remediation` | Subdirectory for auto-generated files |
| `--generate-rollback` | boolean | `true` | Generate corresponding rollback migration |
| `--dry-run` | boolean | `false` | Preview migration without writing files |

**Exit Codes**:

- `0`: Success - Migrations generated
- `1`: Validation error - Invalid diff source
- `2`: Generation failed - Unable to create migrations

**Constitutional Requirements**:

- **FR-024a**: All generated migrations are marked `requiresReview: true`
- **FR-026**: Production environment generates but NEVER auto-applies migrations

**Example**:

```bash
npm run db:generate-migration -- \
  --diff-source=./verification-reports/2025-10-03-development.json \
  --environment=development \
  --dry-run
```

**Generated Files**:

- `migrations/remediation/YYYYMMDD_NNN_description.sql` - Forward migration
- `migrations/remediation/YYYYMMDD_NNN_description.rollback.sql` - Rollback migration

---

### 3. rebuild-init-script

**Purpose**: Rebuild initialization script from cumulative migrations (FR-002 compliance).

**Usage**:

```bash
tsx scripts/db/rebuild-init-script.ts [options]
```

**Options**:
| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--migrations-path` | string | `./migrations` | Path to migration files directory |
| `--init-script-path` | string | `./migrations/00_init_schema.sql` | Path to write init script |
| `--validate` | boolean | `false` | Validate that init script matches migrations |
| `--clean-database` | boolean | `true` | Drop temporary database after completion |
| `--database-url` | string | `$DATABASE_URL` | PostgreSQL connection URL for validation |

**Exit Codes**:

- `0`: Success - Init script rebuilt and validated
- `1`: Validation failed - Init script ≠ migrations
- `2`: Rebuild error - Process failed

**How It Works**:

1. Creates temporary database with unique timestamp name
2. Applies all migration files sequentially (sorted lexicographically)
3. Exports schema using `pg_dump --schema-only --schema=hr_public`
4. Formats and writes init script with header metadata
5. (Optional) Validates by comparing init script schema to cumulative migration schema
6. Cleans up temporary databases

**Example**:

```bash
npm run db:rebuild-init -- \
  --validate \
  --database-url=postgresql://localhost/postgres
```

---

### 4. validate-migrations

**Purpose**: Validate migration files for naming conventions, sequencing, and integrity.

**Usage**:

```bash
tsx scripts/db/validate-migrations.ts [options]
```

**Options**:
| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--migrations-path` | string | `./migrations` | Path to migration files directory |
| `--database-url` | string | `$DATABASE_URL` | PostgreSQL connection URL for checksums |
| `--check-syntax` | boolean | `false` | Validate SQL syntax (requires DB connection) |
| `--check-rollbacks` | boolean | `false` | Check for rollback file existence |
| `--strict` | boolean | `false` | Treat warnings as errors |

**Exit Codes**:

- `0`: Valid - All checks passed
- `1`: Invalid - Errors found
- `2`: Process failed - Unable to validate

**Validation Checks**:

1. ✅ **Naming pattern**: `/^\d{8}_\d{3}_[a-z0-9_]+\.sql$/`
2. ✅ **Sequential ordering**: No duplicate sequences, warn on gaps >5
3. ✅ **Checksum integrity**: Compare file SHA-256 with `schema_migrations` table
4. ✅ **SQL syntax validation**: Parse with PostgreSQL (optional)
5. ✅ **Rollback file existence**: Check for `.rollback.sql` pairs (optional)

**Example**:

```bash
npm run db:validate-migrations -- \
  --strict \
  --check-rollbacks \
  --database-url=$DATABASE_URL
```

**Validation Errors**:

- `INVALID_NAMING`: Filename doesn't match pattern
- `DUPLICATE_SEQUENCE`: Sequence number already used
- `CHECKSUM_MISMATCH`: File modified after application
- `SQL_SYNTAX_ERROR`: Invalid SQL syntax
- `MISSING_ROLLBACK`: No rollback file found

---

## NPM Scripts

| Script                           | Purpose                                    |
| -------------------------------- | ------------------------------------------ |
| `npm run db:init`                | Initialize fresh database from init script |
| `npm run db:verify`              | Verify schema consistency                  |
| `npm run db:generate-migration`  | Generate remediation migration             |
| `npm run db:rebuild-init`        | Rebuild init script from migrations        |
| `npm run db:validate-migrations` | Validate migration files                   |

## Architecture

### Directory Structure

```
scripts/db/
├── README.md                          # This file
├── verify-schema.ts                   # CLI: Schema verification
├── generate-migration.ts              # CLI: Migration generation
├── rebuild-init-script.ts             # CLI: Init script rebuilding
├── validate-migrations.ts             # CLI: Migration validation
│
├── types/                             # TypeScript type definitions
│   ├── schema.ts                      # SchemaMetadata, TableDefinition
│   ├── constraints.ts                 # Constraint and index types
│   ├── diff.ts                        # SchemaDiff, TableDiff
│   ├── migration.ts                   # MigrationFile, MigrationMetadata
│   ├── verification.ts                # VerificationReport, Verdict
│   └── functions.ts                   # FunctionDefinition, TriggerDefinition
│
├── lib/                               # Core implementation libraries
│   ├── capture-schema.ts              # Schema introspection orchestrator
│   ├── normalize.ts                   # PostgreSQL type normalization
│   ├── checksum.ts                    # SHA-256 checksum calculation
│   │
│   ├── introspect/                    # PostgreSQL introspection
│   │   ├── tables.ts                  # Query information_schema.tables
│   │   ├── columns.ts                 # Query information_schema.columns
│   │   ├── constraints.ts             # Query constraints (PK, FK, UNIQUE, CHECK)
│   │   ├── indexes.ts                 # Query pg_catalog indexes
│   │   └── triggers.ts                # Query pg_catalog triggers/functions
│   │
│   ├── diff/                          # Schema comparison engine
│   │   ├── index.ts                   # Main entry point: compareSchemas()
│   │   ├── structural.ts              # Phase 1: Table/column name diffs
│   │   ├── columns.ts                 # Phase 2: Data type diffs
│   │   ├── constraints.ts             # Phase 3: Constraint/index diffs
│   │   └── summary.ts                 # Diff summary and reporting
│   │
│   └── templates/                     # SQL generation templates
│       └── sql-templates.ts           # Migration SQL generators
│
└── lib/                               # Migration support utilities
    ├── migration-writer.ts            # Write migrations with metadata
    ├── rollback-generator.ts          # Generate rollback SQL
    └── checksum.ts                    # Migration file checksums
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     verify-schema.ts                        │
│                                                             │
│  1. Capture source schema (init + migrations simulation)   │
│  2. Capture target schema (live database)                  │
│  3. Compare schemas (diff engine)                          │
│  4. Generate verification report                           │
│  5. Output JSON + Markdown reports                         │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  generate-migration.ts                      │
│                                                             │
│  1. Load diff report from verify-schema                    │
│  2. Analyze table/column/constraint diffs                  │
│  3. Generate forward SQL (via sql-templates)               │
│  4. Generate rollback SQL (via rollback-generator)         │
│  5. Write migrations with metadata headers                 │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                validate-migrations.ts                       │
│                                                             │
│  1. Check naming pattern compliance                        │
│  2. Validate sequential ordering                           │
│  3. Verify checksum integrity                              │
│  4. (Optional) Validate SQL syntax                         │
│  5. (Optional) Check rollback file existence               │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│               rebuild-init-script.ts                        │
│                                                             │
│  1. Create temporary database                              │
│  2. Apply all migrations sequentially                      │
│  3. Export schema via pg_dump                              │
│  4. Format and write init script                           │
│  5. (Optional) Validate init ≡ migrations                  │
│  6. Clean up temporary databases                           │
└─────────────────────────────────────────────────────────────┘
```

## Type System

### Core Types

#### SchemaMetadata

Complete representation of a PostgreSQL schema:

```typescript
interface SchemaMetadata {
	schemaName: string;
	capturedAt: string; // ISO-8601 timestamp
	postgresVersion: string;
	tables: TableDefinition[];
	functions: FunctionDefinition[];
	triggers: TriggerDefinition[];
}
```

#### SchemaDiff

Result of schema comparison:

```typescript
interface SchemaDiff {
	sourceSchema: string;
	targetSchema: string;
	comparedAt: string;
	hasDifferences: boolean;
	tableDiffs: TableDiff[];
	summary: DiffSummary;
}
```

#### VerificationReport

Complete verification run result:

```typescript
interface VerificationReport {
	verificationId: string;
	runAt: string;
	environment: Environment;
	schemaSource: SchemaMetadata;
	schemaTarget: SchemaMetadata;
	diff: SchemaDiff;
	verdict: VerificationVerdict; // PASS | WARN | FAIL | ERROR
	executionTimeMs: number;
	recommendedActions: RecommendedAction[];
}
```

## Migration File Format

### Naming Pattern

```
YYYYMMDD_NNN_description.sql
```

- `YYYYMMDD`: Date in ISO format (e.g., `20251003`)
- `NNN`: Sequence number within day (001-999)
- `description`: Lowercase with underscores (e.g., `add_approval_fields_events`)

### Metadata Header

```sql
-- Migration: [AUTO-GENERATED] Add approval fields to events table
-- Created: 2025-10-03T14:30:00Z
-- Source: Schema drift detection (verify-schema)
-- Affected: events.approved_by, events.approved_at
-- Reason: missing_column
-- Requires Review: YES (FR-024a)
--
-- WARNINGS:
--   - Rollback may cause data loss

BEGIN;

-- SQL statements here

COMMIT;
```

## Constitutional Requirements

### FR-024a: Manual Review Required

All auto-generated migrations MUST be marked `requiresReview: true` and include metadata header warning.

### FR-026: Production Safety

Migrations generated for production environment are NEVER auto-applied. Production drift detection is informational only.

### FR-002: Init Script Equivalence

The initialization script (`00_init_schema.sql`) MUST equal the cumulative effect of all migration files.

## Common Workflows

### Detect and Fix Schema Drift

```bash
# 1. Detect drift
npm run db:verify

# 2. Generate migration
npm run db:generate-migration -- \
  --diff-source=./verification-reports/2025-10-03-development.json

# 3. Review generated SQL
cat migrations/remediation/20251003_001_fix_drift.sql

# 4. Move to main migrations directory with proper sequence
mv migrations/remediation/20251003_001_fix_drift.sql \
   migrations/20251003_015_fix_approval_fields.sql

# 5. Validate migration
npm run db:validate-migrations

# 6. Rebuild init script
npm run db:rebuild-init

# 7. Verify schema now matches
npm run db:verify
```

### Validate Before PR

```bash
# 1. Validate all migrations
npm run db:validate-migrations -- --strict --check-rollbacks

# 2. Rebuild init script
npm run db:rebuild-init -- --validate

# 3. Verify schema consistency
npm run db:verify
```

## Testing

### Unit Tests

```bash
npm run test:unit -- scripts/db
```

### Contract Tests

```bash
npm run test:contract
```

### Integration Tests

```bash
npm run test:integration -- --grep "schema consistency"
```

## Troubleshooting

### "CHECKSUM_MISMATCH for applied migration"

**Cause**: Migration file was edited after being applied.

**Solution**:

```bash
# NEVER edit applied migrations!
# Revert to original:
git checkout migrations/20251001_003_create_departments.sql

# Create NEW migration with changes
```

### "Verification FAIL: Missing table"

**Cause**: Init script is outdated.

**Solution**:

```bash
npm run db:rebuild-init
dropdb hr_development
createdb hr_development
psql hr_development < migrations/00_init_schema.sql
```

### "SQL syntax error in generated migration"

**Cause**: Complex schema changes require manual SQL.

**Solution**:

1. Review generated SQL carefully
2. Test in isolated database first
3. Fix syntax errors manually
4. Re-validate before applying

## Environment Variables

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

## Related Documentation

- [Full Feature Specification](../../specs/022-database-schema-consistency/spec.md)
- [Implementation Plan](../../specs/022-database-schema-consistency/plan.md)
- [Quickstart Guide](../../specs/022-database-schema-consistency/quickstart.md)
- [Research Notes](../../specs/022-database-schema-consistency/research.md)

## Version History

- **1.0.0** (2025-10-03): Initial implementation
  - Schema verification with three-phase comparison
  - Migration generation with rollback support
  - Init script rebuilding with validation
  - Migration validation with checksum integrity
  - Constitutional compliance (FR-024a, FR-026, FR-002)

## Contributing

### Adding New CLI Tools

1. Create CLI entrypoint in `scripts/db/<tool-name>.ts`
2. Use commander.js for argument parsing
3. Follow existing CLI patterns (chalk for output, ora for spinners)
4. Add contract YAML file in `specs/022-database-schema-consistency/contracts/`
5. Add npm script in `package.json`
6. Document in this README
7. Add tests in `tests/contract/`

### Modifying Type Definitions

1. Update types in `scripts/db/types/*.ts`
2. Update validation functions
3. Update tests in `tests/contract/`
4. Run `npm run check` to verify TypeScript compilation

### Adding SQL Templates

1. Add template function in `scripts/db/lib/templates/sql-templates.ts`
2. Follow idempotency pattern (IF NOT EXISTS guards)
3. Include transaction blocks (BEGIN/COMMIT)
4. Add metadata header support
5. Add tests

---

**Last Updated**: 2025-10-03
**Feature**: 022-database-schema-consistency
**Questions?** See [full specification](../../specs/022-database-schema-consistency/spec.md)
