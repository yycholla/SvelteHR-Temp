# Schema Validator API Documentation

Complete API reference for using Schema Validator programmatically in your Node.js or TypeScript projects.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Classes](#core-classes)
  - [SchemaValidator](#schemavalidator)
  - [TypeComparator](#typecomparator)
  - [GraphQLParser](#graphqlparser)
  - [DatabaseIntrospector](#databaseintrospector)
  - [ApiIntrospector](#apiintrospector)
- [Type Definitions](#type-definitions)
- [Enums](#enums)
- [Advanced Usage](#advanced-usage)
- [Error Handling](#error-handling)

---

## Installation

```bash
npm install schema-validator
```

## Quick Start

### Basic Validation

```typescript
import { SchemaValidator } from 'schema-validator';
import type { SchemaValidatorConfig } from 'schema-validator';

const config: SchemaValidatorConfig = {
  databaseUrl: 'postgresql://user:password@localhost:5432/mydb',
  apiUrl: 'http://localhost:8080/graphql',
  graphqlPaths: ['./src/**/*.{ts,svelte}'],
  strict: true,
};

const validator = new SchemaValidator(config);

// Run full validation
const result = await validator.validate();

if (result.passed) {
  console.log('✅ Schema is aligned!');
} else {
  console.error('❌ Alignment errors found:');
  result.errors.forEach((error) => {
    console.error(`  ${error.fieldPath}: ${error.message}`);
  });
}
```

### Incremental Validation

```typescript
// Validate only specific files (useful for watch mode)
const filePaths = ['./src/routes/users/+page.svelte'];
const result = await validator.validateFiles(filePaths);

console.log(`Validated ${result.summary.totalFields} fields`);
console.log(`Aligned: ${result.summary.alignedCount}`);
console.log(`Misaligned: ${result.summary.misalignedCount}`);
```

---

## Core Classes

### SchemaValidator

**Main orchestrator for schema validation**

#### Constructor

```typescript
constructor(config: SchemaValidatorConfig)
```

**Parameters:**
- `config`: Configuration object (see [SchemaValidatorConfig](#schemavalidatorconfig))

**Example:**

```typescript
const validator = new SchemaValidator({
  databaseUrl: process.env.DATABASE_URL,
  apiUrl: process.env.API_URL,
  graphqlPaths: ['./src/**/*.ts', './src/**/*.svelte'],
  strict: true,
  typeMappings: {
    'citext': 'String',
    'geometry': 'JSON',
  },
});
```

#### Methods

##### `validate(): Promise<ValidationResult>`

Performs complete three-way validation of schema alignment.

**Returns:** `Promise<ValidationResult>`

**Workflow:**
1. Parse GraphQL operations from source files
2. Introspect PostgreSQL database schema
3. Introspect GraphQL API schema
4. Compare fields across all three layers
5. Generate alignment report

**Example:**

```typescript
const result = await validator.validate();

console.log('Validation Results:');
console.log(`  Duration: ${result.durationMs}ms`);
console.log(`  Total fields: ${result.summary.totalFields}`);
console.log(`  Aligned: ${result.summary.alignedCount}`);
console.log(`  Misaligned: ${result.summary.misalignedCount}`);

// Breakdown by status
console.log('\nBreakdown:');
console.log(`  Missing DB: ${result.summary.byStatus.missing_db}`);
console.log(`  Missing API: ${result.summary.byStatus.missing_api}`);
console.log(`  Type mismatch: ${result.summary.byStatus.type_mismatch}`);
console.log(`  Nullability mismatch: ${result.summary.byStatus.nullability_mismatch}`);

// Process errors
if (!result.passed) {
  result.errors.forEach((error) => {
    console.error(`[${error.code}] ${error.fieldPath}`);
    console.error(`  ${error.message}`);
    if (error.suggestion) {
      console.error(`  Suggestion: ${error.suggestion}`);
    }
  });
}
```

##### `validateFiles(filePaths: string[]): Promise<ValidationResult>`

Validates only specific files (incremental validation).

**Parameters:**
- `filePaths`: Array of file paths to validate

**Returns:** `Promise<ValidationResult>`

**Example:**

```typescript
// Watch mode validation
import chokidar from 'chokidar';

const watcher = chokidar.watch('./src/**/*.svelte');

watcher.on('change', async (filePath) => {
  console.log(`File changed: ${filePath}`);
  const result = await validator.validateFiles([filePath]);

  if (!result.passed) {
    console.error(`❌ Validation failed for ${filePath}`);
    result.errors.forEach(error => console.error(`  ${error.message}`));
  } else {
    console.log(`✅ ${filePath} is aligned`);
  }
});
```

##### `checkCache(): Promise<ValidationResult | null>`

Retrieves cached validation results (fast check).

**Returns:** `Promise<ValidationResult | null>` - Cached result or null if cache is invalid/empty

**Example:**

```typescript
const cachedResult = await validator.checkCache();

if (cachedResult) {
  console.log('Using cached validation result');
  console.log(`Cache age: ${cachedResult.cacheInfo.cacheAge}s`);
} else {
  console.log('No valid cache, running full validation');
  const result = await validator.validate();
}
```

##### `clearCache(): Promise<void>`

Clears all validation caches.

**Example:**

```typescript
await validator.clearCache();
console.log('Cache cleared');
```

---

### TypeComparator

**Type compatibility checking and nullability validation**

#### Constructor

```typescript
constructor(options?: TypeComparatorOptions)
```

**Parameters:**
- `options.customMappings`: Custom PostgreSQL to GraphQL type mappings
- `options.strict`: Enable strict type checking (default: false)

**Example:**

```typescript
import { TypeComparator } from 'schema-validator';

const comparator = new TypeComparator({
  customMappings: new Map([
    ['citext', 'String'],
    ['ltree', 'String'],
    ['geometry', 'JSON'],
  ]),
  strict: true,
});
```

#### Methods

##### `areTypesCompatible(graphqlType: string, pgType: string): boolean`

Check if GraphQL and PostgreSQL types are compatible.

**Parameters:**
- `graphqlType`: GraphQL type (e.g., "String", "Int!", "[String]")
- `pgType`: PostgreSQL type (e.g., "text", "int4", "text[]")

**Returns:** `boolean` - true if types are compatible

**Example:**

```typescript
const compatible1 = comparator.areTypesCompatible('String', 'text'); // true
const compatible2 = comparator.areTypesCompatible('Int', 'int4'); // true
const compatible3 = comparator.areTypesCompatible('[String]', 'text[]'); // true
const compatible4 = comparator.areTypesCompatible('String', 'int4'); // false
```

##### `isNullabilityCompatible(graphqlNullable: boolean, dbNullable: boolean): boolean`

Check if nullability constraints are compatible.

**Parameters:**
- `graphqlNullable`: GraphQL field is nullable
- `dbNullable`: Database column is nullable

**Returns:** `boolean` - true if nullability is compatible

**Compatibility Rules:**
- GraphQL nullable + DB nullable = ✅ Compatible
- GraphQL nullable + DB non-null = ✅ Compatible (DB guarantees non-null)
- GraphQL non-null + DB nullable = ❌ Incompatible (runtime errors possible)
- GraphQL non-null + DB non-null = ✅ Compatible

**Example:**

```typescript
// GraphQL: email: String (nullable), DB: email text NULL
const check1 = comparator.isNullabilityCompatible(true, true); // true

// GraphQL: email: String (nullable), DB: email text NOT NULL
const check2 = comparator.isNullabilityCompatible(true, false); // true

// GraphQL: email: String! (non-null), DB: email text NULL
const check3 = comparator.isNullabilityCompatible(false, true); // false - ERROR!

// GraphQL: email: String! (non-null), DB: email text NOT NULL
const check4 = comparator.isNullabilityCompatible(false, false); // true
```

##### `compareTypes(graphqlType: string, dbType: string, apiType: string): TypeComparisonResult`

Comprehensive three-way type comparison.

**Parameters:**
- `graphqlType`: GraphQL type from query
- `dbType`: PostgreSQL column type
- `apiType`: API field type

**Returns:** `TypeComparisonResult` with compatibility details

**Example:**

```typescript
const result = comparator.compareTypes('String!', 'text', 'String!');

console.log(`Compatible: ${result.compatible}`);
console.log(`Nullability matches: ${result.nullabilityMatches}`);
console.log(`List types match: ${result.listTypesMatch}`);

if (!result.compatible) {
  console.error(`Incompatibility reason: ${result.reason}`);
}
```

##### `suggestFix(graphqlType: string, dbType: string): string`

Generate suggestion for fixing type mismatches.

**Parameters:**
- `graphqlType`: Current GraphQL type
- `dbType`: Database type

**Returns:** `string` - Human-readable suggestion

**Example:**

```typescript
const suggestion = comparator.suggestFix('String', 'int4');
console.log(suggestion);
// "Change GraphQL type to 'Int' to match PostgreSQL type 'int4'"
```

##### `requiresCustomScalar(graphqlType: string): boolean`

Check if type requires custom scalar definition.

**Parameters:**
- `graphqlType`: GraphQL type name

**Returns:** `boolean` - true if custom scalar is needed

**Example:**

```typescript
comparator.requiresCustomScalar('DateTime'); // true
comparator.requiresCustomScalar('UUID'); // true
comparator.requiresCustomScalar('JSON'); // true
comparator.requiresCustomScalar('String'); // false
comparator.requiresCustomScalar('Int'); // false
```

##### `validateEnumValues(dbValues: string[], apiValues: string[]): EnumValidationResult`

Validate enum value alignment between database and API.

**Parameters:**
- `dbValues`: Enum values from database
- `apiValues`: Enum values from API

**Returns:** `EnumValidationResult` with mismatch details

**Example:**

```typescript
const dbValues = ['ACTIVE', 'INACTIVE', 'PENDING'];
const apiValues = ['ACTIVE', 'INACTIVE'];

const result = comparator.validateEnumValues(dbValues, apiValues);

console.log(`Valid: ${result.valid}`);
console.log(`Missing in API: ${result.missingInApi}`); // ['PENDING']
console.log(`Extra in API: ${result.extraInApi}`); // []
```

##### `addCustomMapping(pgType: string, graphqlType: string): void`

Add custom type mapping.

**Parameters:**
- `pgType`: PostgreSQL type
- `graphqlType`: Corresponding GraphQL type

**Example:**

```typescript
// Add custom extension type
comparator.addCustomMapping('ltree', 'String');
comparator.addCustomMapping('geometry', 'JSON');

// Now these types are recognized
const compatible = comparator.areTypesCompatible('String', 'ltree'); // true
```

##### `clearCustomMappings(): void`

Remove all custom type mappings.

**Example:**

```typescript
comparator.clearCustomMappings();
```

---

### GraphQLParser

**Extract GraphQL operations from TypeScript and Svelte files**

#### Constructor

```typescript
constructor()
```

#### Methods

##### `parseFiles(filePaths: string[]): Promise<Map<string, GraphQLOperation[]>>`

Parse GraphQL operations from multiple files.

**Parameters:**
- `filePaths`: Array of file paths to parse

**Returns:** `Promise<Map<string, GraphQLOperation[]>>` - Map of file paths to operations

**Example:**

```typescript
import { GraphQLParser } from 'schema-validator';

const parser = new GraphQLParser();
const operationsMap = await parser.parseFiles([
  './src/routes/users/+page.svelte',
  './src/routes/posts/+page.svelte',
]);

for (const [filePath, operations] of operationsMap.entries()) {
  console.log(`\nFile: ${filePath}`);
  operations.forEach((op) => {
    console.log(`  Operation: ${op.name} (${op.operationType})`);
    console.log(`  Fields: ${op.selections.map(s => s.name).join(', ')}`);
  });
}
```

##### `parseFile(filePath: string): Promise<GraphQLOperation[]>`

Parse GraphQL operations from a single file.

**Parameters:**
- `filePath`: File path to parse

**Returns:** `Promise<GraphQLOperation[]>` - Array of operations

**Example:**

```typescript
const operations = await parser.parseFile('./src/routes/users/+page.svelte');

operations.forEach((op) => {
  console.log(`Operation: ${op.name}`);
  console.log(`Type: ${op.operationType}`);
  console.log(`Line: ${op.line}, Column: ${op.column}`);

  // Access field selections
  op.selections.forEach((field) => {
    console.log(`  Field: ${field.name} (${field.graphqlType})`);
    if (field.children.length > 0) {
      field.children.forEach((child) => {
        console.log(`    ${child.name}`);
      });
    }
  });
});
```

---

### DatabaseIntrospector

**PostgreSQL schema introspection**

#### Constructor

```typescript
constructor(connectionString: string)
```

**Parameters:**
- `connectionString`: PostgreSQL connection URL

**Example:**

```typescript
import { DatabaseIntrospector } from 'schema-validator';

const introspector = new DatabaseIntrospector(
  'postgresql://user:password@localhost:5432/mydb'
);
```

#### Methods

##### `connect(): Promise<void>`

Establish database connection.

**Example:**

```typescript
await introspector.connect();
console.log('Connected to database');
```

##### `disconnect(): Promise<void>`

Close database connection.

**Example:**

```typescript
await introspector.disconnect();
console.log('Disconnected from database');
```

##### `introspectSchema(schemaName?: string): Promise<DatabaseColumn[]>`

Introspect database schema.

**Parameters:**
- `schemaName`: PostgreSQL schema name (default: 'public')

**Returns:** `Promise<DatabaseColumn[]>` - Array of database columns

**Example:**

```typescript
await introspector.connect();

const columns = await introspector.introspectSchema('public');

console.log(`Found ${columns.length} columns`);

columns.forEach((col) => {
  console.log(`\n${col.tableName}.${col.columnName}`);
  console.log(`  Type: ${col.pgType} -> ${col.graphqlType}`);
  console.log(`  Nullable: ${col.nullable}`);
  console.log(`  Array: ${col.isArray}`);
  console.log(`  Primary Key: ${col.isPrimaryKey}`);

  if (col.foreignKey) {
    console.log(`  Foreign Key: ${col.foreignKey.table}.${col.foreignKey.column}`);
  }

  if (col.defaultValue) {
    console.log(`  Default: ${col.defaultValue}`);
  }
});

await introspector.disconnect();
```

##### `getTables(): Promise<string[]>`

Get list of table names.

**Returns:** `Promise<string[]>` - Array of table names

**Example:**

```typescript
await introspector.connect();
const tables = await introspector.getTables();
console.log('Tables:', tables); // ['users', 'posts', 'comments']
await introspector.disconnect();
```

---

### ApiIntrospector

**GraphQL API schema introspection**

#### Constructor

```typescript
constructor(apiUrl: string, headers?: Record<string, string>)
```

**Parameters:**
- `apiUrl`: GraphQL endpoint URL
- `headers`: Optional HTTP headers (e.g., Authorization)

**Example:**

```typescript
import { ApiIntrospector } from 'schema-validator';

const introspector = new ApiIntrospector(
  'http://localhost:8080/graphql',
  {
    'Authorization': `Bearer ${process.env.API_TOKEN}`,
    'X-Custom-Header': 'value',
  }
);
```

#### Methods

##### `introspectSchema(): Promise<ApiSchema>`

Introspect GraphQL API schema.

**Returns:** `Promise<ApiSchema>` with query fields, mutation fields, and types

**Example:**

```typescript
const schema = await introspector.introspectSchema();

console.log('Query fields:');
schema.queryFields.forEach((field) => {
  console.log(`  ${field.fieldName}: ${field.graphqlType}`);
  if (field.args.length > 0) {
    console.log(`    Args: ${field.args.map(a => `${a.name}: ${a.type}`).join(', ')}`);
  }
});

console.log('\nMutation fields:');
schema.mutationFields.forEach((field) => {
  console.log(`  ${field.fieldName}: ${field.graphqlType}`);
});

console.log('\nCustom types:');
for (const [typeName, fields] of schema.types.entries()) {
  console.log(`\n${typeName}:`);
  fields.forEach((field) => {
    console.log(`  ${field.fieldName}: ${field.graphqlType}`);
  });
}
```

##### `getType(typeName: string): Promise<ApiField[]>`

Get fields for a specific type.

**Parameters:**
- `typeName`: GraphQL type name

**Returns:** `Promise<ApiField[]>` - Array of fields

**Example:**

```typescript
const userFields = await introspector.getType('User');

userFields.forEach((field) => {
  console.log(`${field.fieldName}: ${field.graphqlType}`);
  console.log(`  Nullable: ${field.nullable}`);
  console.log(`  List: ${field.isList}`);

  if (field.args.length > 0) {
    console.log(`  Arguments:`);
    field.args.forEach((arg) => {
      console.log(`    ${arg.name}: ${arg.type}`);
    });
  }
});
```

---

## Type Definitions

### SchemaValidatorConfig

```typescript
interface SchemaValidatorConfig {
  /** PostgreSQL connection string */
  databaseUrl: string;

  /** GraphQL API endpoint */
  apiUrl: string;

  /** Paths to GraphQL operation files */
  graphqlPaths: string[];

  /** Enable strict validation mode */
  strict: boolean;

  /** Custom type mappings (PostgreSQL -> GraphQL) */
  typeMappings?: Record<string, string> | undefined;

  /** Computed field configurations */
  computedFields?: string[] | undefined;

  /** Cache configuration */
  cache?: {
    enabled: boolean;
    directory: string;
    ttl: number; // seconds
  } | undefined;
}
```

### ValidationResult

```typescript
interface ValidationResult {
  /** Validation passed (all aligned) */
  passed: boolean;

  /** Timestamp of validation */
  timestamp: Date;

  /** Duration in milliseconds */
  durationMs: number;

  /** Field alignments */
  alignments: FieldAlignment[];

  /** Summary statistics */
  summary: ValidationSummary;

  /** Errors encountered */
  errors: ValidationError[];

  /** Warnings (non-blocking) */
  warnings: ValidationWarning[];

  /** Cache usage information */
  cacheInfo: CacheInfo;
}
```

### FieldAlignment

```typescript
interface FieldAlignment {
  /** Field path (e.g., "User.email") */
  fieldPath: string;

  /** GraphQL field reference */
  graphqlField: FieldReference;

  /** Database column (if exists) */
  dbColumn?: DatabaseColumn | undefined;

  /** API field (if exists) */
  apiField?: ApiField | undefined;

  /** Alignment status */
  status: AlignmentStatus;

  /** Error message (if misaligned) */
  error?: string | undefined;

  /** Fix suggestion */
  suggestion?: string | undefined;

  /** Source code location */
  sourceLocation: SourceLocation;
}
```

### DatabaseColumn

```typescript
interface DatabaseColumn {
  /** Table name */
  tableName: string;

  /** Column name */
  columnName: string;

  /** PostgreSQL type */
  pgType: string;

  /** Mapped GraphQL type */
  graphqlType: string;

  /** Column is nullable */
  nullable: boolean;

  /** Column is array type */
  isArray: boolean;

  /** Column is primary key */
  isPrimaryKey: boolean;

  /** Foreign key reference */
  foreignKey?: {
    table: string;
    column: string;
  } | undefined;

  /** Default value */
  defaultValue?: string | undefined;
}
```

### ApiField

```typescript
interface ApiField {
  /** Parent type name */
  parentType: string;

  /** Field name */
  fieldName: string;

  /** GraphQL type */
  graphqlType: string;

  /** Field is nullable */
  nullable: boolean;

  /** Field is list type */
  isList: boolean;

  /** Field arguments */
  args: ArgumentInfo[];

  /** Resolver location */
  resolverLocation?: {
    file: string;
    line: number;
  } | undefined;

  /** Field alias */
  alias?: string | undefined;
}
```

### GraphQLOperation

```typescript
interface GraphQLOperation {
  /** Operation name */
  name: string;

  /** Operation type: query | mutation | subscription */
  operationType: 'query' | 'mutation' | 'subscription';

  /** Field selections */
  selections: FieldReference[];

  /** Operation variables */
  variables: VariableDefinition[];

  /** Source file path */
  filePath: string;

  /** Line number */
  line: number;

  /** Column number */
  column: number;
}
```

### TypeComparisonResult

```typescript
interface TypeComparisonResult {
  /** Types are compatible */
  compatible: boolean;

  /** GraphQL type */
  graphqlType: string;

  /** Database type */
  dbType: string;

  /** API type */
  apiType: string;

  /** Incompatibility reason */
  reason?: string | undefined;

  /** Nullability matches */
  nullabilityMatches: boolean;

  /** List types match */
  listTypesMatch: boolean;
}
```

---

## Enums

### AlignmentStatus

```typescript
enum AlignmentStatus {
  /** All layers aligned */
  Aligned = 'aligned',

  /** Missing database column */
  MissingDb = 'missing_db',

  /** Missing API resolver */
  MissingApi = 'missing_api',

  /** Type mismatch */
  TypeMismatch = 'type_mismatch',

  /** Nullability mismatch */
  NullabilityMismatch = 'nullability_mismatch',
}
```

### ErrorCode

```typescript
enum ErrorCode {
  FIELD_MISSING_DB = 'FIELD_MISSING_DB',
  FIELD_MISSING_API = 'FIELD_MISSING_API',
  TYPE_MISMATCH = 'TYPE_MISMATCH',
  NULLABILITY_MISMATCH = 'NULLABILITY_MISMATCH',
  UNKNOWN = 'UNKNOWN',
}
```

---

## Advanced Usage

### Custom Type Mappings

Handle PostgreSQL extension types or custom scalar types:

```typescript
const validator = new SchemaValidator({
  databaseUrl: process.env.DATABASE_URL,
  apiUrl: process.env.API_URL,
  graphqlPaths: ['./src/**/*.ts'],
  strict: true,
  typeMappings: {
    // PostgreSQL extensions
    'citext': 'String',        // Case-insensitive text
    'ltree': 'String',         // Label tree
    'geometry': 'JSON',        // PostGIS geometry
    'geography': 'JSON',       // PostGIS geography

    // Custom application types
    'money': 'Float',
    'email': 'String',
    'url': 'String',
  },
});
```

### Computed Fields Configuration

```typescript
const validator = new SchemaValidator({
  databaseUrl: process.env.DATABASE_URL,
  apiUrl: process.env.API_URL,
  graphqlPaths: ['./src/**/*.ts'],
  strict: true,
  computedFields: [
    'User.fullName',           // first_name + last_name
    'User.displayName',        // Formatted name
    'Employee.yearsOfService', // Calculated from hire_date
    'Order.total',             // subtotal + tax + shipping
    'Product.averageRating',   // Calculated from reviews
  ],
});
```

### Validation Filtering

```typescript
// Validate only User type fields
const result = await validator.validate();
const userFields = result.alignments.filter(
  (a) => a.fieldPath.startsWith('User.')
);

// Check for specific error types
const missingDbFields = result.alignments.filter(
  (a) => a.status === AlignmentStatus.MissingDb
);

// Generate targeted report
if (missingDbFields.length > 0) {
  console.log('Missing database columns:');
  missingDbFields.forEach((field) => {
    console.log(`  ${field.fieldPath}`);
    console.log(`    Suggestion: ${field.suggestion}`);
  });
}
```

### Integration with Build Tools

**Vite Plugin Example:**

```typescript
// vite-plugin-schema-validator.ts
import type { Plugin } from 'vite';
import { SchemaValidator } from 'schema-validator';

export function schemaValidatorPlugin(config: SchemaValidatorConfig): Plugin {
  let validator: SchemaValidator;

  return {
    name: 'schema-validator',

    async buildStart() {
      validator = new SchemaValidator(config);
      const result = await validator.validate();

      if (!result.passed) {
        const errorMsg = result.errors
          .map((e) => `${e.fieldPath}: ${e.message}`)
          .join('\n');
        this.error(`Schema validation failed:\n${errorMsg}`);
      }
    },

    async handleHotUpdate({ file }) {
      if (file.endsWith('.svelte') || file.endsWith('.ts')) {
        const result = await validator.validateFiles([file]);

        if (!result.passed) {
          console.error('Schema validation failed for', file);
          result.errors.forEach((e) => console.error(`  ${e.message}`));
        }
      }
    },
  };
}

// vite.config.ts
import { schemaValidatorPlugin } from './vite-plugin-schema-validator';

export default defineConfig({
  plugins: [
    schemaValidatorPlugin({
      databaseUrl: process.env.DATABASE_URL!,
      apiUrl: process.env.API_URL!,
      graphqlPaths: ['./src/**/*.{ts,svelte}'],
      strict: true,
    }),
  ],
});
```

### CI/CD Integration

**GitHub Actions Workflow:**

```typescript
// scripts/validate-schema.ts
import { SchemaValidator } from 'schema-validator';
import { writeFile } from 'fs/promises';

async function main() {
  const validator = new SchemaValidator({
    databaseUrl: process.env.DATABASE_URL!,
    apiUrl: process.env.API_URL!,
    graphqlPaths: ['./src/**/*.{ts,svelte}'],
    strict: true,
  });

  const result = await validator.validate();

  // Write JSON report
  await writeFile(
    'schema-validation-report.json',
    JSON.stringify(result, null, 2)
  );

  // Write Markdown summary
  const markdown = generateMarkdownReport(result);
  await writeFile('schema-validation-report.md', markdown);

  // Exit with error code if validation failed
  if (!result.passed) {
    console.error('❌ Schema validation failed');
    process.exit(1);
  }

  console.log('✅ Schema validation passed');
}

function generateMarkdownReport(result: ValidationResult): string {
  return `
# Schema Validation Report

**Status:** ${result.passed ? '✅ Passed' : '❌ Failed'}
**Date:** ${result.timestamp.toISOString()}
**Duration:** ${result.durationMs}ms

## Summary

- **Total fields:** ${result.summary.totalFields}
- **Aligned:** ${result.summary.alignedCount}
- **Misaligned:** ${result.summary.misalignedCount}

## Breakdown

- Missing DB: ${result.summary.byStatus.missing_db}
- Missing API: ${result.summary.byStatus.missing_api}
- Type mismatch: ${result.summary.byStatus.type_mismatch}
- Nullability mismatch: ${result.summary.byStatus.nullability_mismatch}

${result.errors.length > 0 ? `## Errors\n\n${result.errors.map((e) => `
### ${e.fieldPath}

**Code:** \`${e.code}\`
**Message:** ${e.message}
**Location:** ${e.location.file}:${e.location.line}:${e.location.column}
${e.suggestion ? `\n**Suggestion:** ${e.suggestion}` : ''}
`).join('\n')}` : ''}
  `;
}

main().catch(console.error);
```

---

## Error Handling

### Handling Validation Errors

```typescript
try {
  const result = await validator.validate();

  if (!result.passed) {
    // Group errors by type
    const errorsByType = new Map<string, ValidationError[]>();

    result.errors.forEach((error) => {
      const errors = errorsByType.get(error.code) || [];
      errors.push(error);
      errorsByType.set(error.code, errors);
    });

    // Handle each error type
    for (const [code, errors] of errorsByType.entries()) {
      switch (code) {
        case ErrorCode.FIELD_MISSING_DB:
          console.log('\nMissing Database Columns:');
          errors.forEach((e) => {
            console.log(`  ${e.fieldPath}`);
            console.log(`    ${e.suggestion}`);
          });
          break;

        case ErrorCode.TYPE_MISMATCH:
          console.log('\nType Mismatches:');
          errors.forEach((e) => {
            console.log(`  ${e.fieldPath}: ${e.message}`);
          });
          break;

        // Handle other error types...
      }
    }
  }
} catch (error) {
  if (error instanceof Error) {
    console.error('Validation failed:', error.message);

    // Handle specific error types
    if (error.message.includes('ECONNREFUSED')) {
      console.error('Cannot connect to database. Is PostgreSQL running?');
    } else if (error.message.includes('GraphQL introspection failed')) {
      console.error('Cannot introspect API. Is the GraphQL server running?');
    }
  }

  process.exit(1);
}
```

### Retry Logic

```typescript
async function validateWithRetry(
  validator: SchemaValidator,
  maxRetries = 3
): Promise<ValidationResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await validator.validate();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        console.log(`Attempt ${attempt} failed, retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw new Error(
    `Validation failed after ${maxRetries} attempts: ${lastError?.message}`
  );
}

// Usage
const result = await validateWithRetry(validator);
```

---

## See Also

- [README.md](./README.md) - User guide and CLI documentation
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues and solutions
- [Type Mapping Reference](./README.md#type-mapping-reference)
- [Examples Directory](./examples/) - Code examples and recipes
