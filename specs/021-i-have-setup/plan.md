# Implementation Plan: Comprehensive Audit Logging Implementation

**Branch**: `021-i-have-setup` | **Date**: 2025-10-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/chanway/Projects/SvelteHR/specs/021-i-have-setup/spec.md`

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path → ✅ COMPLETE
2. Fill Technical Context (scan for NEEDS CLARIFICATION) → ✅ COMPLETE
3. Fill Constitution Check section → ✅ COMPLETE
4. Evaluate Constitution Check section → ✅ COMPLETE
5. Execute Phase 0 → research.md → ✅ COMPLETE
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md → ✅ COMPLETE
7. Re-evaluate Constitution Check section → ✅ COMPLETE
8. Plan Phase 2 → Describe task generation approach → ✅ COMPLETE
9. STOP - Ready for /tasks command → ✅ READY
```

**IMPORTANT**: The /plan command STOPS at step 9. Phases 2-4 are executed by other commands:

- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

This feature fixes incomplete audit logging in the existing SvelteHR application to capture ALL database table changes (CREATE/UPDATE/DELETE) with rollback capabilities. Current issue: Employee creation events are not being logged. Solution: Implement comprehensive database-level audit triggers with cryptographic integrity, 1-year retention policy, multi-format export (CSV/JSON/PDF), and full rollback workflow with approval system for super_admin users.

**Key Technical Approach**:
- PostgreSQL triggers for automatic audit log capture on ALL tables
- Digital signatures (ECDSA) for tamper-proof audit integrity
- GraphQL mutations for rollback operations with optimistic locking
- Server-side export generation (CSV/JSON/PDF) via background jobs
- Performance optimization: < 100ms latency via async batch writing
- GDPR-compliant IP logging with legitimate interest justification

## Technical Context

**Language/Version**: TypeScript 5.0 (strict mode), PostgreSQL 14+
**Primary Dependencies**: SvelteKit 2.22.0, Svelte 5.0 (runes), PostGraphile (GraphQL), node-postgres, pdfkit, csv-writer, crypto (Node.js built-in)
**Storage**: PostgreSQL with Row-Level Security (RLS), Redis for caching audit statistics
**Testing**: Playwright (E2E), Vitest (unit/integration), Storybook (component testing)
**Target Platform**: Linux server (Node.js 20+), browser clients (modern evergreen)
**Project Type**: Web (SvelteKit frontend + PostGraphile/PostgreSQL backend)
**Performance Goals**: < 100ms additional latency per logged operation, < 200ms GraphQL query response
**Constraints**: Transaction atomicity (audit log write = data write), GDPR Article 6(1)(f) compliance, 1-year retention with archival
**Scale/Scope**: Supports 10k+ employees, 1M+ audit log entries per year, 50+ database tables

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Initial Check (Before Phase 0)

✅ **I. Test-First Development (NON-NEGOTIABLE)**
- Plan includes contract tests in Phase 1, E2E tests for rollback workflows
- Vitest unit tests for audit trigger functions, performance benchmarks
- Test coverage >90% required per FR-028

✅ **II. Type Safety First**
- TypeScript 5.0 strict mode throughout
- GraphQL schema generates types via PostGraphile
- Zod schemas for audit log validation

✅ **III. Security by Design**
- PostgreSQL RLS enforces row-level security on audit logs table
- RBAC: super_admin (100) for rollback, admin/hr_admin (60-80) for viewing
- Digital signatures (ECDSA) for tamper detection (FR-022)
- GDPR Article 6(1)(f) compliance for IP logging

✅ **IV. Performance Standards**
- < 100ms latency budget for audit logging operations
- Redis caching for audit statistics (FR-021)
- Async batch writing if 100ms threshold exceeded
- Database indexing on (created_at, resource_type, user_id)

✅ **V. Component Architecture**
- Svelte 5 runes for all UI components
- Server-side data loading via +page.server.ts
- No direct API calls from components
- Reusable components: AuditLogFilters, ActivityFeed (already exist from Feature 020)

✅ **VI. MCP-First Development (NON-NEGOTIABLE)**
- Will use Serena MCP for database schema discovery
- Archon MCP for task tracking during implementation
- Code modifications via `replace_symbol_body`, `insert_after_symbol`

**Constitution Compliance**: ✅ PASS (no violations detected)

### Post-Design Check (After Phase 1)

✅ **Constitution Re-validation**: All principles maintained in design artifacts
- Data model uses proper PostgreSQL types with validation
- Contracts follow GraphQL best practices
- Quickstart includes TDD workflow examples
- No architectural deviations requiring justification

## Project Structure

### Documentation (this feature)

```
specs/021-i-have-setup/
├── plan.md              # This file (/plan command output) ✅
├── research.md          # Phase 0 output (/plan command) ✅
├── data-model.md        # Phase 1 output (/plan command) ✅
├── quickstart.md        # Phase 1 output (/plan command) ✅
├── contracts/           # Phase 1 output (/plan command) ✅
│   ├── audit-triggers.sql    # PostgreSQL trigger definitions
│   ├── graphql-schema.graphql # GraphQL mutations/queries
│   └── api-contracts.md       # REST API endpoints (export)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```
# Option 2: Web application (SvelteKit + PostGraphile detected)

# Backend (PostgreSQL + PostGraphile)
database/
├── migrations/
│   └── 00XX_comprehensive_audit_logging.sql  # Triggers, functions, tables
└── schemas/
    └── audit_logging.sql                      # Schema definitions

src/lib/server/
├── audit/
│   ├── crypto-signer.ts         # ECDSA signing utilities
│   ├── export-generator.ts      # CSV/JSON/PDF generation
│   └── retention-manager.ts     # Archival and purging logic
└── graphql/
    └── audit-logs.graphql       # GraphQL operations

# Frontend (SvelteKit)
src/routes/
├── dashboard/activities/logs/   # Already exists (Feature 020)
│   ├── +page.svelte             # Update with real data
│   └── +page.server.ts          # Update with GraphQL queries
└── api/
    └── audit/
        └── export/
            └── +server.ts       # Export API endpoint

src/lib/components/activities/
├── AuditLogFilters.svelte       # Already exists (Feature 020)
├── ActivityFeed.svelte          # Already exists (Feature 020)
└── RollbackButton.svelte        # Already exists (Feature 020)

# Testing
tests/
├── e2e/
│   └── audit-logging.spec.ts    # Playwright E2E tests
├── integration/
│   └── audit-triggers.test.ts   # Database trigger tests
└── unit/
    ├── crypto-signer.test.ts    # ECDSA signing tests
    └── export-generator.test.ts # Export format tests
```

**Structure Decision**: Option 2 (Web application) - SvelteKit frontend + PostGraphile/PostgreSQL backend

## Phase 0: Outline & Research

**Research Objectives**:
1. Analyze existing incomplete audit logging implementation
2. Research PostgreSQL trigger best practices for comprehensive table coverage
3. Evaluate ECDSA vs RSA for audit log signing performance
4. Research PDF generation libraries compatible with Node.js
5. Investigate async batch writing strategies for < 100ms latency

**Research Output**: See [research.md](./research.md)

**Key Findings**:
- ✅ Existing `activity_logs` table found in schema (Feature 020)
- ✅ Missing: Database triggers on application tables (employees, departments, etc.)
- ✅ ECDSA (ES256) recommended over RSA for faster signing (3-5ms vs 15-25ms)
- ✅ `pdfkit` library suitable for PDF generation with streaming support
- ✅ PostgreSQL `LISTEN/NOTIFY` + Node.js worker queue for async batch writing

## Phase 1: Design & Contracts

_Prerequisites: research.md complete ✅_

**Artifacts Generated**:
1. ✅ **data-model.md** - Extended audit_logs schema with signature fields
2. ✅ **contracts/** - PostgreSQL triggers, GraphQL mutations, REST API specs
3. ✅ **quickstart.md** - TDD workflow for implementing audit triggers
4. ✅ **CLAUDE.md** - Updated with audit logging context (incremental update)

**Design Decisions**:
- Use PostgreSQL `BEFORE INSERT/UPDATE/DELETE` triggers on ALL application tables
- Store snapshots as JSONB for efficient querying
- Separate table for cryptographic signatures (1:1 with audit_logs)
- GraphQL mutations for rollback operations (not database triggers)
- Server-side export generation with background job queue

**Contract Test Strategy**:
- One test file per trigger (tests/integration/triggers/)
- Assert audit log entry created for each CRUD operation
- Verify signature validation passes
- Tests MUST fail initially (no triggers implemented yet)

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - DO NOT execute during /plan_

**Task Generation Strategy**:

1. **Database Layer Tasks** (Priority: Highest, TDD order):
   - T001: Write failing test for employee INSERT trigger [P]
   - T002: Implement employee INSERT trigger to pass test [P]
   - T003: Write failing test for employee UPDATE trigger [P]
   - T004: Implement employee UPDATE trigger to pass test [P]
   - T005-T020: Repeat for all 8 core tables (departments, users, roles, etc.)

2. **Cryptographic Signing Tasks**:
   - T021: Write failing unit test for ECDSA signing utility
   - T022: Implement crypto-signer.ts with ES256 algorithm
   - T023: Add signature validation to audit log queries

3. **Rollback Operation Tasks**:
   - T024: Write failing E2E test for rollback workflow
   - T025: Implement GraphQL rollback mutation with optimistic locking
   - T026: Update RollbackButton component to use real mutation

4. **Export Feature Tasks**:
   - T027: Write failing test for CSV export generation
   - T028: Implement CSV export using csv-writer library
   - T029: Write failing test for JSON export
   - T030: Implement JSON export with streaming
   - T031: Write failing test for PDF export
   - T032: Implement PDF export using pdfkit
   - T033: Create export API endpoint (/api/audit/export)

5. **Retention & Archival Tasks**:
   - T034: Write failing test for 1-year retention enforcement
   - T035: Implement retention-manager.ts with scheduled archival
   - T036: Add PostgreSQL cron job for automated purging

6. **Performance Optimization Tasks**:
   - T037: Implement async batch writing with PostgreSQL LISTEN/NOTIFY
   - T038: Add Redis caching for audit statistics queries
   - T039: Create database indexes for common query patterns

7. **Integration & E2E Tests**:
   - T040: E2E test for employee creation with audit log verification
   - T041: E2E test for rollback approval workflow (super_admin)
   - T042: E2E test for export feature (all formats)
   - T043: Performance test for 1000 concurrent logged operations

8. **UI Updates**:
   - T044: Update audit logs page with real GraphQL data
   - T045: Add export button with format selection
   - T046: Update dashboard widgets with real audit statistics

**Ordering Strategy**:
- Database triggers first (foundation for all logging)
- Cryptographic signing parallel with triggers
- Rollback operations after triggers complete
- Export features independent (can be parallel)
- Performance optimization after core features work
- E2E tests after feature completion

**Estimated Output**: 46 numbered, ordered tasks in tasks.md

**Task Dependencies**:
- T002 depends on T001 (TDD cycle)
- T025 depends on T002-T020 (needs audit logs to exist)
- T040-T043 depend on all feature tasks complete
- T044-T046 depend on T025 (rollback mutation ready)

**Parallelization Opportunities** (marked [P]):
- All trigger test/implementation pairs can run in parallel
- Export format implementations (CSV/JSON/PDF) are independent
- UI component updates can happen alongside backend work

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

_These phases are beyond the scope of the /plan command_

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

**Validation Criteria**:
- All 46 tasks completed with passing tests
- Performance benchmark: < 100ms latency for logged operations
- E2E tests pass for employee creation, rollback, export
- Test coverage >90% for new code
- GDPR compliance documented in privacy policy
- 1-year retention policy configured and tested

## Complexity Tracking

_Fill ONLY if Constitution Check has violations that must be justified_

No violations detected. All design decisions align with constitutional principles.

## Progress Tracking

_This checklist is updated during execution flow_

**Phase Status**:

- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command) → **NEXT STEP**
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (5/5 clarifications answered)
- [x] Complexity deviations documented (none - all compliant)

---

_Based on Constitution v1.1.0 - See `.specify/memory/constitution.md`_
