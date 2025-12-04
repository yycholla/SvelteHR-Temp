# Troubleshooting Guide

Comprehensive troubleshooting guide for common issues with the Schema Validator tool.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Connection Problems](#connection-problems)
- [Configuration Errors](#configuration-errors)
- [Type Mapping Issues](#type-mapping-issues)
- [Validation Errors](#validation-errors)
- [Performance Issues](#performance-issues)
- [Debugging Tips](#debugging-tips)
- [FAQ](#faq)

---

## Installation Issues

### Node.js Version Error

**Problem:**

```
error schema-validator@1.0.0: The engine "node" is incompatible with this module
```

**Cause:** Schema Validator requires Node.js >= 20.0.0

**Solution:**

```bash
# Check current Node.js version
node --version

# Update Node.js using nvm
nvm install 20
nvm use 20

# Or using your system package manager
# macOS with Homebrew:
brew update
brew upgrade node

# Ubuntu/Debian:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### TypeScript Compilation Errors

**Problem:**

```
error TS2307: Cannot find module 'schema-validator'
```

**Cause:** Missing TypeScript type definitions

**Solution:**

```bash
# Ensure @types/node is installed
npm install --save-dev @types/node

# Regenerate TypeScript declaration files
npm run build

# Check your tsconfig.json includes:
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### ESM Module Errors

**Problem:**

```
Error [ERR_REQUIRE_ESM]: require() of ES Module not supported
```

**Cause:** Schema Validator uses ES modules

**Solution:**

Ensure your `package.json` includes:

```json
{
  "type": "module"
}
```

Or rename your config file from `.js` to `.mjs`:

```bash
mv schema-validator.config.js schema-validator.config.mjs
```

---

## Connection Problems

### Database Connection Failed

**Problem:**

```
❌ Error: Failed to connect to database
ECONNREFUSED 127.0.0.1:5432
```

**Diagnosis Checklist:**

1. **Is PostgreSQL running?**

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Or for macOS:
brew services list | grep postgresql

# Start PostgreSQL if stopped
sudo systemctl start postgresql  # Linux
brew services start postgresql   # macOS
```

2. **Can you connect manually?**

```bash
psql -h localhost -p 5432 -U your_user -d your_database
```

3. **Is the connection string correct?**

```javascript
// Format: postgresql://username:password@host:port/database
const connectionString = 'postgresql://user:password@localhost:5432/mydb';
```

**Common Fixes:**

**Wrong host/port:**

```json
{
  "database": {
    "connectionString": "postgresql://user:password@localhost:5432/mydb"
    // NOT: "postgresql://user:password@127.0.0.1:5433/mydb"
  }
}
```

**Authentication failure:**

```bash
# Update pg_hba.conf to allow password authentication
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Change:
# local   all   all   peer
# TO:
# local   all   all   md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

**SSL/TLS issues:**

```json
{
  "database": {
    "connectionString": "postgresql://...",
    "ssl": true, // Add if your database requires SSL
    "sslMode": "require" // Or "prefer" / "allow" / "disable"
  }
}
```

### API Connection Failed

**Problem:**

```
❌ GraphQL introspection failed: ECONNREFUSED
```

**Diagnosis Checklist:**

1. **Is the API server running?**

```bash
# Check if API is accessible
curl http://localhost:8080/graphql

# Or check with GraphQL introspection query
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'
```

2. **Is introspection enabled?**

Some GraphQL servers disable introspection in production. Check your API configuration:

**For async-graphql (Rust):**

```rust
// Ensure introspection is enabled
let schema = Schema::build(QueryRoot, MutationRoot, EmptySubscription)
    .enable_federation()
    .enable_subscription_in_federation()
    .finish();
```

**For Apollo Server (Node.js):**

```javascript
const server = new ApolloServer({
  schema,
  introspection: true, // Enable introspection
  playground: true,
});
```

3. **Are authentication headers correct?**

```json
{
  "api": {
    "endpoint": "http://localhost:8080/graphql",
    "headers": {
      "Authorization": "Bearer YOUR_TOKEN_HERE"
    }
  }
}
```

**Test authentication:**

```bash
# With Bearer token
curl -X POST http://localhost:8080/graphql \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'
```

### CORS Errors

**Problem:**

```
Access to fetch at 'http://localhost:8080/graphql' has been blocked by CORS policy
```

**Cause:** Schema Validator is a Node.js CLI tool and shouldn't have CORS issues. If you see this, you're likely running validation in a browser context.

**Solution:** Schema Validator must run server-side (Node.js), not in the browser.

---

## Configuration Errors

### Invalid Configuration File

**Problem:**

```
❌ Error: Invalid configuration file
Validation error: "databaseUrl" is required
```

**Solution:**

Ensure your `schema-validator.config.json` has all required fields:

```json
{
  "sources": {
    "directory": "./src/routes",
    "extensions": [".ts", ".svelte"],
    "excludePatterns": ["**/*.test.ts"]
  },
  "database": {
    "connectionString": "postgresql://user:password@localhost:5432/mydb",
    "schema": "public"
  },
  "api": {
    "endpoint": "http://localhost:8080/graphql"
  },
  "validation": {
    "strict": true,
    "allowComputedFields": true
  }
}
```

### Environment Variables Not Working

**Problem:**

```
Error: Invalid connection string
```

**Cause:** Environment variable interpolation syntax incorrect

**Solution:**

Use `${VAR_NAME}` syntax (NOT `$VAR_NAME` or `{VAR_NAME}`):

```json
{
  "database": {
    "connectionString": "${DATABASE_URL}"
  },
  "api": {
    "endpoint": "${API_URL}",
    "headers": {
      "Authorization": "Bearer ${API_TOKEN}"
    }
  }
}
```

Ensure environment variables are set:

```bash
# Export variables
export DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
export API_URL="http://localhost:8080/graphql"
export API_TOKEN="your-api-token"

# Or use .env file with dotenv
npm install --save-dev dotenv

# At the top of your script:
import 'dotenv/config';
```

### Path Resolution Issues

**Problem:**

```
❌ No GraphQL operations found in ./src/**/*.ts
```

**Diagnosis:**

```bash
# Test glob pattern manually
npx glob "./src/**/*.{ts,svelte}"

# Check current working directory
pwd
```

**Solution:**

Use absolute paths or ensure pattern is relative to config file location:

```json
{
  "sources": {
    "directory": "./src/routes", // Relative to config file
    // OR
    "directory": "/absolute/path/to/src/routes"
  }
}
```

---

## Type Mapping Issues

### Type Mismatch: Custom PostgreSQL Types

**Problem:**

```
❌ Type mismatch: GraphQL String vs DB citext
Unknown PostgreSQL type: citext
```

**Solution:**

Add custom type mapping for PostgreSQL extensions:

```json
{
  "typeMappings": {
    "citext": "String",
    "ltree": "String",
    "geometry": "JSON",
    "geography": "JSON"
  }
}
```

### Type Mismatch: Custom GraphQL Scalars

**Problem:**

```
❌ Type mismatch: GraphQL DateTime vs DB timestamptz
Unknown GraphQL scalar: DateTime
```

**Solution:**

Ensure custom scalars are properly mapped:

```json
{
  "typeMappings": {
    "timestamptz": "DateTime",
    "date": "Date",
    "time": "Time",
    "jsonb": "JSON"
  }
}
```

Also ensure your GraphQL schema defines these scalars:

```graphql
scalar DateTime
scalar Date
scalar Time
scalar JSON
```

### BigInt Overflow Warning

**Problem:**

```
⚠️  Warning: PostgreSQL int8 may overflow GraphQL Int
```

**Cause:** GraphQL `Int` type is 32-bit, but PostgreSQL `int8` (bigint) is 64-bit

**Solutions:**

**Option 1:** Use String type for large integers

```json
{
  "typeMappings": {
    "int8": "String",
    "bigint": "String"
  }
}
```

**Option 2:** Use custom BigInt scalar

```graphql
scalar BigInt

type User {
  id: BigInt! # Instead of Int!
}
```

```json
{
  "typeMappings": {
    "int8": "BigInt",
    "bigint": "BigInt"
  }
}
```

**Option 3:** Change database column type

```sql
-- If values fit in 32-bit range
ALTER TABLE users ALTER COLUMN id TYPE int4;
```

### Array Type Mismatch

**Problem:**

```
❌ Type mismatch: GraphQL String vs DB text[]
Array type mismatch
```

**Solution:**

Ensure both GraphQL and database use array types:

```graphql
# GraphQL schema
type User {
  tags: [String!]! # Array of non-null strings
}
```

```sql
-- Database schema
CREATE TABLE users (
  tags text[] NOT NULL
);
```

Or add proper mapping:

```json
{
  "typeMappings": {
    "text[]": "[String]",
    "int4[]": "[Int]",
    "uuid[]": "[ID]"
  }
}
```

---

## Validation Errors

### False Positive: Computed Fields

**Problem:**

```
❌ Field missing in database: User.fullName
```

**Cause:** Computed fields (derived values) don't have direct database columns

**Solution:**

Mark as computed field:

```bash
# CLI method
schema-validator compute add User.fullName \
  --source-columns "first_name,last_name" \
  --resolver "src/resolvers/user.ts:45" \
  --description "Concatenated full name"

# Or in config:
```

```json
{
  "validation": {
    "allowComputedFields": true,
    "computedFields": ["User.fullName", "User.displayName", "Order.total", "Product.averageRating"]
  }
}
```

### Nullability Mismatch

**Problem:**

```
❌ Nullability mismatch: GraphQL requires non-null but DB allows null
Field: User.email
GraphQL: String! (non-null)
Database: text NULL (nullable)
```

**Diagnosis:**

This is a **critical error** that can cause runtime exceptions. If GraphQL promises a non-null value but the database allows null, queries will fail when encountering null values.

**Solutions:**

**Option 1:** Make database column NOT NULL (recommended)

```sql
-- Add NOT NULL constraint
ALTER TABLE users
ALTER COLUMN email SET NOT NULL;

-- If existing nulls need handling first:
UPDATE users SET email = 'unknown@example.com' WHERE email IS NULL;
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
```

**Option 2:** Make GraphQL field nullable

```graphql
type User {
  email: String # Remove ! to allow null
}
```

**Option 3:** Add default value in database

```sql
ALTER TABLE users
ALTER COLUMN email SET DEFAULT 'noemail@example.com';

ALTER TABLE users
ALTER COLUMN email SET NOT NULL;
```

### Missing Database Column

**Problem:**

```
❌ Field missing in database: User.phoneNumber
GraphQL queries this field but no corresponding column exists
```

**Solution:**

**Option 1:** Add database column (if field should be persisted)

```sql
ALTER TABLE users
ADD COLUMN phone_number varchar(20);
```

**Option 2:** Remove from GraphQL query (if not needed)

```graphql
# Remove phoneNumber from query
query GetUser($id: ID!) {
  user(id: $id) {
    id
    email
    # phoneNumber  # Remove this line
  }
}
```

**Option 3:** Mark as computed field (if derived from other columns)

```json
{
  "validation": {
    "computedFields": ["User.phoneNumber"]
  }
}
```

### Missing API Resolver

**Problem:**

```
❌ Field missing in API: User.address
Database column exists but not exposed by the API
```

**Solution:**

Add resolver to your GraphQL API:

**For Rust (async-graphql):**

```rust
#[Object]
impl User {
    async fn address(&self) -> &str {
        &self.address
    }
}
```

**For TypeScript (TypeGraphQL):**

```typescript
@ObjectType()
class User {
  @Field()
  address: string;
}
```

**For Node.js (Apollo Server):**

```javascript
const resolvers = {
  User: {
    address: (parent) => parent.address,
  },
};
```

---

## Performance Issues

### Slow Validation

**Problem:**

```
Validation took 45 seconds to complete
```

**Diagnosis:**

```bash
# Run with verbose output to identify bottleneck
schema-validator validate --verbose

# Check which step is slow:
# - Parsing operations: Check file count and size
# - Database introspection: Check table/column count
# - API introspection: Check schema size
```

**Solutions:**

**Enable caching:**

```json
{
  "cache": {
    "enabled": true,
    "directory": ".schema-cache",
    "ttl": 3600 // Cache for 1 hour
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

**Reduce scope with filters:**

```bash
# Validate only specific type
schema-validator validate --filter-type User

# Validate only specific files
schema-validator validate --filter-page "src/routes/users/**"
```

**Use incremental validation:**

```bash
# Instead of full validation, check cache first
schema-validator check

# Only run full validation when needed
schema-validator validate --full
```

**Optimize database queries:**

```json
{
  "database": {
    "schema": "public", // Specify schema to avoid scanning all schemas
    "excludeTables": ["migrations", "pg_*"] // Exclude irrelevant tables
  }
}
```

### Memory Issues

**Problem:**

```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Solutions:**

**Increase Node.js heap size:**

```bash
# Temporary
NODE_OPTIONS="--max-old-space-size=4096" schema-validator validate

# Or in package.json scripts
{
  "scripts": {
    "validate": "NODE_OPTIONS='--max-old-space-size=4096' schema-validator validate"
  }
}
```

**Process files in batches:**

```typescript
import { SchemaValidator } from 'schema-validator';
import { glob } from 'glob';

const validator = new SchemaValidator(config);
const files = await glob('./src/**/*.{ts,svelte}');

// Process in batches of 50 files
const batchSize = 50;
for (let i = 0; i < files.length; i += batchSize) {
  const batch = files.slice(i, i + batchSize);
  const result = await validator.validateFiles(batch);

  if (!result.passed) {
    console.error(`Batch ${i / batchSize + 1} failed`);
  }
}
```

### Cache Not Working

**Problem:**

```
Cache hit: false
Running full validation even though nothing changed
```

**Diagnosis:**

```bash
# Check cache directory exists
ls -la .schema-cache/

# View cache stats
schema-validator cache stats
```

**Solutions:**

**Ensure cache directory is writable:**

```bash
# Check permissions
ls -ld .schema-cache/

# Fix permissions if needed
chmod 755 .schema-cache/
```

**Clear stale cache:**

```bash
# Clear all cache
schema-validator cache clear --all

# Or delete cache directory
rm -rf .schema-cache/
mkdir .schema-cache/
```

**Verify cache TTL is appropriate:**

```json
{
  "cache": {
    "enabled": true,
    "ttl": 3600 // 1 hour (not too short)
  }
}
```

---

## Debugging Tips

### Enable Verbose Logging

```bash
# CLI verbose mode
schema-validator validate --verbose

# Or set environment variable
DEBUG=schema-validator:* schema-validator validate
```

### Inspect Parsed Operations

```typescript
import { GraphQLParser } from 'schema-validator';

const parser = new GraphQLParser();
const operations = await parser.parseFile('./src/routes/users/+page.svelte');

console.log('Parsed operations:', JSON.stringify(operations, null, 2));
```

### Inspect Database Schema

```typescript
import { DatabaseIntrospector } from 'schema-validator';

const introspector = new DatabaseIntrospector(process.env.DATABASE_URL!);
await introspector.connect();

const columns = await introspector.introspectSchema();
console.log('Database columns:', JSON.stringify(columns, null, 2));

await introspector.disconnect();
```

### Inspect API Schema

```typescript
import { ApiIntrospector } from 'schema-validator';

const introspector = new ApiIntrospector(process.env.API_URL!, {
  Authorization: `Bearer ${process.env.API_TOKEN}`,
});

const schema = await introspector.introspectSchema();
console.log('API schema:', JSON.stringify(schema, null, 2));
```

### Test Type Compatibility

```typescript
import { TypeComparator } from 'schema-validator';

const comparator = new TypeComparator();

// Test specific type pairs
console.log('String vs text:', comparator.areTypesCompatible('String', 'text'));
console.log('Int vs int8:', comparator.areTypesCompatible('Int', 'int8'));
console.log('[String] vs text[]:', comparator.areTypesCompatible('[String]', 'text[]'));

// Get detailed comparison
const result = comparator.compareTypes('String!', 'text', 'String!');
console.log('Comparison result:', JSON.stringify(result, null, 2));
```

### Generate Detailed Report

```bash
# JSON report for debugging
schema-validator report --format json -o debug-report.json

# Markdown report with all details
schema-validator report --format markdown -o debug-report.md

# View specific field alignment
jq '.alignments[] | select(.fieldPath == "User.email")' debug-report.json
```

---

## FAQ

### Q: Can I use this with MongoDB or other NoSQL databases?

**A:** No, Schema Validator is designed specifically for PostgreSQL and GraphQL APIs. NoSQL databases don't have rigid schemas that can be validated in the same way.

### Q: Does this work with GraphQL Federation?

**A:** Partial support. The tool can validate individual federated services, but doesn't currently validate cross-service relationships. Run validation separately for each service.

### Q: Can I disable strict mode?

**A:** Yes, set `"strict": false` in config. Strict mode treats warnings as errors.

```json
{
  "validation": {
    "strict": false // Warnings don't fail validation
  }
}
```

### Q: How do I handle GraphQL interfaces and unions?

**A:** Schema Validator validates concrete types. For interfaces/unions, validation checks each implementing type separately.

```graphql
interface Node {
  id: ID!
}

type User implements Node {
  id: ID!
  email: String!
}

type Post implements Node {
  id: ID!
  title: String!
}

# Validator checks User.id and Post.id separately
```

### Q: Can I validate GraphQL fragments?

**A:** Yes, fragments are automatically resolved during parsing. Validation checks all fields including those from fragments.

```graphql
fragment UserFields on User {
  id
  email
}

query GetUser($id: ID!) {
  user(id: $id) {
    ...UserFields # Validated as if fields were inline
  }
}
```

### Q: How do I handle different database schemas (not just 'public')?

**A:** Specify schema name in config:

```json
{
  "database": {
    "schema": "my_schema" // Or "public", "internal", etc.
  }
}
```

### Q: Can I run validation in CI/CD?

**A:** Yes! Schema Validator is designed for CI/CD:

```yaml
# .github/workflows/validate.yml
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

### Q: How do I handle migrations?

**A:** Run validation after applying migrations to ensure schema is still aligned:

```bash
# Apply migrations
npm run migrate

# Clear cache to force fresh introspection
schema-validator cache clear --database

# Validate
schema-validator validate
```

### Q: Can I ignore specific fields?

**A:** Use computed fields configuration to skip validation for specific fields:

```json
{
  "validation": {
    "computedFields": ["User.ignoredField"]
  }
}
```

Or use filter flags:

```bash
schema-validator validate --exclude-field "User.temporaryField"
```

### Q: Does this support GraphQL subscriptions?

**A:** Yes, subscriptions are validated the same as queries and mutations:

```graphql
subscription OnUserCreated {
  userCreated {
    id
    email
  }
}

# Validates that User.id and User.email exist in DB and API
```

### Q: How do I test the validator itself?

**A:** Run the test suite:

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# With coverage
npm run test:coverage
```

### Q: Can I extend the validator with custom validation rules?

**A:** Not directly, but you can post-process validation results:

```typescript
const result = await validator.validate();

// Add custom validation
result.alignments.forEach((alignment) => {
  if (alignment.fieldPath.includes('password')) {
    alignment.warnings = [
      ...alignment.warnings,
      { message: 'Sensitive field detected', category: 'security' },
    ];
  }
});
```

---

## Still Having Issues?

If your problem isn't covered here:

1. **Check existing issues**: [GitHub Issues](https://github.com/yourorg/schema-validator/issues)
2. **Enable debug logging**: `DEBUG=schema-validator:* schema-validator validate`
3. **Generate debug report**: `schema-validator report --format json -o debug.json`
4. **Open a new issue**: Include debug report, config file, and error messages

**When reporting issues, please include:**

- Node.js version (`node --version`)
- Schema Validator version (`schema-validator --version`)
- Operating system
- Configuration file (redact sensitive info)
- Full error message and stack trace
- Steps to reproduce

---

## Related Documentation

- [README.md](./README.md) - User guide and getting started
- [API.md](./API.md) - Programmatic API documentation
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contributing guidelines
