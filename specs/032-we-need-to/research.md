# Phase 0: Research & Technical Decisions

**Feature**: Frontend-Backend GraphQL API Schema Alignment System
**Date**: 2025-10-13
**Status**: Complete

## Research Overview

This document consolidates research findings for implementing a schema governance system that validates alignment between frontend GraphQL queries, PostgreSQL database schema, and Rust async-graphql API implementation.

## 1. GraphQL Operation Parsing Strategy

### Decision: @graphql-tools/graphql-tag-pluck

**Rationale**:
- Industry-standard tool for extracting GraphQL operations from TypeScript/JavaScript files
- Handles both inline GraphQL template literals (gql\`...\`) and imported .graphql files
- Supports parsing complex GraphQL documents with fragments, variables, and directives
- Actively maintained by The Guild (GraphQL ecosystem leaders)
- Zero-dependency extraction without requiring TypeScript compilation

**Alternatives Considered**:
1. **graphql-js parser directly**: Would require custom file traversal logic, no built-in support for extracting from code files
2. **Regex-based extraction**: Fragile, prone to false positives, cannot handle complex nested structures
3. **AST-based TypeScript parser + graphql-js**: Over-engineered, requires full TypeScript compilation pipeline

**Implementation Approach**:
```typescript
import { gqlPluckFromCodeString } from '@graphql-tools/graphql-tag-pluck';

// Extract all GraphQL operations from a TypeScript file
const operations = await gqlPluckFromCodeString(
  filePath,
  sourceCode,
  {
    modules: [
      { name: '@urql/svelte', identifier: 'gql' },
      { name: 'graphql-tag', identifier: 'gql' }
    ]
  }
);
```

**References**:
- [graphql-tag-pluck documentation](https://the-guild.dev/graphql/tools/docs/graphql-tag-pluck)
- Used successfully in Apollo Client, Relay, and other GraphQL tooling

---

## 2. Database Schema Introspection

### Decision: PostgreSQL Information Schema Queries via sqlx

**Rationale**:
- Native PostgreSQL `information_schema` provides comprehensive metadata
- sqlx provides type-safe queries with zero-cost abstractions
- No additional dependencies or ORM overhead
- Supports introspecting columns, types, constraints, enums, and foreign keys
- Already used in the Rust backend (consistency with existing codebase)

**Alternatives Considered**:
1. **pg_dump + parsing**: Slow, requires shell execution, fragile parsing
2. **TypeORM/Prisma introspection**: Node.js-only, adds heavy dependencies
3. **Custom Rust library (sea-schema)**: Additional dependency when information_schema suffices

**Implementation Approach**:
```rust
// Query all columns for a given table
let columns = sqlx::query!(
    r#"
    SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        udt_name
    FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = $2
    ORDER BY ordinal_position
    "#,
    schema_name,
    table_name
)
.fetch_all(pool)
.await?;

// Query enum types
let enums = sqlx::query!(
    r#"
    SELECT
        t.typname as enum_name,
        e.enumlabel as enum_value
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = $1)
    ORDER BY t.typname, e.enumsortorder
    "#,
    schema_name
)
.fetch_all(pool)
.await?;
```

**References**:
- [PostgreSQL Information Schema Documentation](https://www.postgresql.org/docs/current/information-schema.html)
- [sqlx PostgreSQL Type Mapping](https://docs.rs/sqlx/latest/sqlx/postgres/types/index.html)

---

## 3. Rust GraphQL Schema Introspection

### Decision: async-graphql Schema Introspection API

**Rationale**:
- async-graphql provides built-in introspection capabilities
- Can query schema at runtime without requiring separate schema export
- Type-safe introspection queries with Rust type system
- Avoids need for separate schema SDL file that could drift from implementation
- Introspection query results can be cached for performance

**Alternatives Considered**:
1. **Manual SDL file generation**: Requires separate export step, can drift from implementation
2. **GraphQL HTTP introspection query**: Requires starting server, slower, more complex
3. **Parsing Rust source code**: Extremely complex, would need to understand Rust macros and derive logic

**Implementation Approach**:
```rust
use async_graphql::{Schema, EmptySubscription};
use crate::schema::{QueryRoot, MutationRoot};

// Build schema instance
let schema = Schema::build(QueryRoot, MutationRoot, EmptySubscription)
    .finish();

// Introspect schema types
let introspection_query = r#"
{
  __schema {
    types {
      name
      kind
      fields {
        name
        type { name kind ofType { name kind } }
      }
    }
  }
}
"#;

let result = schema.execute(introspection_query).await;
// Parse result to extract all GraphQL types, fields, and their relationships
```

**References**:
- [async-graphql Schema Introspection](https://async-graphql.github.io/async-graphql/en/introspection.html)
- [GraphQL Introspection Spec](https://spec.graphql.org/October2021/#sec-Introspection)

---

## 4. Type Mapping & Validation Rules

### Decision: Explicit Type Mapping Table with Zod Schemas

**Rationale**:
- GraphQL types, PostgreSQL types, and Rust types do not have 1:1 correspondence
- Explicit mapping table documents expected conversions
- Zod schemas provide runtime validation and TypeScript type inference
- Handles nullability, arrays, and custom scalar types

**Type Mapping Table**:

| GraphQL Type | PostgreSQL Type | Rust Type | Notes |
|--------------|-----------------|-----------|-------|
| ID | uuid | Uuid | Primary keys |
| String | varchar, text | String | Text data |
| Int | integer, int4 | i32 | 32-bit integers |
| BigInt | bigint, int8 | i64 | 64-bit integers |
| Float | real, float4 | f32 | Single precision |
| Boolean | boolean | bool | True/false |
| DateTime | timestamptz | DateTime\<Utc\> | Timestamp with timezone |
| Date | date | NaiveDate | Date only |
| JSON | jsonb | serde_json::Value | JSON data |
| [T] | ARRAY | Vec\<T\> | Arrays |
| T! | NOT NULL | T | Non-nullable |
| T | NULL | Option\<T\> | Nullable |

**Validation Rules**:
1. **Field Existence**: Frontend field MUST exist as database column OR computed field in API
2. **Type Compatibility**: Types must map according to table above
3. **Nullability Match**: Nullable in frontend → nullable in DB and API
4. **Enum Value Match**: All frontend enum values must exist in DB enum type
5. **Alias Tracking**: Field aliases (e.g., `recurrencePattern` → `recurrence_rule`) must be documented

**Alternatives Considered**:
1. **Automatic type inference**: Too error-prone, lacks explicit documentation
2. **Runtime-only validation**: No TypeScript type safety for validation logic
3. **JSON Schema**: Less ergonomic than Zod, no type inference

**Implementation Approach**:
```typescript
import { z } from 'zod';

const FieldAlignmentSchema = z.object({
  frontendField: z.string(),
  graphqlType: z.string(),
  databaseColumn: z.string().optional(), // Optional if computed field
  databaseType: z.string().optional(),
  rustField: z.string(),
  rustType: z.string(),
  isNullable: z.boolean(),
  isArray: z.boolean(),
  isAlias: z.boolean(),
  aliasTarget: z.string().optional(),
  status: z.enum(['aligned', 'missing_db', 'missing_api', 'type_mismatch']),
  details: z.string().optional()
});

type FieldAlignment = z.infer<typeof FieldAlignmentSchema>;
```

**References**:
- [Zod Documentation](https://zod.dev/)
- [PostgreSQL Data Types](https://www.postgresql.org/docs/current/datatype.html)
- [async-graphql Scalar Types](https://async-graphql.github.io/async-graphql/en/custom_scalars.html)

---

## 5. Pre-commit Hook Integration

### Decision: Husky + lint-staged for Git Hook Management

**Rationale**:
- Husky is industry standard for Git hooks in Node.js projects
- lint-staged enables running validation only on staged files (performance optimization)
- Simple configuration, works cross-platform
- Already widely adopted in JavaScript/TypeScript ecosystems
- Supports blocking commits with non-zero exit codes

**Alternatives Considered**:
1. **Manual .git/hooks scripts**: Not version-controlled, hard to maintain across team
2. **pre-commit framework (Python)**: Additional dependency, overkill for single hook
3. **GitHub Actions only**: Catches issues too late (after push), slower feedback

**Implementation Approach**:

**package.json**:
```json
{
  "scripts": {
    "schema:validate": "node tools/schema-validator/dist/cli.js validate"
  },
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "src/**/*.{ts,tsx,graphql}": ["npm run schema:validate --staged"],
    "graphql-rust-server/src/**/*.rs": ["npm run schema:validate --staged"]
  }
}
```

**.husky/pre-commit**:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run schema validation on staged files
npm run schema:validate --staged

# Exit code 1 blocks commit
exit $?
```

**Incremental Validation Strategy**:
- Parse only staged GraphQL operation files
- Compare against cached schema state (stored in `.schema-cache.json`)
- Full validation on CI/CD pipeline
- Cache invalidation when database migrations or Rust models change

**References**:
- [Husky Documentation](https://typicode.github.io/husky/)
- [lint-staged Documentation](https://github.com/okonet/lint-staged)

---

## 6. Documentation Generation Strategy

### Decision: Markdown Tables with JSON Cache

**Rationale**:
- Human-readable Markdown for `SCHEMA_ALIGNMENT.md`
- Machine-readable JSON for programmatic access and caching
- Git-friendly diff format (line-by-line changes visible)
- Can generate HTML/PDF documentation from Markdown if needed
- Low-tech solution, no additional tooling required

**Output Format**:

**SCHEMA_ALIGNMENT.md**:
```markdown
# Schema Alignment Status

**Last Updated**: 2025-10-13 14:32:15 UTC
**Status**: ⚠️ 3 misalignments detected

## Summary

- ✅ Aligned Fields: 247/250 (98.8%)
- ❌ Missing in Database: 2
- ❌ Missing in API: 1
- ⚠️ Type Mismatches: 0

## Misalignments

### Missing in Database

#### `Event.recurrenceExceptions`
- **Frontend Query**: `src/routes/dashboard/events/+page.svelte:45`
- **GraphQL Type**: `[DateTime!]`
- **Database**: Column does not exist
- **Action Required**: Add migration to create `recurrence_exceptions` column as `timestamptz[]`

### Missing in API

#### `User.profilePictureUrl`
- **Frontend Query**: `src/lib/components/UserAvatar.svelte:12`
- **GraphQL Type**: `String`
- **Database**: Column exists as `profile_picture_url`
- **API**: Field not exposed in Rust GraphQL schema
- **Action Required**: Add resolver in `graphql-rust-server/src/models/user.rs`

## Page-Specific Alignment

### `/dashboard/events` (src/routes/dashboard/events/+page.svelte)

| Frontend Field | GraphQL Type | DB Column | DB Type | Rust Field | Status |
|----------------|--------------|-----------|---------|------------|--------|
| id | ID! | id | uuid | id | ✅ |
| title | String! | title | varchar(255) | title | ✅ |
| startTime | DateTime! | start_time | timestamptz | start_time | ✅ |
| recurrenceExceptions | [DateTime!] | - | - | - | ❌ Missing DB |
```

**.schema-cache.json** (for programmatic access):
```json
{
  "version": "1.0.0",
  "timestamp": "2025-10-13T14:32:15Z",
  "summary": {
    "totalFields": 250,
    "aligned": 247,
    "missingInDb": 2,
    "missingInApi": 1,
    "typeMismatches": 0
  },
  "misalignments": [
    {
      "field": "Event.recurrenceExceptions",
      "type": "missing_db",
      "frontendFile": "src/routes/dashboard/events/+page.svelte",
      "frontendLine": 45,
      "graphqlType": "[DateTime!]",
      "requiredAction": "Add migration: ALTER TABLE events ADD COLUMN recurrence_exceptions timestamptz[]"
    }
  ],
  "pages": { ... }
}
```

**Alternatives Considered**:
1. **Database storage**: Overkill, adds complexity, not version-controlled
2. **YAML format**: Less human-readable than Markdown, less tool support
3. **HTML reports**: Not git-friendly, requires build step

**References**:
- [GitHub Flavored Markdown Spec](https://github.github.com/gfm/)

---

## 7. Performance Optimization Strategies

### Decision: Multi-Level Caching with Incremental Validation

**Rationale**:
- Pre-commit validation must be fast (<5 seconds) to not block developer workflow
- Full schema validation only needed on significant changes
- Most commits don't change schema-related files

**Caching Strategy**:

1. **Schema State Cache** (`.schema-cache.json`):
   - Database schema snapshot (tables, columns, types, enums)
   - Rust API schema snapshot (types, fields, resolvers)
   - Invalidate on: database migration files change, Rust model files change
   - Location: Repository root (git-ignored, regenerated on first run)

2. **Parsed GraphQL Operations Cache** (`.graphql-operations-cache.json`):
   - Map of `filePath -> { operations, hash, timestamp }`
   - Invalidate on: file content hash changes
   - Location: Repository root (git-ignored)

3. **Alignment Report Cache** (`.schema-alignment-cache.json`):
   - Last known alignment status
   - Used for quick status checks without full validation
   - Regenerated on schema changes

**Incremental Validation Flow**:
```
1. Detect staged files via git diff
2. If no .ts/.graphql/.rs files staged → skip validation (exit 0)
3. If .sql migration files staged → invalidate schema cache, run full validation
4. If .rs model files staged → invalidate API schema cache, run full validation
5. If only .ts/.graphql files staged:
   a. Load cached schema state
   b. Parse only changed GraphQL operations
   c. Validate only affected fields
   d. Report only new misalignments
```

**Performance Targets**:
- Cache hit (no schema changes): <1 second
- Partial validation (GraphQL changes only): <2 seconds
- Full validation (schema changes): <30 seconds
- Initial cache generation: <60 seconds (one-time cost)

**Alternatives Considered**:
1. **Always full validation**: Too slow for frequent commits
2. **No caching**: Unacceptable performance (parsing GraphQL + DB queries on every commit)
3. **Redis cache**: Overengineered for local dev tool

**References**:
- [Git Hooks Performance Best Practices](https://pre-commit.com/#performance)

---

## 8. Error Reporting & Developer Experience

### Decision: Structured Terminal Output + Persistent File

**Rationale**:
- Immediate feedback in terminal during pre-commit hook
- Persistent `SCHEMA_ALIGNMENT.md` file for reference after commit attempt
- Actionable error messages with specific file locations and fix instructions
- Color-coded terminal output for quick scanning

**Terminal Output Format**:
```
❌ Schema Alignment Validation Failed (3 misalignments)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Missing Database Column: Event.recurrenceExceptions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  File: src/routes/dashboard/events/+page.svelte:45
  Expected Type: [DateTime!] (array of non-null DateTime)

  Database Status: Column does not exist

  Required Action:
    1. Create migration file:
       db/migrations/YYYYMMDD_XXX_add_recurrence_exceptions.sql

    2. Add column:
       ALTER TABLE hr_public.events
       ADD COLUMN recurrence_exceptions timestamptz[] DEFAULT '{}';

    3. Update RLS policies if needed

    4. Re-run validation: npm run schema:validate

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 Full alignment report: SCHEMA_ALIGNMENT.md
🔧 To bypass this check (NOT RECOMMENDED): git commit --no-verify

Commit blocked. Fix schema misalignments before committing.
```

**Exit Codes**:
- `0`: All aligned, commit allowed
- `1`: Misalignments detected, commit blocked
- `2`: Validation error (tool failure), commit blocked

**Alternatives Considered**:
1. **JSON-only output**: Not human-friendly in terminal
2. **No persistent file**: Developers lose error context after terminal clears
3. **Warning-only (non-blocking)**: Defeats the purpose of drift prevention

**References**:
- [Chalk.js for Terminal Colors](https://github.com/chalk/chalk)
- [Commander.js for CLI Framework](https://github.com/tj/commander.js)

---

## 9. CI/CD Integration

### Decision: GitHub Actions Workflow for Full Validation

**Rationale**:
- Pre-commit hook can be bypassed with `--no-verify`
- CI/CD provides final enforcement gate before merge
- Full validation on every push/PR (not just staged files)
- Can run more comprehensive checks without time pressure

**GitHub Actions Workflow**:

**.github/workflows/schema-validation.yml**:
```yaml
name: Schema Alignment Validation

on:
  push:
    branches: [main, develop, 'feature/*']
  pull_request:
    branches: [main, develop]

jobs:
  validate-schema:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: sveltehr_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run database migrations
        run: npm run db:migrate
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/sveltehr_test

      - name: Build Rust GraphQL server
        run: cd graphql-rust-server && cargo build

      - name: Run full schema validation
        run: npm run schema:validate --full
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/sveltehr_test

      - name: Upload alignment report
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: schema-alignment-report
          path: SCHEMA_ALIGNMENT.md
```

**Enforcement Strategy**:
- GitHub branch protection rules require this workflow to pass
- PR reviews cannot approve until schema validation succeeds
- Failure uploads `SCHEMA_ALIGNMENT.md` as artifact for review

**Alternatives Considered**:
1. **Pre-commit only**: Can be bypassed, no final enforcement
2. **Manual validation step**: Human error-prone, not automated
3. **Separate service (e.g., SchemaHero)**: Over-engineered for single project

**References**:
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)

---

## 10. Edge Case Handling

### Research: Computed Fields & Field Aliases

**Computed Fields**:

**Definition**: GraphQL fields that don't map directly to database columns but are computed from other data.

**Examples**:
- `User.fullName` computed from `first_name` + `last_name`
- `Event.isUpcoming` computed from `start_time` > current time
- `Event.currentAcceptanceCount` computed via JOIN query

**Validation Strategy**:
1. Maintain allowlist of known computed fields in config file (`schema-validator.config.json`)
2. For each computed field, document:
   - Field name and type
   - Source database columns used
   - Resolver location in Rust code
3. Validate that source columns exist even if computed field doesn't map 1:1

**Config Example**:
```json
{
  "computedFields": [
    {
      "typeName": "User",
      "fieldName": "fullName",
      "graphqlType": "String!",
      "sourceColumns": ["hr_public.users.first_name", "hr_public.users.last_name"],
      "rustResolver": "graphql-rust-server/src/models/user.rs:45"
    },
    {
      "typeName": "Event",
      "fieldName": "currentAcceptanceCount",
      "graphqlType": "Int!",
      "sourceColumns": ["hr_public.event_attendees.rsvp_status"],
      "rustResolver": "graphql-rust-server/src/models/event.rs:312",
      "notes": "Counts event_attendees with rsvp_status = 'accepted'"
    }
  ]
}
```

**Field Aliases**:

**Definition**: GraphQL fields that expose database columns under different names for API clarity.

**Examples**:
- `Event.recurrencePattern` → DB column `rrule`
- `Event.allDay` → DB column `is_all_day`
- `User.createdBy` → DB column `organizer_id`

**Detection Strategy**:
1. Parse `#[graphql(name = "...")]` attributes in Rust code
2. Parse `sqlx(rename = "...")` attributes for column mapping
3. Build alias mapping table during Rust schema introspection

**Validation Approach**:
```rust
// Detect alias in Rust code
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct Event {
    #[sqlx(rename = "rrule")]
    pub recurrence_rule: Option<String>,
}

#[Object]
impl Event {
    // This creates a field alias: recurrencePattern → recurrence_rule
    async fn recurrence_pattern(&self) -> Option<&str> {
        self.recurrence_rule.as_deref()
    }
}
```

Validation logic:
1. Frontend expects `recurrencePattern`
2. Rust API exposes `recurrencePattern` field
3. Check if method name differs from struct field name → detected as alias
4. Verify struct field maps to database column (via `sqlx(rename)`)
5. Mark as aligned with alias annotation in report

**References**:
- [async-graphql Field Renaming](https://async-graphql.github.io/async-graphql/en/field_rename.html)
- [sqlx Column Renaming](https://docs.rs/sqlx/latest/sqlx/derive.FromRow.html)

---

## Research Summary

All technical decisions have been finalized with clear rationale and alternatives considered. No NEEDS CLARIFICATION markers remain. The implementation approach is feasible within the constraints identified (performance, scale, constitutional compliance).

**Key Risks Identified**:
1. **Performance**: Mitigated by multi-level caching and incremental validation
2. **Complexity**: Mitigated by modular architecture and comprehensive tests
3. **Developer Adoption**: Mitigated by clear error messages and non-intrusive validation

**Ready to proceed to Phase 1: Design & Contracts**

---

**Completion Checklist**:
- [x] All NEEDS CLARIFICATION from Technical Context resolved
- [x] GraphQL parsing strategy finalized
- [x] Database introspection approach confirmed
- [x] Rust API introspection method selected
- [x] Type mapping rules documented
- [x] Pre-commit hook integration planned
- [x] Documentation format decided
- [x] Performance optimization strategy defined
- [x] Error reporting UX designed
- [x] CI/CD integration approach specified
- [x] Edge cases (computed fields, aliases) handled
