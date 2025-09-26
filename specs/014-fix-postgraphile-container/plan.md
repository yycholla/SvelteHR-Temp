
# Implementation Plan: Fix PostgreSQL Container Schema Initialization

**Branch**: `014-fix-postgraphile-container` | **Date**: 2025-09-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-fix-postgraphile-container/spec.md`

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
Fix PostgreSQL development container initialization by organizing database schema and initialization files into a category-based structure (schema, roles, data, indexes) that runs automatically during container startup, ensuring reliable initialization within 30 seconds while preserving all existing data and maintaining PostGraphile compatibility.

## Technical Context
**Language/Version**: SQL, Docker Compose, Shell Scripts, Node.js 20
**Primary Dependencies**: PostgreSQL 15-alpine, PostGraphile, Docker, uuid-ossp extension, pgcrypto extension
**Storage**: PostgreSQL with PostGraphile GraphQL interface, persistent volumes for data retention
**Testing**: Shell/Docker container validation, schema integrity tests, PostGraphile connectivity tests
**Target Platform**: Development containers (Linux Docker environment)
**Project Type**: web - SvelteKit frontend + PostGraphile backend
**Performance Goals**: Database ready within 30 seconds of container startup
**Constraints**: Must preserve existing data across restarts, maintain PostGraphile compatibility, fail fast with clear errors
**Scale/Scope**: Development environment supporting HR schema with ~16 core tables, multiple roles and permissions

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**✅ I. Test-First Development**: Container initialization and schema validation tests will be written first, using shell/Docker-based tests for container startup workflows
**✅ II. Type Safety First**: TypeScript types for container configuration and database schema will be maintained
**✅ III. Security by Design**: RLS policies and JWT authentication preserved in schema initialization, no credentials in container files
**✅ IV. Performance Standards**: 30-second initialization target meets <200ms operational requirements once running
**✅ V. Component Architecture**: Database schema organization follows established patterns, proper separation of concerns
**✅ VI. MCP-First Development**: Archon MCP will be used for task management, Serena MCP for code analysis during implementation

**Status**: PASS - All constitutional requirements satisfied for infrastructure/DevOps task

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

**Structure Decision**: Option 2 (Web application) - SvelteKit frontend + PostGraphile backend detected

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

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

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

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate infrastructure tasks based on category-based initialization file organization
- Create shell/Docker-based validation tests for each initialization category (roles, schema, data, indexes)
- Container configuration and orchestration tasks
- PostGraphile integration verification tasks
- Performance and error handling validation using shell scripts

**Specific Task Categories**:
1. **File Organization Tasks [P]**: Create 01-roles.sql, 02-schema.sql, 03-data.sql, 04-indexes.sql initialization files
2. **Container Configuration Tasks**: Update docker-compose.dev.yml, volume configuration
3. **Shell-Based Validation Test Tasks**: Schema validation scripts, role verification scripts, performance tests
4. **Integration Tasks**: PostGraphile connectivity tests, frontend compatibility validation using Docker commands
5. **Documentation Tasks**: Error message clarity, troubleshooting guides

**Ordering Strategy**:
- Infrastructure first: Initialization file creation and container configuration
- Shell-based validation second: Test script creation for each component
- Integration third: End-to-end connectivity tests using Docker/shell commands
- Documentation last: User-facing guidance
- Mark [P] for parallel execution where files are independent

**Testing Approach**: Shell scripts and Docker commands instead of Python tests for container validation
**Terminology**: Standardized use of "initialization files" throughout (not "migration files")

**Estimated Output**: 15-20 numbered, ordered tasks in tasks.md focusing on container infrastructure

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - research.md created with initialization file organization decisions
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/, quickstart.md created
- [x] Phase 2: Task planning complete (/plan command - describe approach only) - Shell/Docker testing strategy defined
- [x] Phase 3: Tasks generated (/tasks command) - tasks.md created with 25 tasks, shell-based testing approach
- [ ] Phase 4: Implementation complete - Execute tasks.md with proper initialization file organization
- [ ] Phase 5: Validation passed - Run quickstart.md validation and performance tests

**Gate Status**:
- [x] Initial Constitution Check: PASS - All constitutional requirements satisfied
- [x] Post-Design Constitution Check: PASS - Shell-based testing maintains TDD principles
- [x] All NEEDS CLARIFICATION resolved - Research phase addressed technical unknowns
- [x] Complexity deviations documented - No complexity violations identified

**Key Updates Applied**:
- ✅ Updated to shell/Docker testing approach instead of Python tests
- ✅ Standardized terminology to "initialization files" throughout plan
- ✅ Corrected Phase 3 status to reflect tasks.md completion
- ✅ Enhanced testing strategy documentation

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
