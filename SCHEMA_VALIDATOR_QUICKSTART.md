# Schema Validator - Quick Start Guide

## Setup (One-time)

### 1. Set Environment Variables

Create a `.env` file in the project root:

```bash
# Copy the template
cp .env.schema-validator .env

# Or manually create .env with:
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hr_system
PUBLIC_GRAPHQL_ENDPOINT=http://localhost:8080/graphql
```

### 2. Choose Your Config File

**Option A: Simple config (recommended for getting started)**
```bash
# Use the simplified config
npm run schema:validate -- --config schema-validator.config.simple.json
```

**Option B: Advanced config (nested structure)**
```bash
# Use the full-featured config (requires fixes)
npm run schema:validate -- --config schema-validator.config.json
```

## Usage

### Run Validation

```bash
# From project root - uses your .env file automatically
npm run schema:validate

# With specific config
npm run schema:validate -- --config schema-validator.config.simple.json

# From tools/schema-validator directory
cd tools/schema-validator
node dist/cli/index.js validate --config ../../schema-validator.config.simple.json
```

### Other Commands

```bash
# Quick status check (uses cache)
npm run schema:check

# Generate markdown report
npm run schema:report

# Clear cache
npm run schema:cache:clear

# View cache stats
npm run schema:cache:stats
```

## What You Should See

**When working correctly:**
```
🔍 Starting schema validation...
DatabaseIntrospector: Using mock implementation. Connect to real DB in production.
ApiIntrospector: No API URL configured. Returning empty schema.

📋 Schema Alignment Report
Status: ✅ PASSED
Total Fields: 0
✨ All fields are properly aligned!
⏱️  Validation completed in 0.00s
```

**Note:** Currently shows 0 fields because:
- Database introspector is using mock implementation (returns no tables)
- API introspector needs valid endpoint
- GraphQL parser is not yet implemented (returns no operations)

## Next Steps

To get actual validation working:

1. **Set up database connection** - Update DATABASE_URL with your real database
2. **Start GraphQL server** - Make sure your API is running on port 8080
3. **Implement GraphQL parser** - Currently returns empty map in parseOperations()

## Troubleshooting

### "Status: ❌ FAILED" even with 0 misalignments
- **Cause:** Environment variables not loaded or invalid URLs
- **Fix:** Make sure .env file exists and has valid URLs

### "Validation failed: Array must contain at least 1 element"
- **Cause:** Using complex nested config with incomplete computed fields
- **Fix:** Use `schema-validator.config.simple.json` instead

### "Config file not found"
- **Cause:** Running from wrong directory
- **Fix:** Use absolute paths or run from project root with npm scripts

## Configuration Files

- `schema-validator.config.simple.json` - Flat structure, easy to use
- `schema-validator.config.json` - Nested structure, advanced features
- `.env.schema-validator` - Environment variable template

## Documentation

Full documentation in `tools/schema-validator/`:
- `README.md` - Complete guide (19 KB)
- `API.md` - Programmatic API (28 KB)
- `TROUBLESHOOTING.md` - Common issues (21 KB)
- `PROJECT_STATUS.md` - Implementation status (12 KB)
