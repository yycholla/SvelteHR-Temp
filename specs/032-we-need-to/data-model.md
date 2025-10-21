# Data Model: Schema Alignment System

**Feature**: Frontend-Backend GraphQL API Schema Alignment System
**Date**: 2025-10-13
**Status**: Complete

## Overview

This data model defines the core entities and their relationships for the schema alignment validation system. The system tracks frontend GraphQL expectations, database schema state, and Rust API implementation to detect misalignments.

---

## Entity Definitions

### 1. GraphQLOperation

**Description**: Represents a GraphQL query or mutation extracted from frontend code.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | string | Required, Unique | Hash of operation content |
| name | string | Required | Operation name (e.g., "GetEvents", "CreateUser") |
| type | "query" \| "mutation" \| "subscription" | Required | Operation type |
| sourceFile | string | Required | File path relative to repo root |
| sourceLine | number | Required | Line number where operation starts |
| fields | FieldReference[] | Required | List of fields requested in operation |
| variables | VariableDefinition[] | Optional | Input variables |
| fragments | FragmentReference[] | Optional | Referenced fragments |
| createdAt | DateTime | Required | When operation was first parsed |
| lastModified | DateTime | Required | When operation content last changed |

**Relationships**:
- One GraphQLOperation has many FieldReference
- One GraphQLOperation references many FragmentReference

**Validation Rules**:
- `name` must be unique per source file
- `sourceFile` must exist in repository
- `fields` must not be empty array

**State Transitions**: None (immutable once parsed)

---

### 2. FieldReference

**Description**: A specific field requested in a GraphQL operation, with its path and type.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | string | Required, Unique | Hash of parent operation + field path |
| operationId | string | Required, Foreign Key | Parent GraphQLOperation.id |
| typeName | string | Required | GraphQL type (e.g., "Event", "User") |
| fieldName | string | Required | Field name as written in query |
| fieldPath | string | Required | Full path (e.g., "event.attendees.user.fullName") |
| graphqlType | string | Required | Expected GraphQL type (e.g., "String!", "[User!]") |
| isNullable | boolean | Required | Whether field can be null |
| isArray | boolean | Required | Whether field is array type |
| selectionSet | string[] | Optional | Nested fields if object type |
| arguments | ArgumentValue[] | Optional | Arguments passed to field |

**Relationships**:
- Many FieldReference belong to one GraphQLOperation
- One FieldReference maps to one DatabaseColumn (or none if computed)
- One FieldReference maps to one ApiField

**Validation Rules**:
- `fieldPath` must be unique per operation
- `graphqlType` must match GraphQL type system spec
- If `isArray` is true, `graphqlType` must start with `[`

---

### 3. DatabaseColumn

**Description**: A column in a PostgreSQL table, as introspected from information_schema.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | string | Required, Unique | schema.table.column |
| schemaName | string | Required | PostgreSQL schema (e.g., "hr_public") |
| tableName | string | Required | Table name (e.g., "events") |
| columnName | string | Required | Column name (e.g., "start_time") |
| dataType | string | Required | PostgreSQL type (e.g., "timestamptz") |
| udtName | string | Required | Underlying type name |
| isNullable | boolean | Required | Whether column allows NULL |
| columnDefault | string | Optional | Default value expression |
| isArray | boolean | Required | Whether column is array type |
| enumValues | string[] | Optional | If enum type, list of valid values |
| maxLength | number | Optional | For varchar/char types |
| numericPrecision | number | Optional | For numeric types |
| createdAt | DateTime | Required | When column was first detected |
| lastModified | DateTime | Required | When column definition last changed |

**Relationships**:
- One DatabaseColumn belongs to one DatabaseTable
- One DatabaseColumn maps to many FieldReference
- One DatabaseColumn maps to one ApiField (typically)

**Validation Rules**:
- `schemaName.tableName.columnName` must be unique
- `dataType` must be valid PostgreSQL type
- If `enumValues` is present, `udtName` must be an enum type

---

### 4. ApiField

**Description**: A GraphQL field exposed by the Rust async-graphql API.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | string | Required, Unique | typeName.fieldName |
| typeName | string | Required | GraphQL type (e.g., "Event", "User") |
| fieldName | string | Required | Field name as exposed in API |
| graphqlType | string | Required | GraphQL return type (e.g., "String!", "[User!]") |
| isNullable | boolean | Required | Whether field can return null |
| isArray | boolean | Required | Whether field returns array |
| isComputed | boolean | Required | Whether field is computed (no direct DB column) |
| resolverFile | string | Required | Rust file containing resolver |
| resolverLine | number | Required | Line number of resolver implementation |
| sourceColumns | string[] | Optional | Database columns used (if known) |
| isAlias | boolean | Required | Whether field is alias for another field |
| aliasTarget | string | Optional | If alias, the target field/column name |
| deprecationReason | string | Optional | If deprecated, the reason |
| createdAt | DateTime | Required | When field was first detected |
| lastModified | DateTime | Required | When resolver last changed |

**Relationships**:
- One ApiField belongs to one ApiType
- One ApiField maps to one DatabaseColumn (or none if computed)
- Many FieldReference reference one ApiField

**Validation Rules**:
- `typeName.fieldName` must be unique in schema
- `graphqlType` must match GraphQL type system spec
- If `isComputed` is true, `sourceColumns` should be documented
- If `isAlias` is true, `aliasTarget` must be specified

**State Transitions**:
- Active → Deprecated (when `deprecationReason` is set)
- Deprecated → Removed (when field is removed from schema)

---

### 5. FieldAlignment

**Description**: The alignment status between a frontend field expectation and backend implementation.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | string | Required, Unique | Hash of field reference |
| fieldReferenceId | string | Required, Foreign Key | FieldReference.id |
| databaseColumnId | string | Optional, Foreign Key | DatabaseColumn.id (null if computed or missing) |
| apiFieldId | string | Optional, Foreign Key | ApiField.id (null if missing) |
| status | AlignmentStatus | Required | Current alignment state |
| typesMatch | boolean | Required | Whether types are compatible |
| nullabilityMatches | boolean | Required | Whether nullability matches |
| details | string | Optional | Human-readable explanation |
| requiredAction | string | Optional | What developer needs to do |
| affectedPages | string[] | Required | Frontend pages using this field |
| detectedAt | DateTime | Required | When misalignment was detected |
| resolvedAt | DateTime | Optional | When misalignment was fixed |

**AlignmentStatus Enum**:
- `aligned`: Field exists in DB and API with matching types
- `missing_db`: Database column doesn't exist
- `missing_api`: API field isn't exposed
- `type_mismatch`: Types don't map correctly
- `nullability_mismatch`: Nullable/non-nullable conflict
- `computed_field`: Field is computed (needs config entry)

**Relationships**:
- One FieldAlignment references one FieldReference (required)
- One FieldAlignment references one DatabaseColumn (optional)
- One FieldAlignment references one ApiField (optional)

**Validation Rules**:
- If `status` is `aligned`, both `databaseColumnId` and `apiFieldId` must be present
- If `status` is `missing_db`, `databaseColumnId` must be null
- If `status` is `missing_api`, `apiFieldId` must be null
- `requiredAction` must be present if status is not `aligned`

**State Transitions**:
```
missing_db/missing_api/type_mismatch → aligned (when fixed)
aligned → missing_api (when API field removed)
aligned → type_mismatch (when type changed)
* → computed_field (when manually marked as computed)
```

---

### 6. SchemaSnapshot

**Description**: A point-in-time snapshot of the complete schema state for caching and historical tracking.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | string | Required, Unique | UUID v4 |
| version | string | Required | Semantic version or commit hash |
| databaseSchemaHash | string | Required | Hash of all DatabaseColumn states |
| apiSchemaHash | string | Required | Hash of all ApiField states |
| operationsHash | string | Required | Hash of all GraphQLOperation states |
| totalFields | number | Required | Count of all field references |
| alignedFields | number | Required | Count of aligned fields |
| misalignments | number | Required | Count of misaligned fields |
| misalignmentsByType | Record<AlignmentStatus, number> | Required | Breakdown by status |
| createdAt | DateTime | Required | When snapshot was created |
| createdBy | string | Required | Git commit hash or "manual" |

**Relationships**:
- One SchemaSnapshot has many FieldAlignment (snapshot)

**Validation Rules**:
- `totalFields` = `alignedFields` + `misalignments`
- Sum of `misalignmentsByType` values must equal `misalignments`

**Usage**:
- Historical tracking of schema evolution
- Cache validation (compare hashes)
- Rollback reference point

---

### 7. ValidationRun

**Description**: A record of each schema validation execution.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | string | Required, Unique | UUID v4 |
| runType | "pre-commit" \| "full" \| "ci" | Required | Type of validation run |
| startedAt | DateTime | Required | When validation started |
| completedAt | DateTime | Optional | When validation finished |
| durationMs | number | Optional | Execution time in milliseconds |
| exitCode | number | Required | 0=success, 1=misalignments, 2=error |
| filesScanned | number | Required | Number of files checked |
| operationsParsed | number | Required | Number of GraphQL operations |
| misalignmentsFound | number | Required | Number of issues detected |
| reportPath | string | Required | Path to generated report |
| triggeredBy | string | Required | Git user or CI job |
| changedFiles | string[] | Optional | For incremental validation |
| errorMessage | string | Optional | If exitCode=2, error details |

**Relationships**:
- One ValidationRun produces one SchemaSnapshot

**Validation Rules**:
- If `runType` is `pre-commit`, `changedFiles` should be present
- If `exitCode` is 2, `errorMessage` must be present
- `completedAt` must be after `startedAt`

---

### 8. ComputedFieldConfig

**Description**: Manual configuration for fields that are computed rather than direct DB mappings.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | string | Required, Unique | typeName.fieldName |
| typeName | string | Required | GraphQL type |
| fieldName | string | Required | Computed field name |
| graphqlType | string | Required | Return type |
| sourceColumns | string[] | Required | DB columns used in computation |
| resolverFile | string | Required | Rust file path |
| resolverLine | number | Required | Line number |
| computationLogic | string | Required | Human-readable explanation |
| examples | string[] | Optional | Example inputs/outputs |
| addedAt | DateTime | Required | When config entry was added |
| addedBy | string | Required | Git user who added it |

**Relationships**:
- One ComputedFieldConfig maps to one ApiField

**Validation Rules**:
- `typeName.fieldName` must match an existing ApiField
- All entries in `sourceColumns` must reference existing DatabaseColumn IDs
- `resolverFile` must exist in repository

**Usage**:
- Exempts computed fields from "missing database column" errors
- Documents what columns are used for computation
- Provides context for API design decisions

---

## Type Mapping Reference

This table defines how types map across the three layers:

| GraphQL Type | PostgreSQL Type(s) | Rust Type(s) | Validation Rule |
|--------------|-------------------|--------------|-----------------|
| ID | uuid | Uuid | Exact match |
| String | varchar, text, char | String, &str | Compatible |
| Int | integer, int2, int4, smallint | i32, i16 | Compatible |
| BigInt | bigint, int8 | i64 | Exact match |
| Float | real, float4, double precision, float8 | f32, f64 | Compatible |
| Boolean | boolean, bool | bool | Exact match |
| DateTime | timestamptz, timestamp | DateTime\<Utc\>, NaiveDateTime | Exact match |
| Date | date | NaiveDate | Exact match |
| Time | time, timetz | NaiveTime, Time | Exact match |
| JSON | json, jsonb | serde_json::Value, sqlx::types::Json | Compatible |
| [T] | ARRAY | Vec\<T\> | Recursive check |
| T! (non-null) | NOT NULL column | T (not Option) | Nullability must match |
| T (nullable) | NULL allowed | Option\<T\> | Nullability must match |
| Custom Scalar | Custom type | Custom Rust type | Manual mapping config |

**Compatibility Rules**:
- **Exact match**: Types must match exactly
- **Compatible**: Types can convert without data loss
- **Recursive check**: For arrays, check inner type compatibility

---

## Validation Workflow

```
1. Parse GraphQL Operations
   ↓
2. Extract Field References
   ↓
3. Introspect Database Schema → DatabaseColumn entities
   ↓
4. Introspect Rust API Schema → ApiField entities
   ↓
5. For each FieldReference:
   a. Find matching ApiField by typeName.fieldName
   b. If not found → status = missing_api
   c. Check ApiField.isComputed:
      - If true → Check ComputedFieldConfig exists
      - If false → Find matching DatabaseColumn
   d. If DatabaseColumn not found → status = missing_db
   e. Compare types using Type Mapping Reference
   f. Check nullability compatibility
   g. Create FieldAlignment entity with status
   ↓
6. Generate SchemaSnapshot
   ↓
7. Generate Reports
   ↓
8. Exit with appropriate code
```

---

## Storage Strategy

**In-Memory (during validation)**:
- All entities loaded into memory during validation run
- TypeScript Map/Set data structures for fast lookups

**On-Disk Cache**:
```
.schema-cache/
├── database-schema.json      # DatabaseColumn entities
├── api-schema.json           # ApiField entities
├── operations.json           # GraphQLOperation + FieldReference entities
├── alignments.json           # FieldAlignment entities
└── snapshot.json             # Latest SchemaSnapshot
```

**Version-Controlled Config**:
```
tools/schema-validator/
├── schema-validator.config.json  # ComputedFieldConfig entities
└── type-mappings.json            # Type compatibility rules
```

**Git-Tracked Reports**:
```
SCHEMA_ALIGNMENT.md              # Human-readable report
.github/
└── schema-alignment-history/
    └── [commit-hash].json       # Historical SchemaSnapshot entities
```

---

## Data Model Summary

**Total Entities**: 8
- 3 Source entities (GraphQLOperation, DatabaseColumn, ApiField)
- 2 Derived entities (FieldReference, FieldAlignment)
- 2 Tracking entities (SchemaSnapshot, ValidationRun)
- 1 Configuration entity (ComputedFieldConfig)

**Key Relationships**:
- GraphQLOperation → FieldReference (1:N)
- FieldReference → FieldAlignment (1:1)
- FieldAlignment → DatabaseColumn (N:1, optional)
- FieldAlignment → ApiField (N:1, optional)
- ValidationRun → SchemaSnapshot (1:1)
- ApiField → ComputedFieldConfig (1:0..1)

**Validation Entry Point**: FieldAlignment entity contains all alignment logic

---

**Completion Checklist**:
- [x] All entities from feature spec defined
- [x] Field types and constraints specified
- [x] Relationships documented
- [x] Validation rules extracted from requirements
- [x] State transitions identified
- [x] Type mapping table created
- [x] Storage strategy defined
