# Agent Spawning Template for Feature Implementation

Quick reference for spawning context-efficient agents from `.plan/` feature files.

## Pre-Flight Checklist

- [ ] Read the feature plan file (`.plan/qb_feature_XX.md`)
- [ ] Extract specific file paths mentioned
- [ ] Identify which layer (backend/frontend/database)
- [ ] Check relevant memories (`codebase_architecture`, `tech_stack`)
- [ ] Determine if task is simple (haiku) or complex (sonnet)

## Agent Templates by Task Type

### 1. Plan Analysis (Do Yourself - No Agent)

```typescript
// Just read the plan directly
Read({ file_path: ".plan/qb_feature_01_realtime_webhooks.md" })

// Extract:
// - Phase breakdown
// - File paths mentioned
// - Dependencies needed
```

### 2. Architecture Survey (Explore Agent)

```typescript
Task({
  subagent_type: "Explore",
  model: "sonnet",
  description: "Survey existing integration patterns",
  prompt: `Survey the [SUBSYSTEM] architecture to understand existing patterns.

SCOPE: [SPECIFIC_DIRECTORY_PATH]
FILES: [LIST_SPECIFIC_FILES_FROM_PLAN]

Use mcp__serena__get_symbols_overview on each file.
DO NOT read full file contents unless necessary.

Goal: Identify patterns for [SPECIFIC_CONCERN] that we should follow.
Focus: [SPECIFIC_QUESTIONS]`
})
```

**Example:**
```typescript
Task({
  subagent_type: "Explore",
  model: "sonnet",
  description: "Survey Intuit integration patterns",
  prompt: `Survey the Intuit integration architecture to understand webhook handling.

SCOPE: graphql-rust-server/src/integrations/intuit/
FILES:
- client.rs (existing API client patterns)
- sync_orchestrator.rs (existing sync patterns)

Use mcp__serena__get_symbols_overview on each file.
DO NOT read full contents.

Goal: Identify patterns for auth, error handling, async processing.
Focus: How are API calls made? How are errors handled? Any existing webhook code?`
})
```

### 3. Backend Implementation (Rust)

```typescript
Task({
  subagent_type: "rust-pro",
  model: "sonnet",
  description: "Implement [FEATURE] backend",
  prompt: `Implement [FEATURE_DESCRIPTION] in the Rust backend.

SCOPE RESTRICTIONS:
- ONLY work in: [BACKEND_DIRECTORY]
- Focus on: [SPECIFIC_FILES]
- Read existing patterns from: [REFERENCE_FILE]

Requirements from plan (.plan/[PLAN_FILE]):
1. [REQUIREMENT_1]
2. [REQUIREMENT_2]
3. [REQUIREMENT_3]

Follow existing patterns in [REFERENCE_FILE] for [PATTERN_TYPE].

Use mcp__serena__ tools with relative_path for all searches.`
})
```

**Example:**
```typescript
Task({
  subagent_type: "rust-pro",
  model: "sonnet",
  description: "Implement webhook receiver endpoint",
  prompt: `Implement QuickBooks webhook receiver in the Rust backend.

SCOPE RESTRICTIONS:
- ONLY work in: graphql-rust-server/src/integrations/intuit/
- Focus on: Create new webhook.rs module
- Read existing patterns from: client.rs

Requirements from plan (.plan/qb_feature_01_realtime_webhooks.md):
1. Create POST /api/intuit/webhook endpoint
2. Implement HMAC signature verification
3. Parse and validate webhook payloads
4. Store events in database

Follow existing patterns in client.rs for error handling and authentication.

Use mcp__serena__find_symbol with relative_path for all searches.`
})
```

### 4. Frontend Implementation (SvelteKit)

```typescript
Task({
  subagent_type: "frontend-developer",
  model: "sonnet",
  description: "Implement [FEATURE] UI",
  prompt: `Implement [FEATURE_DESCRIPTION] in SvelteKit frontend.

SCOPE RESTRICTIONS:
- ONLY work in: [FRONTEND_DIRECTORY]
- Reference: src/lib/components/ for UI patterns

Requirements:
1. [REQUIREMENT_1]
2. [REQUIREMENT_2]

Follow existing patterns in [EXISTING_PAGE].
Use Svelte 5 runes ($state, $derived, $props).
MUST use svelte-autofixer before finalizing.

Data fetching: ALL in +page.server.ts (see CLAUDE.md).`
})
```

**Example:**
```typescript
Task({
  subagent_type: "frontend-developer",
  model: "sonnet",
  description: "Add real-time sync notifications",
  prompt: `Implement real-time sync notifications in Intuit settings page.

SCOPE RESTRICTIONS:
- ONLY work in: src/routes/admin/settings/integrations/
- Reference: src/lib/components/ui/ for toast components

Requirements:
1. Add WebSocket/SSE connection for real-time updates
2. Show toast notifications for sync events
3. Update sync status badge in real-time

Follow existing patterns in src/routes/admin/settings/integrations/+page.svelte.
Use Svelte 5 runes ($state, $derived for reactive status).
MUST use svelte-autofixer before finalizing.

Data fetching: Connection setup in +page.server.ts (see CLAUDE.md).`
})
```

### 5. Database Migration (SeaORM)

```typescript
Task({
  subagent_type: "database-architect",
  model: "haiku",  // Simple, structured task
  description: "Create [TABLE_NAME] migration",
  prompt: `Create SeaORM migration for [TABLE_NAME] table.

SCOPE RESTRICTIONS:
- ONLY work in: graphql-rust-server/migration/
- Read pattern from: [LATEST_MIGRATION_FILE]

Schema from plan (.plan/[PLAN_FILE]):
[PASTE_SCHEMA_SPEC]

Follow naming convention: m[YYYYMMDD]_[NNN]_[descriptive_name].rs
Use existing migration as template.`
})
```

**Example:**
```typescript
Task({
  subagent_type: "database-architect",
  model: "haiku",
  description: "Create webhook_events migration",
  prompt: `Create SeaORM migration for intuit_webhook_events table.

SCOPE RESTRICTIONS:
- ONLY work in: graphql-rust-server/migration/
- Read pattern from: latest migration in migration/

Schema from plan (.plan/qb_feature_01_realtime_webhooks.md):
- id: UUID PRIMARY KEY
- event_id: VARCHAR(255) UNIQUE
- entity_type: VARCHAR(50)
- entity_id: VARCHAR(255)
- operation: VARCHAR(20)
- payload: JSONB
- received_at: TIMESTAMPTZ
- processed_at: TIMESTAMPTZ (nullable)
- status: VARCHAR(20)
- error_message: TEXT (nullable)
- retry_count: INTEGER DEFAULT 0

Follow naming convention: m20251229_004_intuit_webhook_events.rs
Use existing migration as template.`
})
```

### 6. Testing (Unit/Integration)

```typescript
Task({
  subagent_type: "test-automator",
  model: "sonnet",
  description: "Create tests for [FEATURE]",
  prompt: `Create tests for [FEATURE_DESCRIPTION].

SCOPE RESTRICTIONS:
- Backend tests: [BACKEND_TEST_DIR]
- Frontend tests: [FRONTEND_TEST_DIR]

Test coverage needed:
1. [TEST_SCENARIO_1]
2. [TEST_SCENARIO_2]
3. [TEST_SCENARIO_3]

Follow existing test patterns in [REFERENCE_TEST_FILE].
Use Vitest for unit tests, Playwright for E2E.`
})
```

**Example:**
```typescript
Task({
  subagent_type: "test-automator",
  model: "sonnet",
  description: "Create webhook receiver tests",
  prompt: `Create tests for QuickBooks webhook receiver.

SCOPE RESTRICTIONS:
- Backend tests: graphql-rust-server/tests/integrations/intuit/
- Frontend tests: src/routes/admin/settings/integrations/webhook.test.ts

Test coverage needed:
1. HMAC signature verification (valid/invalid signatures)
2. Event payload parsing (valid/malformed JSON)
3. Database event storage (success/failure cases)
4. Error handling (network errors, duplicate events)

Follow existing test patterns in graphql-rust-server/tests/integrations/intuit/sync_test.rs.
Use cargo test for backend, Vitest for frontend.`
})
```

### 7. Code Review (Quality Check)

```typescript
Task({
  subagent_type: "code-reviewer",
  model: "sonnet",
  description: "Review [FEATURE] implementation",
  prompt: `Review [FEATURE] implementation for quality and compliance.

FILES TO REVIEW:
- [FILE_1]
- [FILE_2]
- [FILE_3]

Review criteria:
- Security: [SECURITY_CONCERNS]
- Error handling: [ERROR_SCENARIOS]
- Code style: Follows [LANGUAGE] conventions
- Tests: Adequate coverage
- Documentation: Clear comments/docs

Check against:
- CLAUDE.md (project standards)
- code_style_conventions memory`
})
```

**Example:**
```typescript
Task({
  subagent_type: "code-reviewer",
  model: "sonnet",
  description: "Review webhook implementation",
  prompt: `Review QuickBooks webhook implementation for quality and security.

FILES TO REVIEW:
- graphql-rust-server/src/integrations/intuit/webhook.rs
- src/routes/admin/settings/integrations/+page.svelte
- graphql-rust-server/migration/m20251229_004_intuit_webhook_events.rs

Review criteria:
- Security: HMAC verification correct? Input validation? SQL injection protected?
- Error handling: Retry logic? Logging? User-facing errors?
- Code style: Follows Rust/Svelte conventions from CLAUDE.md
- Tests: Unit tests cover happy path + errors?
- Documentation: Clear comments on security-critical code?

Check against:
- CLAUDE.md (Svelte 5 runes, server-side data fetching)
- code_style_conventions memory`
})
```

## Parallel Agent Spawning (Multiple Features)

When implementing multiple independent parts, spawn in parallel:

```typescript
// Single message with multiple Task calls
// Agent 1: Backend
Task({
  subagent_type: "rust-pro",
  model: "sonnet",
  description: "Backend webhook receiver",
  prompt: "..."
})

// Agent 2: Frontend (independent from backend)
Task({
  subagent_type: "frontend-developer",
  model: "sonnet",
  description: "Frontend notifications UI",
  prompt: "..."
})

// Agent 3: Database (independent)
Task({
  subagent_type: "database-architect",
  model: "haiku",
  description: "Migration for webhook events",
  prompt: "..."
})
```

## Model Selection Guide

| Task Type | Model | Reason |
|-----------|-------|--------|
| Reading plans | N/A (do yourself) | No agent needed |
| Architecture survey | sonnet | Complex understanding |
| Backend implementation | sonnet | Complex logic |
| Frontend implementation | sonnet | Complex reactivity |
| Database migration | haiku | Simple, structured |
| Simple refactoring | haiku | Mechanical changes |
| Code review | sonnet | Nuanced judgment |
| Testing | sonnet | Edge cases |

## Context Optimization Checklist

- [ ] Specified `relative_path` in all Serena tool usage
- [ ] Used `get_symbols_overview` before reading full files
- [ ] Scoped agent to single subsystem (backend OR frontend, not both)
- [ ] Passed specific file paths from plan to agent
- [ ] Read relevant memories before spawning agent
- [ ] Used haiku for simple tasks, sonnet for complex
- [ ] Limited agent to specific phase from plan (not entire feature)

## Common Mistakes to Avoid

❌ **Vague prompt**: "Implement webhooks"
✅ **Specific prompt**: "Implement webhook receiver in graphql-rust-server/src/integrations/intuit/webhook.rs"

❌ **No scope**: `find_symbol({ name_path_pattern: "webhook" })`
✅ **Scoped**: `find_symbol({ name_path_pattern: "webhook", relative_path: "graphql-rust-server/src/integrations/intuit" })`

❌ **Full file read**: `Read({ file_path: "sync_orchestrator.rs" })`
✅ **Symbol read**: `get_symbols_overview({ relative_path: "sync_orchestrator.rs" })`

❌ **One huge agent**: "Implement entire Feature 01"
✅ **Multiple focused agents**: Backend agent + Frontend agent + DB agent

## Quick Start Workflow

1. **Read plan yourself** (no agent)
   ```
   Read({ file_path: ".plan/qb_feature_XX.md" })
   ```

2. **Extract info** (do yourself)
   - List file paths mentioned
   - Identify layers (backend/frontend/db)
   - Note dependencies

3. **Check memories** (do yourself)
   ```
   mcp__serena__read_memory({ memory_file_name: "codebase_architecture" })
   ```

4. **Spawn specialized agents** (use templates above)
   - One agent per layer
   - Specific scope and files
   - Clear requirements from plan

5. **Review and integrate**
   - Spawn code-reviewer agent
   - Manual testing
   - Update plan with status

---

**Usage**: Copy template, fill in [PLACEHOLDERS], spawn agent
**Saved**: `.plan/AGENT_SPAWNING_TEMPLATE.md`
**Memory**: `agent_spawning_best_practices`
