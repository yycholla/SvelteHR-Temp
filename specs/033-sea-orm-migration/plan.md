# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: Rust 1.75+ (current project uses Rust for GraphQL backend)
**Primary Dependencies**: SeaORM 0.12, async-graphql 7.0, axum 0.8, jsonwebtoken 9.0, sqlx (migration source), pgcrypto (encryption)
**Storage**: PostgreSQL (existing database with 20+ tables, computed columns, constraints, business logic functions)
**Testing**: cargo test (Rust unit tests), integration tests for GraphQL API, performance benchmarks
**Target Platform**: Linux server (containerized deployment)
**Project Type**: Web application backend (GraphQL API server)
**Performance Goals**: <500ms API responses, <2s complex operations, maintain existing query performance, support advanced features
**Constraints**: Medium scale (10k-100k records, 100-1000 concurrent users), 99.9% uptime, 100% frontend compatibility, preserve business logic
**Scale/Scope**: Enterprise HR system with 20+ entities, RBAC authentication, comprehensive audit logging, complex relationships, advanced features (encryption, waitlists, versioning)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Status**: PASS - No constitution violations identified. Project constitution is template-only with no specific constraints defined for this Rust/SeaORM migration.

**Post-Design Status**: PASS - Design phase completed with comprehensive data model, API contracts, and implementation guidance. No additional constitution concerns identified.

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
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

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

_Fill ONLY if Constitution Check has violations that must be justified_

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
