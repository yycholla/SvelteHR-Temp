# CLI Interface Contract

**Tool**: Schema Validator CLI
**Command**: `schema-validator`
**Version**: 1.0.0

## Overview

The schema validator CLI provides commands for validating schema alignment, generating reports, and managing configuration.

---

## Commands

### 1. `validate`

**Description**: Validate schema alignment between frontend, database, and API.

**Usage**:
```bash
schema-validator validate [options]
```

**Options**:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--staged` | boolean | false | Only validate staged files (for pre-commit) |
| `--full` | boolean | false | Full validation (ignore cache) |
| `--report <path>` | string | `SCHEMA_ALIGNMENT.md` | Output report path |
| `--json` | boolean | false | Output JSON format |
| `--no-cache` | boolean | false | Disable cache usage |
| `--verbose` | boolean | false | Verbose logging |
| `--database-url <url>` | string | from env | PostgreSQL connection string |

**Exit Codes**:
- `0`: All aligned (success)
- `1`: Misalignments found (validation failure)
- `2`: Tool error (execution failure)

**Examples**:
```bash
# Pre-commit hook validation (incremental, fast)
schema-validator validate --staged

# Full validation for CI/CD
schema-validator validate --full --json

# Verbose debugging
schema-validator validate --verbose --no-cache
```

**Output** (stdout):
```
✓ Parsing GraphQL operations... (45 files, 203 operations)
✓ Introspecting database schema... (38 tables, 427 columns)
✓ Introspecting API schema... (52 types, 318 fields)
✓ Validating alignments... (247/250 aligned)

❌ Schema Alignment Failed (3 misalignments)

Missing Database Column: Event.recurrenceExceptions
  File: src/routes/dashboard/events/+page.svelte:45
  Type: [DateTime!]
  Action: Create migration to add recurrence_exceptions timestamptz[]

Report: SCHEMA_ALIGNMENT.md
```

---

### 2. `init`

**Description**: Initialize schema validator configuration for a new project.

**Usage**:
```bash
schema-validator init [options]
```

**Options**:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--frontend-dir <path>` | string | `src` | Frontend source directory |
| `--backend-dir <path>` | string | `graphql-rust-server/src` | Rust API source directory |
| `--database-url <url>` | string | from env | PostgreSQL connection string |
| `--install-hook` | boolean | true | Install pre-commit hook |

**Exit Codes**:
- `0`: Success
- `2`: Initialization error

**Examples**:
```bash
# Initialize with defaults
schema-validator init

# Custom paths, skip hook
schema-validator init --frontend-dir frontend/src --no-install-hook
```

**Output**:
- Creates `schema-validator.config.json`
- Installs `.husky/pre-commit` hook (if `--install-hook`)
- Creates `.schema-cache/` directory
- Generates initial cache

---

### 3. `check`

**Description**: Quick alignment check without full validation (cache-based).

**Usage**:
```bash
schema-validator check [options]
```

**Options**:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--field <name>` | string | - | Check specific field only |
| `--type <name>` | string | - | Check all fields of a type |
| `--page <path>` | string | - | Check fields used by page |

**Exit Codes**:
- `0`: All checked items aligned
- `1`: Misalignments found
- `2`: Cache not found (run `validate --full` first)

**Examples**:
```bash
# Check all cached alignments
schema-validator check

# Check specific field
schema-validator check --field Event.recurrenceExceptions

# Check all fields used on a page
schema-validator check --page src/routes/dashboard/events/+page.svelte
```

**Output**:
```
✓ Event.id (aligned)
✓ Event.title (aligned)
✓ Event.startTime (aligned)
❌ Event.recurrenceExceptions (missing_db)
```

---

### 4. `report`

**Description**: Generate alignment report from cached data.

**Usage**:
```bash
schema-validator report [options]
```

**Options**:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--format <type>` | string | `markdown` | Report format: `markdown`, `json`, `html` |
| `--output <path>` | string | stdout | Output file path |
| `--filter <status>` | string | - | Filter by status: `aligned`, `missing_db`, `missing_api`, `type_mismatch` |
| `--page <path>` | string | - | Show only fields used by page |

**Exit Codes**:
- `0`: Success
- `2`: Error generating report

**Examples**:
```bash
# Generate markdown report
schema-validator report --output SCHEMA_ALIGNMENT.md

# Generate JSON report with only misalignments
schema-validator report --format json --filter missing_db --output misalignments.json

# Page-specific HTML report
schema-validator report --format html --page src/routes/dashboard/events/+page.svelte --output events-alignment.html
```

---

### 5. `compute add`

**Description**: Register a computed field (no direct database column).

**Usage**:
```bash
schema-validator compute add <type>.<field> [options]
```

**Options**:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--source-columns <list>` | string[] | required | Comma-separated DB columns used |
| `--resolver <path:line>` | string | required | Rust resolver location |
| `--description <text>` | string | required | Computation logic explanation |

**Exit Codes**:
- `0`: Success
- `2`: Invalid input

**Examples**:
```bash
# Register User.fullName as computed field
schema-validator compute add User.fullName \
  --source-columns hr_public.users.first_name,hr_public.users.last_name \
  --resolver graphql-rust-server/src/models/user.rs:87 \
  --description "Concatenates first_name and last_name with space"

# Register Event.currentAcceptanceCount
schema-validator compute add Event.currentAcceptanceCount \
  --source-columns hr_public.event_attendees.rsvp_status \
  --resolver graphql-rust-server/src/models/event.rs:312 \
  --description "Counts attendees with rsvp_status = 'accepted'"
```

**Output**:
```
✓ Added computed field: User.fullName
  Updated: schema-validator.config.json
```

---

### 6. `compute list`

**Description**: List all registered computed fields.

**Usage**:
```bash
schema-validator compute list [options]
```

**Options**:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--json` | boolean | false | Output JSON format |

**Exit Codes**:
- `0`: Success

**Examples**:
```bash
schema-validator compute list
```

**Output**:
```
Computed Fields (3):

User.fullName
  Sources: hr_public.users.first_name, hr_public.users.last_name
  Resolver: graphql-rust-server/src/models/user.rs:87
  Logic: Concatenates first_name and last_name with space

Event.currentAcceptanceCount
  Sources: hr_public.event_attendees.rsvp_status
  Resolver: graphql-rust-server/src/models/event.rs:312
  Logic: Counts attendees with rsvp_status = 'accepted'
```

---

### 7. `cache clear`

**Description**: Clear cached schema state.

**Usage**:
```bash
schema-validator cache clear [options]
```

**Options**:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--all` | boolean | false | Clear all cache files |
| `--database` | boolean | false | Clear database schema cache only |
| `--api` | boolean | false | Clear API schema cache only |
| `--operations` | boolean | false | Clear operations cache only |

**Exit Codes**:
- `0`: Success

**Examples**:
```bash
# Clear all caches
schema-validator cache clear --all

# Clear only database schema cache (after migration)
schema-validator cache clear --database
```

---

### 8. `history`

**Description**: Show validation history from git-tracked snapshots.

**Usage**:
```bash
schema-validator history [options]
```

**Options**:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--limit <n>` | number | 10 | Number of snapshots to show |
| `--format <type>` | string | `table` | Output format: `table`, `json` |

**Exit Codes**:
- `0`: Success

**Examples**:
```bash
# Show last 10 validation runs
schema-validator history

# Show last 50 runs in JSON
schema-validator history --limit 50 --format json
```

**Output**:
```
Validation History (last 10 runs):

Commit       Date                 Run Type    Aligned   Misaligned   Duration
ce1d7c7      2025-10-13 14:32     pre-commit  247/250   3            1.2s
d07b388      2025-10-13 12:15     pre-commit  248/250   2            0.8s
91021c6      2025-10-12 16:42     full        250/250   0            28.4s
```

---

## Configuration File

**Path**: `schema-validator.config.json`

**Schema**:
```typescript
interface SchemaValidatorConfig {
  version: string;

  // Source paths
  frontendDir: string;
  backendDir: string;
  databaseUrl: string;

  // Parsing options
  graphqlExtensions: string[];  // ['.ts', '.tsx', '.graphql']
  graphqlModules: Array<{
    name: string;
    identifier: string;
  }>;

  // Validation options
  strictNullability: boolean;  // Require exact nullability match
  allowUnusedDbColumns: boolean;  // Allow DB columns not used by API
  warnOnZombieFields: boolean;  // Warn about API fields not used by frontend

  // Performance options
  cacheDir: string;
  parallelParsing: boolean;
  maxConcurrentQueries: number;

  // Computed fields configuration
  computedFields: Array<{
    typeName: string;
    fieldName: string;
    graphqlType: string;
    sourceColumns: string[];
    resolverFile: string;
    resolverLine: number;
    computationLogic: string;
    addedAt: string;  // ISO datetime
    addedBy: string;  // Git user
  }>;

  // Type mapping overrides
  customTypeMappings: Record<string, {
    postgresTypes: string[];
    rustTypes: string[];
    compatible: boolean;
  }>;
}
```

**Default Config**:
```json
{
  "version": "1.0.0",
  "frontendDir": "src",
  "backendDir": "graphql-rust-server/src",
  "databaseUrl": "${DATABASE_URL}",
  "graphqlExtensions": [".ts", ".tsx", ".graphql"],
  "graphqlModules": [
    { "name": "@urql/svelte", "identifier": "gql" },
    { "name": "graphql-tag", "identifier": "gql" }
  ],
  "strictNullability": true,
  "allowUnusedDbColumns": false,
  "warnOnZombieFields": true,
  "cacheDir": ".schema-cache",
  "parallelParsing": true,
  "maxConcurrentQueries": 10,
  "computedFields": [],
  "customTypeMappings": {}
}
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `RUST_BACKTRACE` | No | `0` | Enable Rust backtraces for debugging |
| `SCHEMA_VALIDATOR_LOG` | No | `info` | Log level: `debug`, `info`, `warn`, `error` |

---

## Pre-commit Hook Integration

**Installed Hook** (`.husky/pre-commit`):
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run schema validation on staged files
npx schema-validator validate --staged || {
  echo ""
  echo "❌ Schema alignment validation failed"
  echo "📄 See SCHEMA_ALIGNMENT.md for details"
  echo "🔧 To bypass (NOT RECOMMENDED): git commit --no-verify"
  exit 1
}
```

**package.json scripts**:
```json
{
  "scripts": {
    "schema:validate": "schema-validator validate",
    "schema:validate:full": "schema-validator validate --full",
    "schema:check": "schema-validator check",
    "schema:report": "schema-validator report"
  }
}
```

---

## Contract Tests

Each command will have corresponding contract tests ensuring:

1. **Exit codes are correct** for all scenarios
2. **Output format matches specification**
3. **Options are parsed correctly**
4. **File I/O works as expected**
5. **Error messages are helpful**

**Test Files** (to be created):
```
tests/contract/
├── validate.contract.test.ts
├── init.contract.test.ts
├── check.contract.test.ts
├── report.contract.test.ts
├── compute.contract.test.ts
├── cache.contract.test.ts
└── history.contract.test.ts
```

---

**Completion Checklist**:
- [x] All user actions from spec mapped to commands
- [x] Command signatures defined
- [x] Options and arguments specified
- [x] Exit codes documented
- [x] Examples provided
- [x] Configuration schema defined
- [x] Pre-commit hook integration specified
- [x] Contract tests planned
