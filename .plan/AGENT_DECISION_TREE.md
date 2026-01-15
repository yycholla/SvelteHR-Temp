# Agent Spawning Decision Tree

Quick decision guide: When should you spawn an agent vs do the work yourself?

## Decision Flow

```
Is this task about implementing code from a .plan/ file?
│
├─ YES → Continue to next question
│
└─ NO → Is it a research/exploration task?
    │
    ├─ YES → Can you narrow it to 1-2 directories?
    │   │
    │   ├─ YES → Spawn Explore agent with directory scope
    │   │
    │   └─ NO → Do it yourself with targeted Grep/Glob
    │
    └─ NO → It's a direct modification task
        │
        └─ Do it yourself with Read/Edit/Write tools

For .plan/ implementation:
│
├─ Is it a multi-phase feature with backend + frontend?
│   │
│   ├─ YES → Spawn multiple specialized agents in parallel
│   │   │
│   │   ├─ Backend: rust-pro or backend-architect
│   │   ├─ Frontend: frontend-developer
│   │   ├─ Database: database-architect
│   │   └─ Tests: test-automator
│   │
│   └─ NO → Single layer change
│       │
│       ├─ Is it complex (>100 lines, multiple files)?
│       │   │
│       │   ├─ YES → Spawn specialized agent
│       │   │
│       │   └─ NO → Do it yourself
│       │
│       └─ Is it a migration or structured task?
│           │
│           ├─ YES → Spawn database-architect with haiku
│           │
│           └─ NO → Evaluate complexity again
```

## Practical Examples

### ✅ SPAWN AGENT

#### Example 1: Multi-file Backend Feature

**Situation**: Implement webhook receiver (new endpoint, validation, DB storage)
**Decision**: Spawn `rust-pro` agent
**Reason**:

- Multiple new files (webhook.rs, tests)
- Complex logic (HMAC verification, async processing)
- Needs to follow existing patterns

```typescript
Task({
	subagent_type: 'rust-pro',
	model: 'sonnet',
	description: 'Implement webhook receiver',
	prompt: `[Specific scoped prompt]`
});
```

#### Example 2: Complex UI Component

**Situation**: Real-time sync status dashboard with WebSocket
**Decision**: Spawn `frontend-developer` agent
**Reason**:

- Svelte 5 runes complexity
- WebSocket/SSE integration
- Real-time state management

#### Example 3: Multiple Independent Changes

**Situation**: Feature requires backend API + frontend UI + database migration
**Decision**: Spawn 3 agents in parallel
**Reason**:

- Independent workstreams
- Different expertise needed
- Faster completion

```typescript
// Single message, multiple agents
Task({ subagent_type: "rust-pro", ... })
Task({ subagent_type: "frontend-developer", ... })
Task({ subagent_type: "database-architect", model: "haiku", ... })
```

#### Example 4: Architecture Survey

**Situation**: Need to understand how existing sync system works before adding webhooks
**Decision**: Spawn `Explore` agent
**Reason**:

- Multiple files to analyze
- Pattern extraction needed
- Scoped to specific directory

```typescript
Task({
	subagent_type: 'Explore',
	model: 'sonnet',
	description: 'Survey sync architecture',
	prompt: `Survey graphql-rust-server/src/services/sync_orchestrator.rs
  Use get_symbols_overview, don't read full file.
  Goal: Understand sync flow for webhook integration.`
});
```

### ❌ DO IT YOURSELF

#### Example 1: Simple File Edit

**Situation**: Add one new function to existing file
**Decision**: Do it yourself
**Reason**:

- Single file
- Clear requirement
- Simple addition

```typescript
// Read existing file
Read({ file_path: 'src/lib/utils/formatters.ts' });

// Add function
Edit({
	file_path: 'src/lib/utils/formatters.ts',
	old_string: 'export { formatDate }',
	new_string:
		'export { formatDate, formatCurrency }\n\nexport function formatCurrency(amount: number): string { ... }'
});
```

#### Example 2: Finding Specific Code

**Situation**: Find where user permissions are checked
**Decision**: Do it yourself with Grep
**Reason**:

- Targeted search
- Known keyword ("permissions")
- Quick lookup

```typescript
Grep({
	pattern: 'permissions',
	relative_path: 'src/routes/admin',
	output_mode: 'files_with_matches'
});
```

#### Example 3: Reading Configuration

**Situation**: Check environment variables used
**Decision**: Do it yourself
**Reason**:

- Simple file read
- No modification needed

```typescript
Read({ file_path: '.env.example' });
```

#### Example 4: Small Refactor

**Situation**: Rename variable in single file
**Decision**: Do it yourself
**Reason**:

- Mechanical change
- Single file scope

```typescript
Read({ file_path: 'src/lib/stores/auth.ts' });

Edit({
	file_path: 'src/lib/stores/auth.ts',
	old_string: 'let currentUser = $state(null);',
	new_string: 'let user = $state(null);',
	replace_all: true
});
```

#### Example 5: Adding Import

**Situation**: Add missing import statement
**Decision**: Do it yourself
**Reason**:

- Trivial change
- No exploration needed

```typescript
Edit({
	file_path: 'src/routes/admin/+page.svelte',
	old_string: '<script lang="ts">',
	new_string: '<script lang="ts">\n  import { logger } from \'$lib/utils/logger\';'
});
```

## Complexity Scoring

Use this to decide if task warrants an agent:

| Factor                                | Points |
| ------------------------------------- | ------ |
| Multiple files (3+)                   | +2     |
| New file creation                     | +1     |
| Complex logic (auth, security, async) | +2     |
| Need to study existing patterns       | +2     |
| Cross-cutting (backend + frontend)    | +3     |
| Database schema changes               | +1     |
| Needs testing                         | +1     |
| Simple CRUD operation                 | -1     |
| Single file edit                      | -2     |
| Configuration change                  | -1     |

**Score:**

- **0-2**: Do it yourself
- **3-4**: Consider agent if unfamiliar with area
- **5+**: Spawn agent

## Real Examples from SvelteHR

### Scenario A: Add Logger Import to 450 Files

**Complexity**: 0 points (mechanical)

- Multiple files (+2)
- Simple CRUD (-1)
- Single line change (-1)

**Decision**: Do it yourself with script or batch Edit
**Approach**:

```bash
# Find files needing import
Grep({ pattern: "logger\\.(info|error|warn)", output_mode: "files_with_matches" })

# For each file, add import
# (Or write a script)
```

### Scenario B: Implement QuickBooks Webhook Receiver

**Complexity**: 9 points (agent worthy!)

- Multiple files (+2)
- New file creation (+1)
- Complex logic (HMAC, async) (+2)
- Study existing patterns (+2)
- Database changes (+1)
- Needs testing (+1)

**Decision**: Spawn `rust-pro` agent
**Approach**: See AGENT_SPAWNING_TEMPLATE.md

### Scenario C: Fix Type Error in Form Component

**Complexity**: 1 point (do yourself)

- Single file edit (-2)
- Need to study pattern (+2)
- Simple fix (+1)

**Decision**: Do it yourself
**Approach**:

```typescript
Read({ file_path: "src/components/forms/TaskForm.svelte" })
// Read error, fix type annotation
Edit({ ... })
```

### Scenario D: Create Database Migration

**Complexity**: 2 points (borderline)

- Single file edit (-2)
- New file creation (+1)
- Database schema (+1)
- Follow template (+2)

**Decision**: Spawn `database-architect` with haiku (simple, structured)
**Reason**: Follows template, but DB migrations are critical
**Approach**:

```typescript
Task({
	subagent_type: 'database-architect',
	model: 'haiku', // Simple task
	description: 'Create webhook_events migration',
	prompt: '[Schema spec from plan]'
});
```

## Time-Based Decision

If you can complete the task in **<5 minutes**, do it yourself.

Examples of <5 min tasks:

- Add import statement
- Fix typo
- Update configuration value
- Simple function addition
- Read files for understanding

If task will take **>15 minutes**, consider spawning agent.

Examples of >15 min tasks:

- Multi-file refactoring
- New feature implementation
- Complex bug investigation
- Integration with external API

**Gray area (5-15 min)**:

- Use complexity scoring
- If unfamiliar with codebase area → agent
- If familiar → do yourself

## Context Preservation

**Rule**: If you've already explored the codebase and understand the patterns, do it yourself. Don't spawn an agent to re-discover what you already know.

**Example**:

```
✅ You've read sync_orchestrator.rs and understand the pattern
    → Implement webhook integration yourself

❌ You've read sync_orchestrator.rs
    → Spawn agent to "understand sync patterns" (waste of context)
```

## Agent Budget

For large features from `.plan/`, budget agents wisely:

**Recommended allocation for multi-phase feature:**

1. **Architecture Survey**: 1 Explore agent (sonnet)
2. **Backend Implementation**: 1 rust-pro agent (sonnet)
3. **Frontend Implementation**: 1 frontend-developer agent (sonnet)
4. **Database Migration**: 1 database-architect agent (haiku)
5. **Testing**: 1 test-automator agent (sonnet)
6. **Code Review**: 1 code-reviewer agent (sonnet)

**Total**: 6 agents max per feature

If you need more than 6 agents for a feature, you're probably:

- Not scoping agents narrowly enough
- Doing work that you should do yourself
- Breaking down phases incorrectly

## Quick Decision Prompts

**Ask yourself:**

1. **"Can I complete this in <5 minutes?"**
   - YES → Do it yourself
   - NO → Continue

2. **"Does this require understanding patterns across multiple files?"**
   - YES → Consider Explore agent
   - NO → Continue

3. **"Does this require writing >50 lines of new code?"**
   - YES → Consider specialized agent
   - NO → Do it yourself

4. **"Do I understand the existing patterns well enough?"**
   - YES → Do it yourself
   - NO → Spawn agent to learn patterns first

5. **"Is this backend AND frontend work?"**
   - YES → Spawn 2 agents in parallel
   - NO → Single agent or do yourself

## Summary Table

| Task Type                         | Agent? | Agent Type                 | Model  |
| --------------------------------- | ------ | -------------------------- | ------ |
| Read plan file                    | No     | N/A                        | N/A    |
| Architecture survey (multi-file)  | Yes    | Explore                    | sonnet |
| Architecture survey (single file) | No     | N/A                        | N/A    |
| Backend feature (complex)         | Yes    | rust-pro                   | sonnet |
| Backend feature (simple)          | No     | N/A                        | N/A    |
| Frontend feature (complex)        | Yes    | frontend-developer         | sonnet |
| Frontend feature (simple)         | No     | N/A                        | N/A    |
| Database migration                | Yes    | database-architect         | haiku  |
| Simple config change              | No     | N/A                        | N/A    |
| Add imports (<10 files)           | No     | N/A                        | N/A    |
| Add imports (50+ files)           | Script | N/A                        | N/A    |
| Testing (comprehensive)           | Yes    | test-automator             | sonnet |
| Testing (single unit test)        | No     | N/A                        | N/A    |
| Code review (full feature)        | Yes    | code-reviewer              | sonnet |
| Code review (small change)        | No     | N/A                        | N/A    |
| Bug fix (simple)                  | No     | N/A                        | N/A    |
| Bug fix (complex, multi-file)     | Yes    | debugger or specific agent | sonnet |
| Refactor (single file)            | No     | N/A                        | N/A    |
| Refactor (multiple files)         | Yes    | Appropriate specialist     | sonnet |

---

**Remember**: Agents are powerful but expensive (tokens + time). Use them for complex tasks where their expertise adds value. Do simple mechanical tasks yourself.

**Last Updated**: 2025-12-29
**For**: SvelteHR project (40k+ files)
