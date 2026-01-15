# Agent Spawning Best Practices for Feature Implementation

## Context Management for 40k+ File Codebase

**Project Size**: 40,739 source files, 41GB total
**Challenge**: Agents easily hit context limits if not scoped properly
**Solution**: Spawn specialized, narrowly-focused agents with explicit constraints

## Agent Specialization Strategy

### 1. **Feature Analysis Agent** (Plan Phase)

**When**: Reading feature plans from `.plan/` directory
**Scope**: Single feature plan file only
**Model**: `haiku` (fast, cost-effective for reading structured plans)

```typescript
Task({
	subagent_type: 'planner',
	model: 'haiku',
	prompt: `Read the feature plan at .plan/qb_feature_01_realtime_webhooks.md 
  and identify:
  1. Specific file paths mentioned (existing integration points)
  2. New files that need creation
  3. External dependencies/APIs needed
  
  DO NOT explore the codebase yet. Only analyze the plan document.`
});
```

### 2. **Architecture Survey Agent** (Reconnaissance)

**When**: Understanding existing code structure before implementation
**Scope**: Specific directories mentioned in feature plan only
**Model**: `sonnet` (better at understanding complex architecture)

```typescript
Task({
	subagent_type: 'Explore',
	model: 'sonnet',
	prompt: `Survey the existing Intuit integration architecture:
  - graphql-rust-server/src/integrations/intuit/
  - graphql-rust-server/src/services/sync_orchestrator.rs
  - src/routes/api/intuit/
  
  Use mcp__serena__get_symbols_overview on each file.
  DO NOT read full file contents unless necessary.
  
  Goal: Identify existing patterns for webhook handling, auth, error handling.
  Focus on: How does current sync work? What patterns should we follow?`
});
```

### 3. **Backend Implementation Agent** (Rust/GraphQL)

**When**: Implementing backend features
**Scope**: Backend-only (`graphql-rust-server/` directory)
**Model**: `sonnet`
**Specialist**: `backend-architect` or `rust-pro`

```typescript
Task({
	subagent_type: 'rust-pro',
	model: 'sonnet',
	prompt: `Implement webhook receiver endpoint for QuickBooks integration.
  
  SCOPE RESTRICTIONS:
  - ONLY work in: graphql-rust-server/src/
  - Focus on: src/integrations/intuit/ and src/api/routes/
  - Read existing patterns from sync_orchestrator.rs first
  
  Requirements from plan:
  1. Create /api/intuit/webhook endpoint
  2. HMAC signature verification
  3. Event parsing and database storage
  
  Follow existing patterns in graphql-rust-server/src/integrations/intuit/client.rs
  for error handling and authentication.`
});
```

### 4. **Frontend Implementation Agent** (SvelteKit)

**When**: Implementing UI components
**Scope**: Frontend-only (`src/routes/`, `src/lib/components/`)
**Model**: `sonnet`
**Specialist**: `frontend-developer` or `svelte` skills

```typescript
Task({
	subagent_type: 'frontend-developer',
	model: 'sonnet',
	prompt: `Implement real-time sync notifications in the Intuit settings page.
  
  SCOPE RESTRICTIONS:
  - ONLY work in: src/routes/admin/settings/integrations/
  - Reference: src/lib/components/ for existing UI patterns
  
  Requirements:
  1. Add WebSocket connection for real-time updates
  2. Toast notifications for sync events
  3. Follow existing patterns in src/routes/admin/settings/integrations/+page.svelte
  
  Use svelte-autofixer before finalizing code.`
});
```

### 5. **Database Migration Agent** (Schema Changes)

**When**: Creating migrations
**Scope**: Migration files only
**Model**: `haiku` (simple, structured task)
**Specialist**: `database-architect`

```typescript
Task({
	subagent_type: 'database-architect',
	model: 'haiku',
	prompt: `Create SeaORM migration for intuit_webhook_events table.
  
  SCOPE RESTRICTIONS:
  - ONLY work in: graphql-rust-server/migration/
  - Read existing migration pattern from latest migration file
  
  Schema from plan:
  - id: UUID PRIMARY KEY
  - event_id: VARCHAR(255) UNIQUE
  - entity_type: VARCHAR(50)
  - operation: VARCHAR(20)
  - payload: JSONB
  - received_at, processed_at: TIMESTAMPTZ
  - status: VARCHAR(20)
  - retry_count: INTEGER
  
  Follow naming convention from existing migrations.`
});
```

### 6. **Testing Agent** (Quality Assurance)

**When**: After implementation complete
**Scope**: Test files for specific feature
**Model**: `sonnet`
**Specialist**: `test-automator`

```typescript
Task({
	subagent_type: 'test-automator',
	model: 'sonnet',
	prompt: `Create tests for QuickBooks webhook receiver.
  
  SCOPE RESTRICTIONS:
  - Backend tests: graphql-rust-server/tests/
  - Frontend tests: src/routes/admin/settings/integrations/*.test.ts
  
  Test coverage needed:
  1. HMAC signature verification (valid/invalid)
  2. Event parsing and validation
  3. Database storage
  4. Error handling
  
  Follow existing test patterns in graphql-rust-server/tests/intuit/`
});
```

## Key Principles

### ✅ DO

1. **Always specify `relative_path` in Serena tool calls**

   ```rust
   mcp__serena__find_symbol({
     name_path_pattern: "SyncOrchestrator",
     relative_path: "graphql-rust-server/src/services",  // NARROW SCOPE
     include_body: false  // Don't read body unless needed
   })
   ```

2. **Use symbol-level reading, not full files**

   ```rust
   // Get overview first
   mcp__serena__get_symbols_overview({
     relative_path: "graphql-rust-server/src/services/sync_orchestrator.rs"
   })

   // Then read specific symbols
   mcp__serena__find_symbol({
     name_path_pattern: "SyncOrchestrator/sync_employees",
     include_body: true  // Only NOW read the body
   })
   ```

3. **Spawn multiple small agents instead of one large agent**
   - One agent for backend
   - One agent for frontend
   - One agent for migrations
   - Each stays in their domain

4. **Pass specific file paths from plan to agents**
   - Extract paths from `.plan/qb_feature_XX.md`
   - Give exact paths to agents, don't make them search

5. **Use haiku for simple, structured tasks**
   - Reading plans
   - Creating migrations
   - Simple refactoring
   - Saves tokens and cost

### ❌ DON'T

1. **Don't spawn agents with vague prompts**

   ```
   ❌ "Implement QuickBooks webhooks"
   ✅ "Create webhook receiver in graphql-rust-server/src/integrations/intuit/webhook.rs"
   ```

2. **Don't let agents explore entire codebase**

   ```
   ❌ find_symbol({ name_path_pattern: "sync" })  // Searches everything
   ✅ find_symbol({
        name_path_pattern: "sync",
        relative_path: "graphql-rust-server/src/services"  // Scoped
      })
   ```

3. **Don't spawn Explore agents without directory constraints**

   ```
   ❌ Task({ subagent_type: "Explore", prompt: "How does sync work?" })
   ✅ Task({
        subagent_type: "Explore",
        prompt: "How does sync work in graphql-rust-server/src/services/sync_orchestrator.rs?"
      })
   ```

4. **Don't read full files when symbols suffice**

   ```
   ❌ Read({ file_path: "sync_orchestrator.rs" })  // 500+ lines
   ✅ mcp__serena__get_symbols_overview({ relative_path: "..." })  // Structure only
   ```

5. **Don't spawn agents to explore patterns you already have in memories**
   - Read `codebase_architecture` memory first
   - Read `tech_stack` memory for patterns
   - Read `code_style_conventions` before implementing

## Feature Implementation Workflow

### Step 1: Plan Analysis (Local, no agent)

```typescript
// Read the plan yourself, extract key info
Read({ file_path: '.plan/qb_feature_01_realtime_webhooks.md' });

// Extract:
// - Existing file paths mentioned
// - New files to create
// - Dependencies needed
```

### Step 2: Architecture Survey (1 focused agent)

```typescript
Task({
	subagent_type: 'Explore',
	model: 'sonnet',
	prompt: `Survey existing Intuit integration in:
  - graphql-rust-server/src/integrations/intuit/client.rs
  - graphql-rust-server/src/services/sync_orchestrator.rs
  
  Use get_symbols_overview to understand structure.
  Identify: auth patterns, error handling, existing webhooks (if any).
  
  DO NOT read entire files. Use symbol tools.`
});
```

### Step 3: Parallel Implementation (Multiple specialized agents)

```typescript
// Spawn in parallel using multiple Task calls in one message
// Agent 1: Backend
Task({ subagent_type: 'rust-pro', prompt: '...' });

// Agent 2: Frontend
Task({ subagent_type: 'frontend-developer', prompt: '...' });

// Agent 3: Database
Task({ subagent_type: 'database-architect', prompt: '...' });
```

### Step 4: Integration & Testing (1 integration agent)

```typescript
Task({
	subagent_type: 'test-automator',
	prompt: `Create integration tests verifying:
  - Backend webhook receiver works
  - Frontend receives real-time updates
  - Database stores events correctly
  
  Scope: tests/ directory only`
});
```

### Step 5: Validation (code-reviewer)

```typescript
Task({
	subagent_type: 'code-reviewer',
	prompt: `Review webhook implementation for:
  - Security (HMAC verification correct?)
  - Error handling (retries, logging)
  - Code style (follows Rust/Svelte conventions)
  
  Files:
  - graphql-rust-server/src/integrations/intuit/webhook.rs
  - src/routes/admin/settings/integrations/+page.svelte`
});
```

## Estimating Agent Context Usage

### Low Context (~10-20k tokens)

- Reading single plan file
- Creating single migration
- Reading 2-3 specific files with symbol tools
- **Model**: haiku

### Medium Context (~40-80k tokens)

- Implementing single backend endpoint
- Creating frontend component with GraphQL integration
- Surveying existing patterns in one subsystem
- **Model**: sonnet

### High Context (~100k+ tokens) - AVOID

- Exploring multiple subsystems at once
- Reading full files instead of symbols
- Searching without `relative_path` constraints
- **Solution**: Break into multiple smaller agents

## Quick Reference Card

```typescript
// GOOD: Narrow, specialized agent
Task({
	subagent_type: 'rust-pro',
	model: 'sonnet',
	prompt: `Implement webhook.rs in graphql-rust-server/src/integrations/intuit/
  
  ONLY work in this directory. Read existing client.rs for patterns.
  Use mcp__serena__ tools with relative_path parameter.`
});

// BAD: Broad, unfocused agent
Task({
	subagent_type: 'general-purpose',
	prompt: 'Implement webhooks for QuickBooks'
	// Will explore entire codebase, hit context limits
});
```

## Memory Utilization Before Spawning

Before spawning agents, ALWAYS read relevant memories:

```typescript
// Read architecture memory to understand structure
mcp__serena__read_memory({ memory_file_name: 'codebase_architecture' });

// Read tech stack to understand patterns
mcp__serena__read_memory({ memory_file_name: 'tech_stack' });

// Read code conventions
mcp__serena__read_memory({ memory_file_name: 'code_style_conventions' });

// Then pass this knowledge to agents in prompts
// Agents don't need to rediscover what's in memories
```

## Success Metrics

✅ Agent completes without context overflow
✅ Agent only modifies files in specified scope
✅ Agent follows existing patterns (doesn't reinvent)
✅ Implementation matches feature plan phases
✅ Tests pass, code compiles

## Common Pitfalls

| Pitfall                                   | Solution                                              |
| ----------------------------------------- | ----------------------------------------------------- |
| Agent explores entire codebase            | Add `relative_path` to all Serena tool calls          |
| Agent reads full files unnecessarily      | Use `get_symbols_overview` first, then targeted reads |
| Multiple agents modify same file          | Assign clear ownership (backend vs frontend)          |
| Agent searches for existing knowledge     | Read memories before spawning agent                   |
| Agent spawned with haiku for complex task | Use sonnet for architectural decisions                |
| Agent spawned with sonnet for simple task | Use haiku for simple, structured work                 |

---

**Last Updated**: 2025-12-29
**Codebase**: SvelteHR (40k+ files)
**Primary Use**: Feature implementation from `.plan/` directory
