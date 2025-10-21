# Quickstart: Schema Alignment Validation

**Feature**: Frontend-Backend GraphQL API Schema Alignment System
**Estimated Time**: 10 minutes
**Prerequisites**: Node.js 20+, PostgreSQL 15+, Rust 1.75+

## Overview

This quickstart guide validates that the schema alignment system correctly detects misalignments between frontend GraphQL queries, database schema, and Rust API implementation.

---

## Step 1: Setup

### Install Schema Validator

```bash
cd /home/chanway/Projects/SvelteHR

# Install dependencies
npm install

# Build schema validator tool
cd tools/schema-validator
npm install
npm run build

# Initialize configuration
npm run schema-validator init
```

**Expected Output**:
```
✓ Created schema-validator.config.json
✓ Created .schema-cache/ directory
✓ Installed pre-commit hook at .husky/pre-commit
✓ Configuration initialized successfully
```

**Validation**:
- ✅ File `schema-validator.config.json` exists
- ✅ Directory `.schema-cache/` exists
- ✅ File `.husky/pre-commit` contains schema validation command

---

## Step 2: Baseline Validation (Should Pass)

### Run Full Validation

```bash
# Set database connection
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sveltehr_dev"

# Run full schema validation
npm run schema:validate:full
```

**Expected Output**:
```
✓ Parsing GraphQL operations... (47 files, 205 operations)
✓ Introspecting database schema... (38 tables, 431 columns)
✓ Introspecting API schema... (54 types, 322 fields)
✓ Validating alignments... (250/250 aligned)

✅ Schema Alignment: All Aligned

Summary:
  Total Fields: 250
  Aligned: 250 (100%)
  Misalignments: 0

Duration: 12.4s
Report: SCHEMA_ALIGNMENT.md
```

**Validation**:
- ✅ Exit code is 0
- ✅ `SCHEMA_ALIGNMENT.md` shows 0 misalignments
- ✅ `.schema-cache/` contains cached schema files

---

## Step 3: Test Missing Database Column Detection

### Introduce Misalignment

Add a new GraphQL field to frontend without corresponding database column:

```bash
# Create test file with new field
cat > src/test-misalignment.ts << 'EOF'
import { gql } from '@urql/svelte';

export const TEST_QUERY = gql`
  query TestMisalignment {
    events {
      id
      title
      newFieldThatDoesNotExist
    }
  }
`;
EOF

# Stage the file
git add src/test-misalignment.ts
```

### Run Validation (Should Fail)

```bash
npm run schema:validate:full
```

**Expected Output**:
```
✓ Parsing GraphQL operations... (48 files, 206 operations)
✓ Introspecting database schema... (38 tables, 431 columns)
✓ Introspecting API schema... (54 types, 322 fields)
✓ Validating alignments... (250/251 aligned)

❌ Schema Alignment Failed (1 misalignment)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Missing Database Column: Event.newFieldThatDoesNotExist
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  File: src/test-misalignment.ts:8
  Expected Type: String (inferred)

  Database Status: Column does not exist

  Required Action:
    1. Create migration file:
       db/migrations/YYYYMMDD_XXX_add_new_field_that_does_not_exist.sql

    2. Add column:
       ALTER TABLE hr_public.events
       ADD COLUMN new_field_that_does_not_exist VARCHAR(255);

    3. Re-run validation: npm run schema:validate

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Report: SCHEMA_ALIGNMENT.md
```

**Validation**:
- ✅ Exit code is 1 (misalignment detected)
- ✅ Error message shows missing column
- ✅ Error message includes required action
- ✅ Error message shows source file and line number
- ✅ `SCHEMA_ALIGNMENT.md` contains detailed misalignment report

### Check Report

```bash
cat SCHEMA_ALIGNMENT.md
```

**Expected Content** (abbreviated):
```markdown
# Schema Alignment Status

**Last Updated**: 2025-10-13 15:42:31 UTC
**Status**: ❌ 1 misalignment detected

## Summary

- ✅ Aligned Fields: 250/251 (99.6%)
- ❌ Missing in Database: 1
- ❌ Missing in API: 0
- ⚠️ Type Mismatches: 0

## Misalignments

### Missing in Database

#### `Event.newFieldThatDoesNotExist`
- **Frontend Query**: `src/test-misalignment.ts:8`
- **GraphQL Type**: `String` (inferred)
- **Database**: Column does not exist
- **Action Required**: Add migration to create `new_field_that_does_not_exist` column
```

**Validation**:
- ✅ Report shows correct misalignment count
- ✅ Report includes file path and line number
- ✅ Report provides actionable fix instructions

### Clean Up

```bash
# Remove test file
rm src/test-misalignment.ts
git reset src/test-misalignment.ts
```

---

## Step 4: Test Missing API Field Detection

### Introduce Misalignment

Add a database column without exposing it in the Rust API:

```bash
# Create migration
cat > db/migrations/99999999_999_test_missing_api.sql << 'EOF'
-- Test migration: Add column not exposed by API
ALTER TABLE hr_public.events
ADD COLUMN test_unexposed_field VARCHAR(100);
EOF

# Apply migration
npm run db:migrate

# Add GraphQL query that expects this field
cat > src/test-missing-api.ts << 'EOF'
import { gql } from '@urql/svelte';

export const TEST_MISSING_API = gql`
  query TestMissingApi {
    events {
      id
      title
      testUnexposedField
    }
  }
`;
EOF

# Stage file
git add src/test-missing-api.ts
```

### Run Validation (Should Fail)

```bash
npm run schema:validate:full
```

**Expected Output**:
```
❌ Schema Alignment Failed (1 misalignment)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Missing API Field: Event.testUnexposedField
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  File: src/test-missing-api.ts:8
  Expected Type: String (inferred)

  Database Status: Column exists as `test_unexposed_field` (varchar)
  API Status: Field not exposed in Rust GraphQL schema

  Required Action:
    Add resolver to graphql-rust-server/src/models/event.rs:

    async fn test_unexposed_field(&self) -> Option<&str> {
        self.test_unexposed_field.as_deref()
    }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Validation**:
- ✅ Exit code is 1
- ✅ Error identifies missing API field
- ✅ Error shows that database column exists
- ✅ Error provides Rust code snippet for fix

### Clean Up

```bash
# Rollback migration
psql $DATABASE_URL -c "ALTER TABLE hr_public.events DROP COLUMN test_unexposed_field;"

# Remove test file
rm src/test-missing-api.ts
git reset src/test-missing-api.ts

# Remove test migration
rm db/migrations/99999999_999_test_missing_api.sql
```

---

## Step 5: Test Type Mismatch Detection

### Introduce Misalignment

Query an integer field as a string:

```bash
cat > src/test-type-mismatch.ts << 'EOF'
import { gql } from '@urql/svelte';

export const TEST_TYPE_MISMATCH = gql`
  query TestTypeMismatch {
    events {
      id
      capacity  # This is Int! in API, but query expects String
    }
  }
`;
EOF

# Manually edit the generated types to create mismatch
# (In practice, this would be a developer error in the query)
```

**Note**: This test is conceptual - the actual validation compares frontend expectations against API schema, not generated types.

### Run Validation

```bash
npm run schema:validate:full
```

**Expected Behavior**:
- If frontend query expects `String` but API provides `Int!`, validation should detect type mismatch
- Error should show type mapping: `integer → i32 → Int!` vs expected `String`

### Clean Up

```bash
rm src/test-type-mismatch.ts
```

---

## Step 6: Test Computed Field Configuration

### Register Computed Field

```bash
# Register User.fullName as computed field
npm run schema-validator compute add User.fullName \
  --source-columns hr_public.users.first_name,hr_public.users.last_name \
  --resolver graphql-rust-server/src/models/user.rs:87 \
  --description "Concatenates first_name and last_name with space"
```

**Expected Output**:
```
✓ Added computed field: User.fullName
  Sources: hr_public.users.first_name, hr_public.users.last_name
  Resolver: graphql-rust-server/src/models/user.rs:87
  Updated: schema-validator.config.json
```

### Validate Computed Field

```bash
# Create query using computed field
cat > src/test-computed-field.ts << 'EOF'
import { gql } from '@urql/svelte';

export const TEST_COMPUTED = gql`
  query TestComputed {
    users {
      id
      fullName  # Computed field
    }
  }
`;
EOF

# Run validation
npm run schema:validate:full
```

**Expected Output**:
```
✅ Schema Alignment: All Aligned

Summary:
  Total Fields: 252
  Aligned: 251 (99.6%)
  Computed Fields: 1 (configured)
  Misalignments: 0
```

**Validation**:
- ✅ No error for `fullName` field
- ✅ Field marked as computed in report
- ✅ Source columns validated as existing

### Clean Up

```bash
rm src/test-computed-field.ts
```

---

## Step 7: Test Pre-commit Hook

### Stage Changes with Misalignment

```bash
# Create misalignment
cat > src/test-precommit.ts << 'EOF'
import { gql } from '@urql/svelte';

export const TEST_PRECOMMIT = gql`
  query TestPrecommit {
    events {
      id
      nonExistentField
    }
  }
`;
EOF

# Stage file
git add src/test-precommit.ts

# Attempt commit
git commit -m "Test pre-commit hook"
```

**Expected Output**:
```
✓ Parsing GraphQL operations... (48 files, 206 operations)
✓ Introspecting database schema... (from cache)
✓ Introspecting API schema... (from cache)
✓ Validating alignments... (250/251 aligned)

❌ Schema Alignment Failed (1 misalignment)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Missing Database Column: Event.nonExistentField
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  File: src/test-precommit.ts:7
  [Error details...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 Full alignment report: SCHEMA_ALIGNMENT.md
🔧 To bypass this check (NOT RECOMMENDED): git commit --no-verify

Commit blocked. Fix schema misalignments before committing.
```

**Validation**:
- ✅ Commit is blocked (non-zero exit code)
- ✅ Error message displayed in terminal
- ✅ Instructions provided
- ✅ Validation used cache (fast execution <2s)

### Clean Up

```bash
# Remove test file
rm src/test-precommit.ts
git reset src/test-precommit.ts
```

---

## Step 8: Test Cache Performance

### Measure Performance with Cache

```bash
# Clear cache
npm run schema-validator cache clear --all

# Time full validation (no cache)
time npm run schema:validate:full
```

**Expected**: ~15-30 seconds

```bash
# Time validation with cache
time npm run schema:validate:full
```

**Expected**: <2 seconds

**Validation**:
- ✅ Second run is significantly faster
- ✅ Cache files exist in `.schema-cache/`
- ✅ Cached validation returns same results

---

## Step 9: Test Incremental Validation

### Modify Single File

```bash
# Modify existing file
echo "// Comment change" >> src/lib/graphql/events-operations.ts

# Stage only this file
git add src/lib/graphql/events-operations.ts

# Run incremental validation
npm run schema:validate --staged
```

**Expected Output**:
```
✓ Detecting staged files... (1 file)
✓ Parsing GraphQL operations... (1 file, 12 operations)
✓ Loading cached schema...
✓ Validating alignments... (12/12 aligned)

✅ Schema Alignment: All Aligned (incremental)

Duration: 0.8s
```

**Validation**:
- ✅ Only staged file was validated
- ✅ Cached schema was reused
- ✅ Validation completed in <1 second

### Clean Up

```bash
git reset src/lib/graphql/events-operations.ts
git checkout src/lib/graphql/events-operations.ts
```

---

## Step 10: Test Report Generation

### Generate Different Report Formats

```bash
# Markdown report
npm run schema:report --format markdown --output alignment.md

# JSON report
npm run schema:report --format json --output alignment.json

# HTML report
npm run schema:report --format html --output alignment.html
```

**Validation**:
- ✅ `alignment.md` contains human-readable report
- ✅ `alignment.json` contains valid JSON
- ✅ `alignment.html` contains valid HTML

### View JSON Report

```bash
cat alignment.json | jq '.summary'
```

**Expected Output**:
```json
{
  "totalFields": 250,
  "alignedFields": 250,
  "misalignedFields": 0,
  "computedFields": 1,
  "zombieFields": 0
}
```

### Clean Up

```bash
rm alignment.md alignment.json alignment.html
```

---

## Success Criteria

✅ **All tests passed** if:

1. Baseline validation shows 100% alignment
2. Missing database column is detected and reported correctly
3. Missing API field is detected and reported correctly
4. Type mismatches are detected (conceptual test)
5. Computed fields can be registered and validated
6. Pre-commit hook blocks commits with misalignments
7. Cache improves validation performance by >10x
8. Incremental validation processes only staged files
9. Reports can be generated in multiple formats
10. All error messages include file paths, line numbers, and fix instructions

---

## Troubleshooting

### Issue: Database connection fails

**Solution**:
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Verify DATABASE_URL
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

### Issue: Cache is stale

**Solution**:
```bash
# Clear cache and re-run
npm run schema-validator cache clear --all
npm run schema:validate:full
```

### Issue: Pre-commit hook not running

**Solution**:
```bash
# Reinstall hook
npm run schema-validator init --install-hook

# Verify hook exists
cat .husky/pre-commit
```

### Issue: Validation is slow

**Solution**:
```bash
# Check cache is being used
ls -lh .schema-cache/

# Enable verbose logging
npm run schema:validate --verbose

# Reduce concurrency if system is slow
# Edit schema-validator.config.json:
{
  "maxConcurrentQueries": 5
}
```

---

## Next Steps

After completing this quickstart:

1. **Review Configuration**: Customize `schema-validator.config.json`
2. **Register Computed Fields**: Add all known computed fields
3. **Run in CI/CD**: Integrate into GitHub Actions workflow
4. **Monitor History**: Track alignment over time with `schema-validator history`
5. **Document Patterns**: Add common field aliases to config

---

**Quickstart Completion Time**: ~10 minutes

**Validation Coverage**:
- ✅ Missing database columns
- ✅ Missing API fields
- ✅ Type mismatches (conceptual)
- ✅ Computed field configuration
- ✅ Pre-commit hook enforcement
- ✅ Cache performance
- ✅ Incremental validation
- ✅ Report generation

**Ready for Production**: System is validated and ready for team adoption.
