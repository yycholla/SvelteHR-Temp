# Schema Validation Integration Guide

**Status**: ✅ Integrated and Ready
**Tool**: Schema Validator v1.0
**Location**: `tools/schema-validator/`

---

## Overview

The Schema Validator ensures three-way alignment across your application stack:

```
┌─────────────────────┐
│  SvelteKit Routes   │
│  GraphQL Operations │  (.ts, .svelte files)
└──────────┬──────────┘
           │
           │ validates
           ▼
┌─────────────────────┐
│  Schema Validator   │
│  Three-Way Check    │
└──────────┬──────────┘
           │
           ├──────────────────┐
           │                  │
           ▼                  ▼
┌──────────────────┐  ┌──────────────────┐
│  PostgreSQL DB   │  │  Rust GraphQL    │
│  hr_system       │  │  API (Port 4000) │
└──────────────────┘  └──────────────────┘
```

**What it validates:**
- ✅ GraphQL queries reference fields that exist in database
- ✅ Database columns are exposed by the API
- ✅ Types match across all three layers (String ↔ text ↔ String)
- ✅ Nullability constraints are compatible
- ✅ Array types align correctly

---

## Quick Start

### 1. Prerequisites

Ensure services are running:

```bash
# Start PostgreSQL database
cd dev-containers
docker compose -f docker-compose.dev.yml up -d postgres-dev

# Start Rust GraphQL API
cd graphql-rust-server
cargo run

# Verify API is accessible
curl http://localhost:4000/graphql
```

### 2. Run Validation

```bash
# Quick validation (uses cache)
npm run schema:check

# Full validation (no cache)
npm run schema:validate

# Full validation with fresh introspection
npm run schema:validate:full
```

### 3. View Results

```bash
# Generate Markdown report
npm run schema:report

# Generate JSON report
npm run schema:report:json

# View cache statistics
npm run schema:cache:stats
```

---

## Available Commands

### Validation Commands

```bash
# schema:validate - Standard validation with cache
npm run schema:validate

# schema:validate:full - Full validation, skip cache
npm run schema:validate:full

# schema:check - Quick check using cached results
npm run schema:check
```

### Reporting Commands

```bash
# Generate Markdown report (saved to root)
npm run schema:report

# Generate JSON report for CI/CD
npm run schema:report:json
```

### Setup Commands

```bash
# Initialize with pre-commit hooks
npm run schema:init
```

### Cache Management

```bash
# Clear all cache
npm run schema:cache:clear

# View cache statistics
npm run schema:cache:stats
```

---

## Configuration

**File**: `schema-validator.config.json` (root of project)

```json
{
  "sources": {
    "directory": "./src/routes",
    "extensions": [".ts", ".svelte"],
    "excludePatterns": ["**/*.test.ts", "**/*.spec.ts"]
  },
  "database": {
    "connectionString": "${DATABASE_URL}",
    "schema": "public"
  },
  "api": {
    "endpoint": "${PUBLIC_GRAPHQL_ENDPOINT}"
  },
  "validation": {
    "strict": true,
    "allowComputedFields": true,
    "computedFields": [
      "User.fullName",
      "Employee.displayName"
    ]
  }
}
```

**Environment Variables Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `PUBLIC_GRAPHQL_ENDPOINT` - GraphQL API endpoint

---

## Computed Fields

Computed fields are derived values that don't map directly to database columns.

### Currently Configured Computed Fields

```javascript
{
  "computedFields": [
    "User.fullName",           // first_name + last_name
    "User.displayName",        // Formatted name
    "Employee.displayName",    // employee_number + name
    "Employee.yearsOfService", // Calculated from hire_date
    "Department.employeeCount",// Count of employees
    "Order.total",             // subtotal + tax + shipping
    "Event.attendeeCount",     // Count of attendees
    "Event.isUserAttending"    // User-specific computed field
  ]
}
```

### Adding New Computed Fields

**Option 1: Via Config File**

Edit `schema-validator.config.json`:

```json
{
  "validation": {
    "computedFields": [
      "Product.averageRating"
    ]
  }
}
```

**Option 2: Via CLI**

```bash
cd tools/schema-validator
node dist/cli/index.js compute add Product.averageRating \
  --source-columns "reviews" \
  --resolver "src/resolvers/product.rs:45" \
  --description "Average product rating" \
  --return-type "Float"
```

---

## Type Mappings

### Default Mappings

| GraphQL Type | PostgreSQL Types | Rust Type | Notes |
|--------------|------------------|-----------|-------|
| `String` | `text`, `varchar`, `char` | `String` | Standard text |
| `String` | `uuid` | `Uuid` | UUID as string |
| `Int` | `int4`, `int2`, `integer` | `i32` | 32-bit integers |
| `Float` | `float4`, `float8` | `f64` | Floating point |
| `Boolean` | `bool`, `boolean` | `bool` | Boolean values |
| `ID` | `uuid`, `int4`, `text` | `ID` | Flexible ID |
| `DateTime` | `timestamptz` | `DateTime<Utc>` | Custom scalar |
| `JSON` | `json`, `jsonb` | `serde_json::Value` | Custom scalar |
| `[String]` | `text[]` | `Vec<String>` | Array types |

### Custom Type Mappings

Override default mappings in `schema-validator.config.json`:

```json
{
  "typeMappings": {
    "citext": "String",
    "uuid": "ID",
    "timestamptz": "DateTime",
    "jsonb": "JSON",
    "int8": "String"
  }
}
```

---

## CI/CD Integration

### GitHub Actions

Add to `.github/workflows/schema-validation.yml`:

```yaml
name: Schema Validation

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  validate:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres123
          POSTGRES_DB: hr_system
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: 20

      - name: Install dependencies
        run: npm install

      - name: Run database migrations
        run: npm run db:migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres123@localhost:5432/hr_system

      - name: Start Rust GraphQL server
        run: |
          cd graphql-rust-server
          cargo build --release
          ./target/release/graphql-rust-server &
          sleep 5
        env:
          DATABASE_URL: postgresql://postgres:postgres123@localhost:5432/hr_system
          PORT: 4000

      - name: Run schema validation
        run: npm run schema:validate:full
        env:
          DATABASE_URL: postgresql://postgres:postgres123@localhost:5432/hr_system
          PUBLIC_GRAPHQL_ENDPOINT: http://localhost:4000/graphql

      - name: Generate validation report
        if: failure()
        run: npm run schema:report

      - name: Upload validation report
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: schema-validation-report
          path: schema-validation-report.md
```

---

## Pre-commit Hook Integration

### Install Hooks

```bash
npm run schema:init
```

This creates `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run schema validation on staged files
npm run schema:validate --staged
```

### Manual Hook Setup

If using a different Git hook manager:

```bash
# .git/hooks/pre-commit
#!/bin/bash
set -e

echo "🔍 Running schema validation..."
npm run schema:check || {
  echo "❌ Schema validation failed!"
  echo "Run 'npm run schema:report' for details"
  exit 1
}
```

---

## Troubleshooting

### Common Issues

#### 1. Connection Refused

**Error**: `ECONNREFUSED 127.0.0.1:5432`

**Solution**:
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Start if not running
cd dev-containers
docker compose -f docker-compose.dev.yml up -d postgres-dev
```

#### 2. GraphQL Introspection Failed

**Error**: `GraphQL introspection failed`

**Solution**:
```bash
# Check Rust server is running
curl http://localhost:4000/graphql

# Start if not running
cd graphql-rust-server
cargo run
```

#### 3. Type Mismatch Errors

**Error**: `Type mismatch: GraphQL String vs DB int4`

**Solution**: Add custom type mapping or fix the mismatch:

```json
{
  "typeMappings": {
    "int4": "Int"
  }
}
```

Or update your GraphQL query:

```graphql
# Change from:
query { user { age } }  # String type

# To:
query { user { age } }  # Int type
```

#### 4. Computed Field False Positives

**Error**: `Field missing in database: User.fullName`

**Solution**: Add to computed fields list:

```bash
cd tools/schema-validator
node dist/cli/index.js compute add User.fullName \
  --source-columns "first_name,last_name"
```

### Debug Mode

```bash
# Enable verbose output
DEBUG=* npm run schema:validate

# View detailed error information
npm run schema:report
```

---

## Integration with Development Workflow

### 1. Daily Development

```bash
# Before starting work (quick check)
npm run schema:check

# After making GraphQL changes
npm run schema:validate

# Before committing (automatic with hooks)
git commit -m "Add new user fields"  # Runs validation automatically
```

### 2. Code Review Process

```bash
# Generate report for PR
npm run schema:report

# Attach schema-validation-report.md to PR description
```

### 3. Deployment Process

```bash
# Pre-deployment validation
npm run schema:validate:full

# Generate JSON report for monitoring
npm run schema:report:json

# Check critical misalignments
jq '.errors[] | select(.severity == "error")' schema-validation-report.json
```

---

## Performance Optimization

### Enable Caching

Caching speeds up validation by 10-20x:

```json
{
  "cache": {
    "enabled": true,
    "directory": ".schema-cache",
    "ttl": 3600
  },
  "database": {
    "introspectionCache": true,
    "cacheTTL": 3600
  },
  "api": {
    "introspectionCache": true
  }
}
```

### Clear Cache When Needed

```bash
# After database migrations
npm run schema:cache:clear

# After API changes
npm run schema:cache:clear

# View cache age
npm run schema:cache:stats
```

---

## Advanced Usage

### Programmatic Validation

Create custom validation scripts:

```typescript
// scripts/custom-validation.ts
import { SchemaValidator } from './tools/schema-validator/dist/validators/schema-validator.js';

const validator = new SchemaValidator({
  databaseUrl: process.env.DATABASE_URL!,
  apiUrl: process.env.PUBLIC_GRAPHQL_ENDPOINT!,
  graphqlPaths: ['./src/routes'],
  strict: true,
});

const result = await validator.validate();

if (!result.passed) {
  // Custom error handling
  console.error('Validation failed!');
  process.exit(1);
}
```

### Filter Validation

```bash
# Validate only User type
cd tools/schema-validator
node dist/cli/index.js validate --filter-type User

# Validate specific files
node dist/cli/index.js validate --filter-page "src/routes/users/**"
```

---

## Best Practices

### 1. Run Validation Frequently

- ✅ Before committing code (automatic with hooks)
- ✅ After database migrations
- ✅ After API schema changes
- ✅ Before deploying to production

### 2. Keep Computed Fields Updated

- Document all computed fields
- Add new computed fields as you create them
- Review computed fields list monthly

### 3. Use Strict Mode

Enable strict mode for production:

```json
{
  "validation": {
    "strict": true
  }
}
```

### 4. Cache Management

- Clear cache after migrations: `npm run schema:cache:clear`
- Review cache stats weekly: `npm run schema:cache:stats`
- Adjust TTL based on development speed

### 5. Monitor in CI/CD

- Run full validation on CI: `npm run schema:validate:full`
- Upload reports as artifacts
- Fail builds on validation errors

---

## Resources

- **Tool Documentation**: `tools/schema-validator/README.md`
- **API Reference**: `tools/schema-validator/API.md`
- **Troubleshooting**: `tools/schema-validator/TROUBLESHOOTING.md`
- **Project Status**: `tools/schema-validator/PROJECT_STATUS.md`

---

## Support

For issues or questions:

1. Check `tools/schema-validator/TROUBLESHOOTING.md`
2. Run with debug mode: `DEBUG=* npm run schema:validate`
3. Generate detailed report: `npm run schema:report`
4. Review error messages and suggestions

---

**Document Version**: 1.0
**Last Updated**: 2025-10-13
**Integrated By**: Schema Validator v1.0
