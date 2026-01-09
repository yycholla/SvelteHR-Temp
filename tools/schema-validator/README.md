# Schema Validator

**Frontend-Backend GraphQL API Schema Alignment Validation Tool**

A comprehensive TypeScript-based CLI tool for validating schema alignment across three critical layers of your application stack:

1. **Frontend GraphQL Queries** - Operations in your SvelteKit routes
2. **PostgreSQL Database Schema** - Table columns and types
3. **Backend API (Rust/PostGraphile)** - GraphQL resolvers and types

## Features

- **Three-Way Alignment Validation** - Ensures GraphQL queries, database columns, and API resolvers are in sync
- **Type Compatibility Checking** - Validates PostgreSQL ↔ GraphQL ↔ Rust type mappings
- **Nullability Analysis** - Detects mismatches between nullable/non-null constraints
- **Computed Field Support** - Handle derived fields that don't map directly to database columns
- **Intelligent Caching** - Fast validation with smart cache invalidation
- **Pre-commit Hook Integration** - Validate staged files before commit
- **Multiple Output Formats** - Terminal, JSON, Markdown, HTML reports
- **Conflict Resolution Suggestions** - Actionable SQL migrations and resolver templates

## Installation

### Prerequisites

- Node.js >= 20.0.0
- PostgreSQL database with accessible schema
- GraphQL API endpoint (Rust backend with async-graphql or PostGraphile)

### Install as Dev Dependency

```bash
npm install --save-dev schema-validator
```

### Global Installation

```bash
npm install -g schema-validator
```

## Quick Start

### 1. Initialize Configuration

```bash
npx schema-validator init --install-hooks
```

This creates `schema-validator.config.json` with default settings and optionally installs Git pre-commit hooks.

### 2. Configure Your Environment

Edit `schema-validator.config.json`:

```json
{
  "sources": {
    "directory": "./src/routes",
    "extensions": [".ts", ".svelte"],
    "excludePatterns": ["**/*.test.ts", "**/node_modules/**"]
  },
  "database": {
    "connectionString": "postgresql://user:password@localhost:5432/dbname",
    "schema": "public",
    "introspectionCache": true,
    "cacheTTL": 3600
  },
  "api": {
    "endpoint": "http://localhost:8080/graphql",
    "headers": {
      "Authorization": "Bearer ${API_TOKEN}"
    },
    "introspectionCache": true
  },
  "validation": {
    "strict": true,
    "allowComputedFields": true,
    "computedFields": ["User.fullName", "Employee.displayName"]
  },
  "output": {
    "format": "terminal",
    "colors": true,
    "verbose": false
  },
  "cache": {
    "enabled": true,
    "directory": ".schema-cache",
    "ttl": 3600
  }
}
```

### 3. Run Validation

```bash
# Full validation
npx schema-validator validate

# Quick check using cache
npx schema-validator check

# Generate detailed report
npx schema-validator report --format markdown -o alignment-report.md
```

## CLI Commands

### `validate` - Full Schema Validation

Performs complete three-way alignment validation.

```bash
schema-validator validate [options]

Options:
  --full                   Run full validation without cache
  --staged                 Validate only staged files (pre-commit)
  --json                   Output JSON format
  --no-cache              Skip cache usage
  --filter-field <pattern> Filter by field path (e.g., "User.email")
  --filter-type <pattern>  Filter by type name (e.g., "User")
  --filter-page <pattern>  Filter by file path pattern
```

**Examples:**

```bash
# Full validation
schema-validator validate

# Validate only staged files (for pre-commit hooks)
schema-validator validate --staged

# Validate specific type
schema-validator validate --filter-type User

# JSON output for CI/CD
schema-validator validate --json --no-cache
```

### `check` - Quick Status Check

Fast validation using cached results.

```bash
schema-validator check [options]

Options:
  --field <pattern>  Filter by field path
  --type <pattern>   Filter by type name
  --page <pattern>   Filter by page/file
```

**Examples:**

```bash
# Quick status check
schema-validator check

# Check specific field
schema-validator check --field "User.email"
```

### `report` - Generate Alignment Reports

Create detailed reports in various formats.

```bash
schema-validator report [options]

Options:
  -f, --format <format>  Report format: terminal, json, markdown, html
  --filter <type>        Filter by: field, type, page
  -o, --output <path>    Output file path (default: stdout)
  --errors-only          Include only errors, exclude warnings
```

**Examples:**

```bash
# Terminal report
schema-validator report

# Markdown report
schema-validator report -f markdown -o report.md

# JSON for automated processing
schema-validator report -f json -o report.json

# HTML report for sharing
schema-validator report -f html -o report.html --errors-only
```

### `compute` - Manage Computed Fields

Configure fields that don't map directly to database columns.

```bash
schema-validator compute add <fieldPath> [options]
schema-validator compute list [options]

Options (add):
  --source-columns <columns>  Comma-separated source columns
  --resolver <location>       Resolver location (file:line)
  --description <desc>        Field description
  --return-type <type>        GraphQL return type (default: String)

Options (list):
  --json  Output as JSON
```

**Examples:**

```bash
# Add computed field
schema-validator compute add User.fullName \
  --source-columns "first_name,last_name" \
  --resolver "src/resolvers/user.ts:45" \
  --description "Concatenated full name" \
  --return-type "String!"

# List all computed fields
schema-validator compute list

# JSON output
schema-validator compute list --json
```

### `cache` - Cache Management

Manage validation cache for performance optimization.

```bash
schema-validator cache clear [options]
schema-validator cache stats

Options (clear):
  --all         Clear all cache types
  --database    Clear database cache only
  --api         Clear API cache only
  --operations  Clear operations cache only
```

**Examples:**

```bash
# Clear all cache
schema-validator cache clear --all

# Clear only database cache
schema-validator cache clear --database

# View cache statistics
schema-validator cache stats
```

### `history` - Validation History

View past validation runs and their results.

```bash
schema-validator history [options]

Options:
  --limit <n>         Limit number of results (default: 10)
  --format <format>   Output format: table, json (default: table)
```

**Examples:**

```bash
# Show last 10 runs
schema-validator history

# Show last 50 runs
schema-validator history --limit 50

# JSON format
schema-validator history --format json
```

### `init` - Initialize Configuration

Bootstrap schema validator in your project.

```bash
schema-validator init [options]

Options:
  --install-hooks       Install pre-commit hooks
  --cache-dir <path>    Cache directory path (default: .schema-cache)
  --custom-dir <path>   Custom configuration directory
```

## Configuration Reference

### Sources Configuration

```json
{
  "sources": {
    "directory": "./src/routes",
    "extensions": [".ts", ".svelte"],
    "excludePatterns": ["**/*.test.ts"]
  }
}
```

- `directory`: Root directory to scan for GraphQL operations
- `extensions`: File extensions to parse
- `excludePatterns`: Glob patterns to exclude

### Database Configuration

```json
{
  "database": {
    "connectionString": "postgresql://...",
    "schema": "public",
    "introspectionCache": true,
    "cacheTTL": 3600,
    "ssl": false
  }
}
```

- `connectionString`: PostgreSQL connection string
- `schema`: Database schema name (default: `public`)
- `introspectionCache`: Enable schema introspection caching
- `cacheTTL`: Cache time-to-live in seconds
- `ssl`: Enable SSL connection (optional)

### API Configuration

```json
{
  "api": {
    "endpoint": "http://localhost:8080/graphql",
    "headers": {
      "Authorization": "Bearer ${API_TOKEN}",
      "X-Custom-Header": "value"
    },
    "introspectionCache": true,
    "timeout": 30000
  }
}
```

- `endpoint`: GraphQL API endpoint URL
- `headers`: HTTP headers for API requests (supports env variable interpolation)
- `introspectionCache`: Enable API schema introspection caching
- `timeout`: Request timeout in milliseconds

### Validation Configuration

```json
{
  "validation": {
    "strict": true,
    "allowComputedFields": true,
    "computedFields": ["User.fullName", "Order.total"],
    "customComputedFieldsPath": "./computed-fields.json"
  }
}
```

- `strict`: Enable strict validation mode (fails on warnings)
- `allowComputedFields`: Allow fields without direct database mapping
- `computedFields`: List of computed field paths
- `customComputedFieldsPath`: External computed fields configuration file

### Type Mappings Configuration (Advanced)

Override default type mappings:

```json
{
  "typeMappings": {
    "citext": "String",
    "geometry": "JSON",
    "custom_enum": "CustomEnumType"
  }
}
```

## Type Mapping Reference

### Default Type Mappings

| GraphQL Type | PostgreSQL Types                               | Rust Type (async-graphql) | Notes                      |
| ------------ | ---------------------------------------------- | ------------------------- | -------------------------- |
| `String`     | `text`, `varchar`, `char`                      | `String`                  | Standard text types        |
| `String`     | `uuid`                                         | `Uuid`                    | UUID as GraphQL string     |
| `Int`        | `int4`, `int2`, `integer`, `smallint`          | `i32`                     | 32-bit integers            |
| `Int`        | `int8`, `bigint`                               | `i64`                     | ⚠️ BigInt may overflow     |
| `Float`      | `float4`, `float8`, `real`, `double precision` | `f64`                     | Floating point             |
| `Float`      | `numeric`, `decimal`                           | `BigDecimal`              | ⚠️ Precision loss possible |
| `Boolean`    | `bool`, `boolean`                              | `bool`                    | Boolean values             |
| `ID`         | `uuid`, `int4`, `int8`, `text`                 | `ID`                      | Flexible ID type           |
| `DateTime`   | `timestamp`, `timestamptz`                     | `DateTime<Utc>`           | Requires DateTime scalar   |
| `Date`       | `date`                                         | `NaiveDate`               | Requires Date scalar       |
| `Time`       | `time`, `timetz`                               | `NaiveTime`               | Requires Time scalar       |
| `JSON`       | `json`, `jsonb`                                | `serde_json::Value`       | Requires JSON scalar       |
| `[String]`   | `text[]`, `varchar[]`                          | `Vec<String>`             | Array types                |
| `[Int]`      | `int4[]`, `integer[]`                          | `Vec<i32>`                | Array types                |

### Custom Scalars

If your schema uses custom scalar types, configure them:

```json
{
  "typeMappings": {
    "Decimal": "numeric",
    "BigInt": "int8",
    "Email": "text",
    "URL": "text"
  }
}
```

## Alignment Status Types

The validator reports the following alignment statuses:

### ✅ Aligned

All three layers (GraphQL, Database, API) are in sync.

### ❌ Missing Database Column

Field exists in GraphQL query but no corresponding database column found.

**Suggested Fix**: SQL migration

```sql
ALTER TABLE users ADD COLUMN email text NOT NULL;
```

### ❌ Missing API Resolver

Database column exists but not exposed by the API.

**Suggested Fix**: Add Rust resolver

```rust
#[graphql(name = "email")]
async fn email(&self) -> &str {
    &self.email
}
```

### ❌ Type Mismatch

Types are incompatible across layers (e.g., GraphQL `String` vs DB `int4`).

**Suggested Fix**: Update GraphQL type or database column type.

### ⚠️ Nullability Mismatch

Nullability constraints don't match (e.g., GraphQL requires non-null but DB allows null).

**Suggested Fix**:

```sql
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
```

## Computed Fields

Computed fields are derived values that don't map directly to database columns.

### Configuration

**In schema-validator.config.json:**

```json
{
  "validation": {
    "allowComputedFields": true,
    "computedFields": ["User.fullName", "Employee.displayName", "Order.total"]
  }
}
```

**Or use external file (`computed-fields.json`):**

```json
{
  "User.fullName": {
    "sourceColumns": ["first_name", "last_name"],
    "resolverLocation": "src/resolvers/user.ts:45",
    "returnType": "String!",
    "description": "Concatenated full name"
  },
  "Order.total": {
    "sourceColumns": ["subtotal", "tax", "shipping"],
    "resolverLocation": "src/resolvers/order.rs:120",
    "returnType": "Float!",
    "description": "Calculated order total"
  }
}
```

### CLI Management

```bash
# Add computed field
schema-validator compute add User.fullName \
  --source-columns "first_name,last_name" \
  --resolver "src/resolvers/user.ts:45" \
  --description "Full name" \
  --return-type "String!"

# List computed fields
schema-validator compute list
```

## Pre-commit Hook Integration

Automatically validate schema alignment before commits.

### Installation

```bash
schema-validator init --install-hooks
```

This creates `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run schema validation on staged files
npx schema-validator validate --staged
```

### Manual Setup

If you use a different Git hook manager:

```bash
# .git/hooks/pre-commit
#!/bin/bash
npx schema-validator validate --staged || exit 1
```

### CI/CD Integration

**GitHub Actions:**

```yaml
name: Schema Validation

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm install
      - run: npx schema-validator validate --json --no-cache
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          API_TOKEN: ${{ secrets.API_TOKEN }}
```

## Caching Strategy

The validator uses intelligent caching to speed up validation:

### Cache Types

1. **Database Schema Cache** - PostgreSQL introspection results
2. **API Schema Cache** - GraphQL API introspection
3. **Operations Cache** - Parsed GraphQL operations from source files

### Cache Invalidation

Cache is automatically invalidated when:

- Database schema changes (detected via introspection hash)
- API schema changes (detected via schema hash)
- Source files are modified (detected via file modification time)

### Cache Management

```bash
# View cache statistics
schema-validator cache stats

# Clear specific cache
schema-validator cache clear --database

# Clear all cache
schema-validator cache clear --all
```

## Troubleshooting

### Connection Issues

**Problem**: "Failed to connect to database"

**Solutions**:

1. Verify `connectionString` in config
2. Check database is running and accessible
3. Verify credentials and permissions
4. Check firewall/network settings

**Problem**: "GraphQL introspection failed"

**Solutions**:

1. Verify `api.endpoint` URL is correct
2. Check API server is running
3. Verify authentication headers
4. Ensure introspection is enabled on API

### Type Mismatch Issues

**Problem**: "Type mismatch: GraphQL String vs DB int4"

**Solutions**:

1. Update GraphQL query to use `Int` type
2. Change database column type with migration
3. Add custom type mapping in config

### Nullability Issues

**Problem**: "GraphQL requires non-null but DB allows null"

**Solutions**:

1. Make database column NOT NULL:
   ```sql
   ALTER TABLE users ALTER COLUMN email SET NOT NULL;
   ```
2. Make GraphQL field nullable: Change `String!` to `String`

### Performance Issues

**Problem**: Validation is slow

**Solutions**:

1. Enable caching: `"introspectionCache": true`
2. Increase cache TTL: `"cacheTTL": 7200`
3. Use `check` command instead of `validate` for quick checks
4. Reduce scope with `--filter-type` or `--filter-page`

### False Positives

**Problem**: Computed fields flagged as missing

**Solutions**:

1. Add to computed fields list:
   ```bash
   schema-validator compute add User.fullName \
     --source-columns "first_name,last_name" \
     --resolver "src/resolvers/user.ts:45"
   ```
2. Enable computed fields: `"allowComputedFields": true`

## Architecture Overview

### Three-Way Alignment Model

```
┌─────────────────────┐
│  Frontend (.svelte) │
│  GraphQL Operations │
└──────────┬──────────┘
           │
           │ validation
           ▼
┌─────────────────────┐
│  Schema Validator   │
│  - Type Comparator  │
│  - Field Aligner    │
└──────────┬──────────┘
           │
           ├──────────────────┐
           │                  │
           ▼                  ▼
┌──────────────────┐  ┌──────────────────┐
│  PostgreSQL DB   │  │  Rust API        │
│  Schema          │  │  (async-graphql) │
└──────────────────┘  └──────────────────┘
```

### Validation Pipeline

1. **Source Parsing** - Extract GraphQL operations from `.ts` and `.svelte` files
2. **Database Introspection** - Query PostgreSQL information_schema
3. **API Introspection** - GraphQL introspection query to backend
4. **Field Alignment** - Compare fields across all three layers
5. **Type Validation** - Check type compatibility using mapping table
6. **Nullability Check** - Validate nullable/non-null constraints
7. **Report Generation** - Output results in requested format

### Key Components

- **GraphQL Parser** (`src/parsers/graphql-parser.ts`) - Extract operations from source
- **Database Introspector** (`src/introspectors/database-introspector.ts`) - PostgreSQL schema
- **API Introspector** (`src/introspectors/api-introspector.ts`) - GraphQL API schema
- **Type Comparator** (`src/validators/type-comparator.ts`) - Type compatibility rules
- **Field Aligner** (`src/validators/field-aligner.ts`) - Three-way alignment logic
- **Schema Validator** (`src/validators/schema-validator.ts`) - Main orchestrator

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **TypeScript strict mode** - All code must pass `--strict` compilation
2. **Unit tests** - Add tests for new features (target: 90%+ coverage)
3. **Documentation** - Update README for new features
4. **Code style** - Run `npm run lint` and `npm run format`

### Development Setup

```bash
# Clone repository
git clone https://github.com/yourorg/schema-validator.git
cd schema-validator

# Install dependencies
npm install

# Run tests
npm test

# Run in development mode
npm run dev

# Build
npm run build
```

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# Contract tests
npm run test:contract

# With coverage
npm run test:coverage
```

## License

MIT License - see LICENSE file for details

## Support

- **Issues**: [GitHub Issues](https://github.com/yourorg/schema-validator/issues)
- **Documentation**: [Full Documentation](https://docs.example.com/schema-validator)
- **Discussions**: [GitHub Discussions](https://github.com/yourorg/schema-validator/discussions)

## Acknowledgments

Built with:

- [Commander.js](https://github.com/tj/commander.js) - CLI framework
- [GraphQL.js](https://github.com/graphql/graphql-js) - GraphQL parser
- [Zod](https://github.com/colinhacks/zod) - Schema validation
- [Chalk](https://github.com/chalk/chalk) - Terminal styling
- [Vitest](https://vitest.dev/) - Testing framework
