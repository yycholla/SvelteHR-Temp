# Validation Engine API Contract

**Module**: Schema Validation Engine
**Language**: TypeScript
**Version**: 1.0.0

## Overview

The validation engine provides a programmatic API for schema alignment validation, separate from the CLI interface. This enables integration with build tools, IDEs, and custom workflows.

---

## Core Interfaces

### SchemaValidator

**Description**: Main validator class that orchestrates the validation process.

```typescript
class SchemaValidator {
  constructor(config: SchemaValidatorConfig);

  /**
   * Perform full schema alignment validation
   * @returns Validation result with alignments and misalignments
   */
  async validate(options?: ValidateOptions): Promise<ValidationResult>;

  /**
   * Validate only specific files (incremental)
   * @param files - File paths relative to repo root
   * @returns Validation result for specified files only
   */
  async validateFiles(files: string[], options?: ValidateOptions): Promise<ValidationResult>;

  /**
   * Check alignment status from cache (fast)
   * @returns Cached validation result or null if no cache
   */
  async checkCache(): Promise<ValidationResult | null>;

  /**
   * Clear cached schema state
   */
  async clearCache(target?: 'all' | 'database' | 'api' | 'operations'): Promise<void>;

  /**
   * Generate alignment report
   */
  async generateReport(format: ReportFormat, filter?: AlignmentFilter): Promise<string>;
}
```

**Contract Tests Required**:
- ✅ Constructor accepts valid config
- ✅ `validate()` returns ValidationResult with correct structure
- ✅ `validateFiles()` only processes specified files
- ✅ `checkCache()` returns null when no cache exists
- ✅ `clearCache()` removes specified cache files
- ✅ `generateReport()` produces valid markdown/JSON/HTML

---

### ValidateOptions

```typescript
interface ValidateOptions {
  /**
   * Use cached schema state if available
   * @default true
   */
  useCache?: boolean;

  /**
   * Run validation in parallel for better performance
   * @default true
   */
  parallel?: boolean;

  /**
   * Maximum number of concurrent operations
   * @default 10
   */
  maxConcurrency?: number;

  /**
   * Filter validation to specific GraphQL types
   * @example ['Event', 'User']
   */
  typeFilter?: string[];

  /**
   * Include zombie field detection
   * @default true
   */
  detectZombieFields?: boolean;

  /**
   * Log progress to console
   * @default false
   */
  verbose?: boolean;
}
```

---

### ValidationResult

```typescript
interface ValidationResult {
  /**
   * Overall validation status
   */
  status: 'success' | 'failure' | 'error';

  /**
   * Validation statistics
   */
  summary: {
    totalFields: number;
    alignedFields: number;
    misalignedFields: number;
    computedFields: number;
    zombieFields: number;
  };

  /**
   * Breakdown by alignment status
   */
  misalignmentsByType: Record<AlignmentStatus, number>;

  /**
   * List of all field alignments
   */
  alignments: FieldAlignment[];

  /**
   * List of only misaligned fields (filtered)
   */
  misalignments: FieldAlignment[];

  /**
   * Fields that aren't used by any frontend query
   */
  zombieFields: ApiField[];

  /**
   * Validation execution metadata
   */
  metadata: {
    startedAt: Date;
    completedAt: Date;
    durationMs: number;
    filesScanned: number;
    operationsParsed: number;
    cacheUsed: boolean;
  };

  /**
   * Errors encountered during validation
   */
  errors: ValidationError[];
}
```

**Contract Tests Required**:
- ✅ `status` is 'success' when all fields aligned
- ✅ `status` is 'failure' when misalignments exist
- ✅ `status` is 'error' when validation throws
- ✅ `summary` numbers sum correctly
- ✅ `misalignments` array contains only non-aligned items
- ✅ `metadata.durationMs` is positive

---

### FieldAlignment

```typescript
interface FieldAlignment {
  /**
   * Unique identifier (hash of field reference)
   */
  id: string;

  /**
   * Frontend field reference
   */
  field: {
    typeName: string;
    fieldName: string;
    fieldPath: string;
    graphqlType: string;
    isNullable: boolean;
    isArray: boolean;
    sourceFile: string;
    sourceLine: number;
  };

  /**
   * Database column (null if computed or missing)
   */
  databaseColumn: {
    schemaName: string;
    tableName: string;
    columnName: string;
    dataType: string;
    isNullable: boolean;
    isArray: boolean;
  } | null;

  /**
   * API field (null if missing)
   */
  apiField: {
    typeName: string;
    fieldName: string;
    graphqlType: string;
    isNullable: boolean;
    isArray: boolean;
    isComputed: boolean;
    isAlias: boolean;
    aliasTarget?: string;
    resolverFile: string;
    resolverLine: number;
  } | null;

  /**
   * Alignment status
   */
  status: AlignmentStatus;

  /**
   * Detailed validation results
   */
  validation: {
    typesMatch: boolean;
    nullabilityMatches: boolean;
    typeMapping?: string;  // e.g., "timestamptz → DateTime<Utc> → DateTime"
    issues: string[];
  };

  /**
   * Actionable guidance for developer
   */
  requiredAction?: string;

  /**
   * Frontend pages using this field
   */
  affectedPages: string[];
}
```

**Contract Tests Required**:
- ✅ `status` matches actual alignment state
- ✅ `validation.typesMatch` is computed correctly
- ✅ `requiredAction` is present when status is not 'aligned'
- ✅ `affectedPages` contains all pages using the field

---

### AlignmentStatus

```typescript
type AlignmentStatus =
  | 'aligned'              // ✅ All good
  | 'missing_db'           // ❌ Database column doesn't exist
  | 'missing_api'          // ❌ API field not exposed
  | 'type_mismatch'        // ⚠️ Types don't match
  | 'nullability_mismatch' // ⚠️ Nullable/non-nullable conflict
  | 'computed_field';      // ℹ️ Computed field (needs config)
```

---

## Parser Interfaces

### GraphQLParser

**Description**: Extracts GraphQL operations from source files.

```typescript
class GraphQLParser {
  constructor(config: ParserConfig);

  /**
   * Parse all GraphQL operations from a file
   * @param filePath - Absolute path to source file
   * @returns List of parsed operations
   */
  async parseFile(filePath: string): Promise<GraphQLOperation[]>;

  /**
   * Parse GraphQL operations from multiple files in parallel
   * @param filePaths - Array of absolute file paths
   * @returns Map of file path to operations
   */
  async parseFiles(filePaths: string[]): Promise<Map<string, GraphQLOperation[]>>;

  /**
   * Extract all field references from an operation
   * @param operation - Parsed GraphQL operation
   * @returns List of field references with types
   */
  extractFieldReferences(operation: GraphQLOperation): FieldReference[];
}
```

**Contract Tests Required**:
- ✅ `parseFile()` extracts all `gql` template literals
- ✅ `parseFile()` handles imported .graphql files
- ✅ `parseFile()` returns empty array for files with no operations
- ✅ `parseFiles()` processes files in parallel
- ✅ `extractFieldReferences()` includes nested fields
- ✅ `extractFieldReferences()` handles fragments correctly

---

### GraphQLOperation

```typescript
interface GraphQLOperation {
  /**
   * Unique identifier (hash of operation content)
   */
  id: string;

  /**
   * Operation name (e.g., "GetEvents")
   */
  name: string;

  /**
   * Operation type
   */
  type: 'query' | 'mutation' | 'subscription';

  /**
   * Source location
   */
  source: {
    file: string;
    line: number;
    column: number;
  };

  /**
   * Raw GraphQL document string
   */
  document: string;

  /**
   * Parsed AST (from graphql-js)
   */
  ast: DocumentNode;

  /**
   * Variable definitions
   */
  variables: Array<{
    name: string;
    type: string;
    defaultValue?: any;
  }>;

  /**
   * Referenced fragments
   */
  fragments: string[];
}
```

---

### FieldReference

```typescript
interface FieldReference {
  /**
   * Unique identifier
   */
  id: string;

  /**
   * Parent operation ID
   */
  operationId: string;

  /**
   * GraphQL type name (e.g., "Event", "User")
   */
  typeName: string;

  /**
   * Field name as written in query
   */
  fieldName: string;

  /**
   * Full path from operation root
   * @example "event.attendees.user.fullName"
   */
  fieldPath: string;

  /**
   * Expected GraphQL type
   * @example "String!", "[User!]", "DateTime"
   */
  graphqlType: string;

  /**
   * Type characteristics
   */
  isNullable: boolean;
  isArray: boolean;

  /**
   * Nested fields (if object type)
   */
  selectionSet?: string[];

  /**
   * Arguments passed to field
   */
  arguments?: Array<{
    name: string;
    value: any;
  }>;
}
```

---

## Introspection Interfaces

### DatabaseIntrospector

**Description**: Introspects PostgreSQL database schema.

```typescript
class DatabaseIntrospector {
  constructor(connectionString: string);

  /**
   * Connect to database
   */
  async connect(): Promise<void>;

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void>;

  /**
   * Get all tables in schema
   * @param schemaName - PostgreSQL schema (e.g., "hr_public")
   * @returns List of table names
   */
  async getTables(schemaName: string): Promise<string[]>;

  /**
   * Get all columns for a table
   * @param schemaName - PostgreSQL schema
   * @param tableName - Table name
   * @returns List of column metadata
   */
  async getColumns(schemaName: string, tableName: string): Promise<DatabaseColumn[]>;

  /**
   * Get all enum types in schema
   * @param schemaName - PostgreSQL schema
   * @returns Map of enum name to values
   */
  async getEnumTypes(schemaName: string): Promise<Map<string, string[]>>;

  /**
   * Get complete schema snapshot (all tables, columns, enums)
   * @param schemaName - PostgreSQL schema
   * @returns Complete schema state
   */
  async introspectSchema(schemaName: string): Promise<DatabaseSchema>;
}
```

**Contract Tests Required**:
- ✅ `connect()` succeeds with valid connection string
- ✅ `connect()` throws with invalid connection string
- ✅ `getTables()` returns all tables in schema
- ✅ `getColumns()` returns correct column metadata
- ✅ `getEnumTypes()` maps enum names to values
- ✅ `introspectSchema()` captures complete state

---

### DatabaseColumn

```typescript
interface DatabaseColumn {
  /**
   * Unique identifier (schema.table.column)
   */
  id: string;

  schemaName: string;
  tableName: string;
  columnName: string;

  /**
   * PostgreSQL data type
   */
  dataType: string;

  /**
   * Underlying type name (for enums)
   */
  udtName: string;

  /**
   * Nullability
   */
  isNullable: boolean;

  /**
   * Default value expression
   */
  columnDefault?: string;

  /**
   * Array type indicator
   */
  isArray: boolean;

  /**
   * Enum values (if enum type)
   */
  enumValues?: string[];

  /**
   * Character max length (for varchar/char)
   */
  maxLength?: number;

  /**
   * Numeric precision
   */
  numericPrecision?: number;

  /**
   * Numeric scale
   */
  numericScale?: number;
}
```

---

### ApiIntrospector

**Description**: Introspects Rust async-graphql API schema.

```typescript
class ApiIntrospector {
  constructor(config: ApiIntrospectorConfig);

  /**
   * Introspect GraphQL schema from Rust source
   * @returns Complete API schema with types and fields
   */
  async introspectSchema(): Promise<ApiSchema>;

  /**
   * Get all types in schema
   * @returns List of GraphQL types
   */
  async getTypes(): Promise<ApiType[]>;

  /**
   * Get all fields for a specific type
   * @param typeName - GraphQL type name
   * @returns List of field metadata
   */
  async getFields(typeName: string): Promise<ApiField[]>;

  /**
   * Detect field aliases from Rust code
   * @returns Map of field name to target column
   */
  async detectAliases(): Promise<Map<string, string>>;
}
```

**Contract Tests Required**:
- ✅ `introspectSchema()` captures all types
- ✅ `getFields()` includes resolver locations
- ✅ `detectAliases()` finds `#[graphql(name = "...")]` attributes
- ✅ `detectAliases()` finds resolver method renames

---

### ApiField

```typescript
interface ApiField {
  /**
   * Unique identifier (typeName.fieldName)
   */
  id: string;

  typeName: string;
  fieldName: string;

  /**
   * GraphQL return type
   */
  graphqlType: string;

  isNullable: boolean;
  isArray: boolean;

  /**
   * Computed field indicator
   */
  isComputed: boolean;

  /**
   * Resolver location
   */
  resolver: {
    file: string;
    line: number;
  };

  /**
   * Source database columns (if known)
   */
  sourceColumns?: string[];

  /**
   * Alias information
   */
  isAlias: boolean;
  aliasTarget?: string;

  /**
   * Deprecation status
   */
  isDeprecated: boolean;
  deprecationReason?: string;
}
```

---

## Comparison Interfaces

### TypeComparator

**Description**: Compares types across GraphQL, PostgreSQL, and Rust.

```typescript
class TypeComparator {
  constructor(typeMappings: TypeMappingConfig);

  /**
   * Check if types are compatible
   * @param graphqlType - GraphQL type string
   * @param postgresType - PostgreSQL data type
   * @param rustType - Rust type (optional)
   * @returns True if types can map correctly
   */
  areTypesCompatible(
    graphqlType: string,
    postgresType: string,
    rustType?: string
  ): boolean;

  /**
   * Check if nullability matches
   * @param graphqlNullable - GraphQL type ends with "!"
   * @param dbNullable - Database column allows NULL
   * @param rustNullable - Rust type is Option<T>
   * @returns True if nullability is consistent
   */
  isNullabilityCompatible(
    graphqlNullable: boolean,
    dbNullable: boolean,
    rustNullable?: boolean
  ): boolean;

  /**
   * Get type mapping explanation
   * @returns Human-readable type path
   * @example "timestamptz → DateTime<Utc> → DateTime"
   */
  getTypeMapping(
    graphqlType: string,
    postgresType: string,
    rustType?: string
  ): string;

  /**
   * Validate enum values match
   * @param frontendValues - Enum values used in GraphQL queries
   * @param dbValues - Enum values defined in PostgreSQL
   * @param apiValues - Enum values exposed by API
   * @returns Validation result with any mismatches
   */
  validateEnumValues(
    frontendValues: string[],
    dbValues: string[],
    apiValues: string[]
  ): EnumValidationResult;
}
```

**Contract Tests Required**:
- ✅ `areTypesCompatible()` returns true for valid mappings
- ✅ `areTypesCompatible()` returns false for incompatible types
- ✅ `isNullabilityCompatible()` enforces strict matching
- ✅ `getTypeMapping()` formats readable explanation
- ✅ `validateEnumValues()` detects missing values

---

### EnumValidationResult

```typescript
interface EnumValidationResult {
  valid: boolean;
  missingInDb: string[];
  missingInApi: string[];
  extraInDb: string[];
  extraInApi: string[];
}
```

---

## Reporter Interfaces

### AlignmentReporter

**Description**: Generates human-readable alignment reports.

```typescript
class AlignmentReporter {
  constructor(config: ReporterConfig);

  /**
   * Generate markdown report
   * @param result - Validation result
   * @returns Markdown string
   */
  generateMarkdown(result: ValidationResult): string;

  /**
   * Generate JSON report
   * @param result - Validation result
   * @returns JSON string
   */
  generateJSON(result: ValidationResult): string;

  /**
   * Generate HTML report
   * @param result - Validation result
   * @returns HTML string
   */
  generateHTML(result: ValidationResult): string;

  /**
   * Generate terminal output with colors
   * @param result - Validation result
   * @returns Colored terminal string
   */
  generateTerminal(result: ValidationResult): string;
}
```

**Contract Tests Required**:
- ✅ `generateMarkdown()` produces valid markdown
- ✅ `generateJSON()` produces valid JSON
- ✅ `generateHTML()` produces valid HTML
- ✅ `generateTerminal()` includes ANSI color codes

---

### ReportFormat

```typescript
type ReportFormat = 'markdown' | 'json' | 'html' | 'terminal';
```

---

### AlignmentFilter

```typescript
interface AlignmentFilter {
  /**
   * Filter by alignment status
   */
  status?: AlignmentStatus | AlignmentStatus[];

  /**
   * Filter by GraphQL type
   */
  typeName?: string | string[];

  /**
   * Filter by source page
   */
  sourcePage?: string | string[];

  /**
   * Include only fields with required actions
   */
  actionableOnly?: boolean;
}
```

---

## Cache Interfaces

### SchemaCache

**Description**: Manages cached schema state for performance.

```typescript
class SchemaCache {
  constructor(cacheDir: string);

  /**
   * Save database schema to cache
   */
  async saveDatabase(schema: DatabaseSchema): Promise<void>;

  /**
   * Load database schema from cache
   * @returns Cached schema or null if not found
   */
  async loadDatabase(): Promise<DatabaseSchema | null>;

  /**
   * Save API schema to cache
   */
  async saveApi(schema: ApiSchema): Promise<void>;

  /**
   * Load API schema from cache
   * @returns Cached schema or null if not found
   */
  async loadApi(): Promise<ApiSchema | null>;

  /**
   * Save parsed operations to cache
   */
  async saveOperations(operations: Map<string, GraphQLOperation[]>): Promise<void>;

  /**
   * Load parsed operations from cache
   * @returns Cached operations or null if not found
   */
  async loadOperations(): Promise<Map<string, GraphQLOperation[]> | null>;

  /**
   * Check if cache is valid (not stale)
   * @param files - Files to check against cache
   * @returns True if cache is still valid
   */
  async isValid(files: string[]): Promise<boolean>;

  /**
   * Clear cache files
   */
  async clear(target: 'all' | 'database' | 'api' | 'operations'): Promise<void>;
}
```

**Contract Tests Required**:
- ✅ `save*()` methods write to correct files
- ✅ `load*()` methods return saved data
- ✅ `load*()` methods return null when cache doesn't exist
- ✅ `isValid()` detects stale cache
- ✅ `clear()` removes specified files

---

## Error Handling

### ValidationError

```typescript
interface ValidationError {
  code: string;
  message: string;
  file?: string;
  line?: number;
  details?: any;
}
```

**Error Codes**:
- `PARSE_ERROR`: Failed to parse GraphQL operation
- `DB_CONNECTION_ERROR`: Cannot connect to database
- `DB_INTROSPECTION_ERROR`: Error introspecting database
- `API_INTROSPECTION_ERROR`: Error introspecting API
- `CACHE_READ_ERROR`: Cannot read cache file
- `CACHE_WRITE_ERROR`: Cannot write cache file
- `CONFIG_INVALID`: Configuration validation failed
- `FILE_NOT_FOUND`: Required file not found

---

## Usage Examples

### Example 1: Programmatic Validation

```typescript
import { SchemaValidator } from 'schema-validator';

const validator = new SchemaValidator({
  frontendDir: 'src',
  backendDir: 'graphql-rust-server/src',
  databaseUrl: process.env.DATABASE_URL,
});

const result = await validator.validate({
  parallel: true,
  verbose: true,
});

if (result.status === 'failure') {
  console.error(`${result.misalignments.length} misalignments found`);
  result.misalignments.forEach(m => {
    console.error(`- ${m.field.fieldPath}: ${m.status}`);
  });
  process.exit(1);
}
```

### Example 2: Incremental Validation

```typescript
import { SchemaValidator } from 'schema-validator';

const validator = new SchemaValidator(config);

// Get staged files from git
const stagedFiles = await getStagedFiles();

// Validate only staged files
const result = await validator.validateFiles(stagedFiles, {
  useCache: true,
});
```

### Example 3: Custom Report Generation

```typescript
import { SchemaValidator, AlignmentReporter } from 'schema-validator';

const validator = new SchemaValidator(config);
const reporter = new AlignmentReporter(config);

const result = await validator.validate();

// Generate HTML report for specific page
const htmlReport = reporter.generateHTML(result);
await fs.writeFile('alignment-report.html', htmlReport);
```

---

**Completion Checklist**:
- [x] Core validator interface defined
- [x] Parser interfaces specified
- [x] Introspection interfaces documented
- [x] Comparison logic interfaces defined
- [x] Reporter interfaces specified
- [x] Cache management interfaces defined
- [x] Error handling specified
- [x] Usage examples provided
- [x] Contract tests identified for all interfaces
