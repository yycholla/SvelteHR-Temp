# Data Model: Database Schema Consistency

**Feature**: 022-database-schema-consistency
**Date**: 2025-10-03

## Overview

This data model defines the structures used by the schema verification and migration generation tooling. These are TypeScript interfaces representing schema metadata, not database tables (this is an infrastructure feature).

## Core Entities

### SchemaMetadata

Represents the complete schema structure of a PostgreSQL database.

```typescript
interface SchemaMetadata {
  schemaName: string;        // e.g., "hr_public"
  capturedAt: string;        // ISO-8601 timestamp
  postgresVersion: string;   // e.g., "14.5"
  tables: TableDefinition[];
  functions: FunctionDefinition[];
  triggers: TriggerDefinition[];
}
```

**Validation Rules**:
- `schemaName` must be non-empty string
- `capturedAt` must be valid ISO-8601 timestamp
- `postgresVersion` must match pattern `^\d+\.\d+`
- `tables` array must contain at least one table

**Relationships**:
- Contains 0..N TableDefinitions
- Contains 0..N FunctionDefinitions
- Contains 0..N TriggerDefinitions

### TableDefinition

Represents a single database table with all its structural elements.

```typescript
interface TableDefinition {
  tableName: string;
  columns: ColumnDefinition[];
  primaryKey: PrimaryKeyConstraint | null;
  foreignKeys: ForeignKeyConstraint[];
  uniqueConstraints: UniqueConstraint[];
  checkConstraints: CheckConstraint[];
  indexes: IndexDefinition[];
  rowCount?: number;  // Optional, for statistics
}
```

**Validation Rules**:
- `tableName` must match pattern `^[a-z_][a-z0-9_]*$`
- `columns` array must contain at least one column
- Column names within a table must be unique
- Primary key can reference only existing columns

**Relationships**:
- Parent: SchemaMetadata
- Contains 1..N ColumnDefinitions
- Contains 0..1 PrimaryKeyConstraint
- Contains 0..N ForeignKeyConstraints
- Contains 0..N UniqueConstraints
- Contains 0..N CheckConstraints
- Contains 0..N IndexDefinitions

### ColumnDefinition

Represents a single column within a table.

```typescript
interface ColumnDefinition {
  columnName: string;
  ordinalPosition: number;   // 1-based position in table
  dataType: string;          // PostgreSQL type (normalized)
  isNullable: boolean;
  defaultValue: string | null;
  characterMaximumLength: number | null;  // For varchar/char types
  numericPrecision: number | null;        // For numeric types
  numericScale: number | null;            // For numeric types
  isGenerated: boolean;      // GENERATED ALWAYS AS
  generationExpression: string | null;
}
```

**Validation Rules**:
- `columnName` must match pattern `^[a-z_][a-z0-9_]*$`
- `ordinalPosition` must be positive integer
- `dataType` must be normalized PostgreSQL type (e.g., "integer" not "int4")
- If `isGenerated` is true, `generationExpression` must be non-null

**State Transitions**: None (immutable once captured)

### PrimaryKeyConstraint

Represents a table's primary key.

```typescript
interface PrimaryKeyConstraint {
  constraintName: string;
  columns: string[];  // Ordered list of column names
}
```

**Validation Rules**:
- `constraintName` must be unique within table
- `columns` array must be non-empty
- All column names must exist in parent table

### ForeignKeyConstraint

Represents a foreign key relationship between tables.

```typescript
interface ForeignKeyConstraint {
  constraintName: string;
  columns: string[];           // Local columns
  referencedTable: string;
  referencedColumns: string[]; // Remote columns
  onDelete: ReferentialAction; // CASCADE | SET NULL | RESTRICT | NO ACTION
  onUpdate: ReferentialAction;
}

type ReferentialAction = "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION" | "SET DEFAULT";
```

**Validation Rules**:
- `columns` and `referencedColumns` must have same length
- All `columns` must exist in parent table
- `referencedTable` must exist in schema
- All `referencedColumns` must exist in referenced table

### UniqueConstraint

Represents a uniqueness constraint on one or more columns.

```typescript
interface UniqueConstraint {
  constraintName: string;
  columns: string[];
  isDeferrable: boolean;
  isInitiallyDeferred: boolean;
}
```

**Validation Rules**:
- `columns` array must be non-empty
- All column names must exist in parent table
- If `isInitiallyDeferred` is true, `isDeferrable` must also be true

### CheckConstraint

Represents a CHECK constraint for data validation.

```typescript
interface CheckConstraint {
  constraintName: string;
  checkClause: string;  // SQL expression
  isDeferrable: boolean;
  isInitiallyDeferred: boolean;
}
```

**Validation Rules**:
- `checkClause` must be non-empty SQL expression
- If `isInitiallyDeferred` is true, `isDeferrable` must also be true

### IndexDefinition

Represents a database index.

```typescript
interface IndexDefinition {
  indexName: string;
  columns: string[];        // Ordered list
  isUnique: boolean;
  indexType: IndexType;     // BTREE | HASH | GIN | GIST | SP-GIST | BRIN
  whereClause: string | null;  // Partial index predicate
  indexDefinition: string;  // Full CREATE INDEX statement
}

type IndexType = "BTREE" | "HASH" | "GIN" | "GIST" | "SP-GIST" | "BRIN";
```

**Validation Rules**:
- `columns` array must be non-empty
- All column names must exist in parent table (unless expression index)
- `indexType` must be valid PostgreSQL index type
- `indexDefinition` must be valid CREATE INDEX SQL

### FunctionDefinition

Represents a user-defined database function or procedure.

```typescript
interface FunctionDefinition {
  functionName: string;
  functionSchema: string;
  returnType: string;
  language: string;          // plpgsql | sql | c | internal
  functionDefinition: string; // Full CREATE FUNCTION statement
  arguments: FunctionArgument[];
}

interface FunctionArgument {
  argName: string | null;
  argType: string;
  argMode: "IN" | "OUT" | "INOUT" | "VARIADIC";
  defaultValue: string | null;
}
```

**Validation Rules**:
- `functionName` must be unique within schema (considering argument types)
- `language` must be one of allowed PostgreSQL languages
- `functionDefinition` must be valid CREATE FUNCTION SQL

### TriggerDefinition

Represents a database trigger.

```typescript
interface TriggerDefinition {
  triggerName: string;
  tableName: string;
  timing: "BEFORE" | "AFTER" | "INSTEAD OF";
  events: TriggerEvent[];    // INSERT, UPDATE, DELETE, TRUNCATE
  level: "ROW" | "STATEMENT";
  whenCondition: string | null;
  functionName: string;      // Name of function to execute
  triggerDefinition: string; // Full CREATE TRIGGER statement
}

type TriggerEvent = "INSERT" | "UPDATE" | "DELETE" | "TRUNCATE";
```

**Validation Rules**:
- `events` array must be non-empty
- `functionName` must reference existing function
- `tableName` must reference existing table
- Combination of `triggerName` + `tableName` must be unique

## Diff Entities

### SchemaDiff

Represents differences between two schema snapshots.

```typescript
interface SchemaDiff {
  sourceSchema: string;      // Source schema name (e.g., "version control")
  targetSchema: string;      // Target schema name (e.g., "production database")
  comparedAt: string;        // ISO-8601 timestamp
  hasDifferences: boolean;
  tableDiffs: TableDiff[];
  summary: DiffSummary;
}

interface DiffSummary {
  missingTables: number;
  extraTables: number;
  modifiedTables: number;
  missingColumns: number;
  extraColumns: number;
  modifiedColumns: number;
  missingIndexes: number;
  extraIndexes: number;
  totalDifferences: number;
}
```

**Validation Rules**:
- `hasDifferences` must match whether any diffs exist
- `summary.totalDifferences` must equal sum of all individual difference counts

### TableDiff

Represents differences for a single table.

```typescript
interface TableDiff {
  tableName: string;
  diffType: "missing" | "extra" | "modified";
  columnDiffs: ColumnDiff[];
  constraintDiffs: ConstraintDiff[];
  indexDiffs: IndexDiff[];
}

interface ColumnDiff {
  columnName: string;
  diffType: "missing" | "extra" | "type_mismatch" | "nullability_mismatch" | "default_mismatch";
  sourceValue?: any;
  targetValue?: any;
}

interface ConstraintDiff {
  constraintName: string;
  constraintType: "primary_key" | "foreign_key" | "unique" | "check";
  diffType: "missing" | "extra" | "definition_mismatch";
  sourceDefinition?: string;
  targetDefinition?: string;
}

interface IndexDiff {
  indexName: string;
  diffType: "missing" | "extra" | "definition_mismatch";
  sourceDefinition?: string;
  targetDefinition?: string;
}
```

**Validation Rules**:
- For `diffType: "missing"`, `targetValue`/`targetDefinition` must be undefined
- For `diffType: "extra"`, `sourceValue`/`sourceDefinition` must be undefined
- For `diffType: "*_mismatch"`, both source and target must be defined

## Migration Entities

### MigrationFile

Represents metadata about a migration file.

```typescript
interface MigrationFile {
  filename: string;          // e.g., "20251003_001_create_users_table.sql"
  timestamp: string;         // Extracted from filename: "20251003"
  sequence: number;          // Extracted from filename: 1
  description: string;       // Extracted from filename: "create_users_table"
  filePath: string;          // Absolute path to file
  checksum: string;          // SHA-256 of file contents
  appliedAt: string | null;  // ISO-8601 timestamp when applied (null if not applied)
  appliedBy: string | null;  // User who applied it
  rollbackFile: string | null; // Path to corresponding rollback migration
  sqlContent: string;        // Full SQL content
  parsedMetadata: MigrationMetadata;
}

interface MigrationMetadata {
  createdAt: string;         // Extracted from header comment
  source: "manual" | "auto-generated" | "unknown";
  affectedObjects: string[]; // Tables/columns mentioned in comments
  isReversible: boolean;
  rollbackReason: string | null;  // If not reversible, why?
}
```

**Validation Rules**:
- `filename` must match pattern `^\d{8}_\d{3}_[a-z0-9_]+\.sql$`
- `timestamp` must be valid date in YYYYMMDD format
- `sequence` must be 1-999
- `checksum` must be valid SHA-256 hex string (64 characters)
- If `appliedAt` is not null, `appliedBy` must also be not null

**State Transitions**:
- `appliedAt: null` → `appliedAt: <timestamp>` (applied)
- Once applied, never transitions back to null

### MigrationHistory

Represents the record of applied migrations (stored in database).

```typescript
interface MigrationHistoryRecord {
  id: number;
  filename: string;
  checksum: string;
  appliedAt: string;         // ISO-8601 timestamp
  appliedBy: string;
  executionTimeMs: number;
  success: boolean;
  errorMessage: string | null;
}
```

**Validation Rules**:
- `filename` must be unique in history
- `checksum` must match actual file checksum at time of application
- If `success` is false, `errorMessage` must be non-null
- `executionTimeMs` must be non-negative

**Storage**: Stored in `schema_migrations` table in database

```sql
CREATE TABLE IF NOT EXISTS hr_public.schema_migrations (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_by TEXT NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT
);
```

### RemediationMigration

Represents a generated migration to fix schema drift.

```typescript
interface RemediationMigration {
  generatedAt: string;       // ISO-8601 timestamp
  filename: string;          // Auto-generated name
  reason: RemediationReason;
  affectedObjects: string[]; // Tables/columns being fixed
  forwardSql: string;        // SQL to apply changes
  rollbackSql: string | null; // SQL to reverse changes (if possible)
  requiresReview: boolean;   // Always true per FR-024a
  metadata: {
    sourceDiff: SchemaDiff;  // The diff that triggered generation
    manualSteps: string[];   // Any manual actions required
    warnings: string[];      // Warnings about non-reversible changes
  };
}

type RemediationReason =
  | "missing_table"
  | "extra_table"
  | "missing_column"
  | "extra_column"
  | "type_mismatch"
  | "missing_constraint"
  | "extra_constraint"
  | "missing_index"
  | "extra_index";
```

**Validation Rules**:
- `requiresReview` must always be true (enforced by FR-024a)
- `affectedObjects` array must be non-empty
- `forwardSql` must be valid PostgreSQL DDL
- If `rollbackSql` is null, `metadata.warnings` must explain why

## Verification Entities

### VerificationReport

Represents the output of a schema verification run.

```typescript
interface VerificationReport {
  verificationId: string;    // UUID
  runAt: string;             // ISO-8601 timestamp
  environment: "development" | "staging" | "production";
  schemaSource: SchemaMetadata;      // From version control (init + migrations)
  schemaTarget: SchemaMetadata;      // From live database
  diff: SchemaDiff;
  verdict: VerificationVerdict;
  executionTimeMs: number;
  recommendedActions: RecommendedAction[];
}

type VerificationVerdict =
  | "PASS"           // No differences
  | "WARN"           // Differences found, non-critical
  | "FAIL"           // Critical differences
  | "ERROR";         // Verification process failed

interface RecommendedAction {
  priority: "high" | "medium" | "low";
  action: string;    // Human-readable description
  automatable: boolean;
  estimatedEffort: string;  // e.g., "5 minutes", "1 hour"
}
```

**Validation Rules**:
- If `diff.hasDifferences` is false, `verdict` must be "PASS"
- If `verdict` is "ERROR", `diff` may be incomplete
- `executionTimeMs` must be non-negative
- `environment` must match allowed environments per FR-009

**Output Formats**:
- JSON: Full structured report for programmatic consumption
- Markdown: Human-readable summary for CI/CD comments
- Exit code: 0 = PASS, 1 = WARN/FAIL, 2 = ERROR

## Data Flow

### Schema Capture Flow

```
PostgreSQL Database
  → introspect via information_schema queries
  → SchemaMetadata (in-memory)
  → serialize to JSON (optional caching)
```

### Verification Flow

```
Version Control (init + migrations)
  → parse and simulate application
  → SchemaMetadata (source)

Live Database
  → introspect via information_schema
  → SchemaMetadata (target)

Compare(source, target)
  → SchemaDiff
  → VerificationReport
  → output JSON + Markdown
```

### Remediation Flow

```
SchemaDiff (from verification)
  → analyze each diff entry
  → generate RemediationMigration
  → write SQL file to migrations/remediation/
  → require manual review (FR-024a)
```

## Data Normalization Rules

### Data Type Normalization

PostgreSQL type aliases must be normalized for accurate comparison:

| Stored Type | Normalized Type |
|------------|----------------|
| `int4`, `int` | `integer` |
| `int8`, `bigint` | `bigint` |
| `int2`, `smallint` | `smallint` |
| `varchar` | `character varying` |
| `char` | `character` |
| `bool` | `boolean` |
| `timestamp` | `timestamp without time zone` |
| `timestamptz` | `timestamp with time zone` |

### Constraint Name Normalization

- System-generated constraint names (e.g., `users_pkey`, `users_email_key`) are normalized
- Custom constraint names are compared as-is
- Missing constraint names are ignored in comparison if definition matches

### Index Ordering

- Index column order matters and must match exactly
- Index options (ASC/DESC, NULLS FIRST/LAST) must match
- Partial index predicates are normalized (whitespace, parentheses)

## Persistence Strategy

This is a **tooling feature**, not a data feature. Primary storage is:

1. **Version Control** (Git): Migration files, init script, verification reports (as artifacts)
2. **Database** (PostgreSQL): `schema_migrations` table only (tracks applied migrations)
3. **File System** (temporary): JSON schema snapshots during verification (deleted after run)

No persistent application database storage is required for schema metadata - it's captured on-demand.

---

**Data Model Complete**: 2025-10-03
**All entities and relationships defined**
**Ready for contract generation**
