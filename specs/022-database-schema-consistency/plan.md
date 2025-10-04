# Implementation Plan: Database Schema Consistency and Migration Audit

**Branch**: `022-database-schema-consistency` | **Date**: 2025-10-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/chanway/Projects/SvelteHR/specs/022-database-schema-consistency/spec.md`

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:

- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

This feature ensures complete database schema consistency and replicability across all environments by auditing existing database structure against version-controlled initialization scripts and migration files. The system will provide automated verification tools, generate missing migration files for undocumented schema changes, and maintain comprehensive documentation of all schema evolution. Primary goal: Any developer can clone the repository and initialize a working database that matches production exactly, with zero manual schema adjustments required.

## Technical Context

**Language/Version**: TypeScript 5.0 (tooling scripts), SQL (PostgreSQL 14+), Bash (automation)
**Primary Dependencies**: PostgreSQL pg client, Docker, pg_dump/pg_restore utilities, Bash 4+
**Storage**: PostgreSQL 14+ database (hr_public schema with 22 tables)
**Testing**: Contract tests for schema verification tool, integration tests for migration generation
**Target Platform**: Linux/macOS development environments, Docker containers, CI/CD pipelines (GitHub Actions)
**Project Type**: Web (SvelteKit frontend + PostgreSQL backend with verification tooling)
**Performance Goals**: Schema comparison <5 seconds for 22 tables, migration file generation <10 seconds
**Constraints**: Must work with existing 25+ migration files, must not modify production databases automatically, verification must be non-blocking in CI/CD
**Scale/Scope**: 22 current tables, ~25 existing migrations, support for development/staging/production environments

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Test-First Development ✅
- Schema verification tool will have contract tests written first (RED phase)
- Migration generation scripts will have integration tests for accuracy
- All tooling scripts tested with >90% coverage
- E2E tests for complete audit-verify-remediate workflow

### II. Type Safety First ✅
- TypeScript 5.0 with strict mode for all tooling scripts
- SQL schema types validated through pg-types or similar
- All configuration and report formats strongly typed
- No `any` types except for dynamic PostgreSQL introspection results (justified)

### III. Security by Design ✅
- Schema verification runs read-only queries only
- No production database modifications without explicit manual approval
- Generated migration files reviewed before application
- Audit logs for all schema change operations
- No credentials in tooling scripts (use environment variables)

### IV. Performance Standards ✅
- Schema comparison completes in <5 seconds (vs <200ms API requirement - different domain)
- Migration file generation <10 seconds
- Verification tool suitable for CI/CD (non-blocking informational checks)
- Minimal database connection overhead (connection pooling where applicable)

### V. Component Architecture ⚠️ PARTIAL
- This is primarily a tooling/infrastructure feature (scripts, not UI components)
- No Svelte components required for schema verification
- README documentation follows established patterns
- CLI tools follow consistent error handling patterns
- **Justification**: Infrastructure tooling doesn't require Svelte components

### VI. MCP-First Development ✅
- Will use Serena MCP for onboarding check before implementation
- Use `mcp__serena__list_dir()` and `mcp__serena__find_file()` to locate existing migration files
- Use `mcp__serena__search_for_pattern()` to analyze current database setup code
- Use Archon MCP for task management per CLAUDE.md
- TodoWrite only for secondary tracking during implementation

**Constitution Compliance**: PASS with justification for Component Architecture (infrastructure tooling exception)

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Option 2 (Web application) - SvelteKit frontend + PostgreSQL backend. Tooling scripts will be placed in `/scripts/db/` for database utilities and `/migrations/` for migration files.

## Phase 0: Outline & Research

1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:

   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

**Status**: ✅ COMPLETE - See [research.md](./research.md)

## Phase 1: Design & Contracts

_Prerequisites: research.md complete_

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/\*, failing tests, quickstart.md, agent-specific file

**Status**: ✅ COMPLETE
- Created [data-model.md](./data-model.md) with comprehensive TypeScript interfaces
- Generated 4 API contracts in [contracts/](./contracts/):
  - verify-schema.contract.yaml
  - generate-migration.contract.yaml
  - rebuild-init-script.contract.yaml
  - validate-migrations.contract.yaml
- Created [quickstart.md](./quickstart.md) with 5 complete workflows
- Updated CLAUDE.md agent context file

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - DO NOT execute during /plan_

**Task Generation Strategy**:

The /tasks command will generate tasks based on the CLI tooling architecture defined in Phase 1 contracts:

1. **Contract Test Tasks** (from 4 API contracts):
   - Task: Write contract tests for verify-schema CLI [P]
   - Task: Write contract tests for generate-migration CLI [P]
   - Task: Write contract tests for rebuild-init-script CLI [P]
   - Task: Write contract tests for validate-migrations CLI [P]

2. **Data Model Tasks** (from data-model.md):
   - Task: Implement SchemaMetadata and TableDefinition interfaces [P]
   - Task: Implement constraint and index definition interfaces [P]
   - Task: Implement SchemaDiff and TableDiff interfaces [P]
   - Task: Implement MigrationFile and VerificationReport interfaces [P]

3. **PostgreSQL Introspection Tasks**:
   - Task: Implement information_schema query functions
   - Task: Implement pg_catalog query functions for indexes/triggers
   - Task: Implement data type normalization logic
   - Task: Implement schema metadata capture service

4. **Schema Comparison Tasks**:
   - Task: Implement Phase 1 structural diff (tables, columns)
   - Task: Implement Phase 2 data type diff
   - Task: Implement Phase 3 semantic diff (indexes, constraints)
   - Task: Implement diff summary generation

5. **CLI Implementation Tasks** (following TDD):
   - Task: Implement verify-schema CLI entrypoint
   - Task: Implement generate-migration CLI entrypoint
   - Task: Implement rebuild-init-script CLI entrypoint
   - Task: Implement validate-migrations CLI entrypoint

6. **Migration Generation Tasks**:
   - Task: Implement SQL template system for CREATE/ALTER statements
   - Task: Implement migration file writer with metadata headers
   - Task: Implement rollback migration generator
   - Task: Implement checksum calculation (SHA-256)

7. **Integration Test Tasks**:
   - Task: E2E test: Fresh database init → verify PASS
   - Task: E2E test: Detect drift → generate migration → apply → verify PASS
   - Task: E2E test: Rebuild init script → validate equivalence
   - Task: E2E test: CI/CD workflow simulation

8. **Documentation Tasks**:
   - Task: Create README with installation instructions
   - Task: Add npm scripts to package.json (db:verify, db:generate-migration, etc.)
   - Task: Create example GitHub Actions workflow
   - Task: Document migration naming conventions

**Ordering Strategy**:

- Phase 1: Contract tests (all parallel, RED phase)
- Phase 2: Data models (parallel, foundational types)
- Phase 3: Database introspection (sequential, dependency chain)
- Phase 4: Schema comparison engine (sequential, builds on Phase 3)
- Phase 5: CLI implementations (parallel per tool, sequential per tool)
- Phase 6: Migration generation (sequential, complex logic)
- Phase 7: Integration tests (sequential, validates complete system)
- Phase 8: Documentation (parallel)

**Parallelization Markers**:
- [P] = Tasks can run in parallel (independent files, no shared state)
- Sequential tasks numbered within their phase

**Estimated Output**: 30-35 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

_These phases are beyond the scope of the /plan command_

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking

_Fill ONLY if Constitution Check has violations that must be justified_

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |

## Progress Tracking

_This checklist is updated during execution flow_

**Phase Status**:

- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: PASS (with Component Architecture justification)
- [x] Post-Design Constitution Check: PASS (no new violations introduced)
- [x] All NEEDS CLARIFICATION resolved (via /clarify session)
- [x] Complexity deviations documented (infrastructure tooling exception)

**Post-Design Constitution Re-evaluation**:

After completing Phase 1 design (data model, contracts, quickstart), re-evaluating constitutional compliance:

- **I. Test-First Development** ✅ - Contract tests defined in 4 OpenAPI specs, integration test scenarios documented in quickstart
- **II. Type Safety First** ✅ - All data models defined with strict TypeScript interfaces, no new `any` types introduced
- **III. Security by Design** ✅ - Contracts specify read-only database queries, manual review gates, no credentials in code
- **IV. Performance Standards** ✅ - Performance goals maintained (<5s verification, <10s migration generation)
- **V. Component Architecture** ⚠️ PARTIAL - Still justified (CLI tooling, no UI components needed)
- **VI. MCP-First Development** ✅ - Implementation will use Serena MCP for code discovery, Archon MCP for task management

**Verdict**: PASS - No new constitutional violations introduced during design phase. Original Component Architecture justification still valid.

---

_Based on Constitution v2.1.1 - See `/memory/constitution.md`_
