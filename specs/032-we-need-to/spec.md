# Feature Specification: Frontend-Backend GraphQL API Schema Alignment System

**Feature Branch**: `032-we-need-to`
**Created**: 2025-10-13
**Status**: Ready for Planning
**Input**: User description: "We need to ensure that all columns expected on the frontend's graphql api calls are represented in our postgres tables 1 to 1 and served as expected by our rust graphql api server. We are treating the frontend as the one source of truth for how our database schema and migrations should be as well as our rust server. We must return exactly what the frontend expects. Any change to the frontend should be explained to the human user in detail on what the change is and why. Do not take any shortcuts and keep comprehensive documentation on what the frontend expects on each and every page and api call and what is and isn't satisfied by our db and rust backend"

## Execution Flow (main)

```
1. Parse user description from Input
   → Feature: Frontend-driven schema alignment system
2. Extract key concepts from description
   → Actors: Developers, Frontend queries, Database, Rust GraphQL server
   → Actions: Validate schema alignment, document expectations, prevent drift
   → Data: GraphQL queries, DB schema, API responses
   → Constraints: Frontend as source of truth, 1:1 mapping required
3. For each unclear aspect:
   → RESOLVED: Pre-commit hook validates before each git commit
   → RESOLVED: Dual notification via terminal output + persistent SCHEMA_ALIGNMENT.md file
   → RESOLVED: Misalignments block commits with detailed error reports
   → RESOLVED: Schema validation only (no performance analysis)
4. Fill User Scenarios & Testing section
   → Primary: Developer adds new GraphQL query to frontend
5. Generate Functional Requirements
   → Schema validation, documentation generation, drift prevention
6. Identify Key Entities
   → Frontend GraphQL Operations, Database Columns, Rust API Schema
7. Run Review Checklist
   → PASS: All clarifications resolved, requirements complete
8. Return: SUCCESS (spec ready for planning phase)
```

---

## ⚡ Quick Guidelines

- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-13

- Q: When should the schema alignment validation system run to catch misalignments? → A: Pre-commit hook - Validates before each git commit, blocking commits with misalignments
- Q: When frontend GraphQL queries are modified and require backend updates, how should developers be notified? → A: Both terminal + file - Display errors in terminal AND maintain a persistent alignment status file
- Q: Should the schema alignment system also validate GraphQL query performance implications? → A: Schema only - Validate only field existence and type matching, no performance analysis (N+1 queries, join complexity, etc. are out of scope)

---

## User Scenarios & Testing _(mandatory)_

### Primary User Story

As a developer working on the HR application, I need a systematic way to ensure that when I write GraphQL queries in the frontend, the corresponding database columns and Rust API fields exist and match exactly. The frontend GraphQL operations should serve as the authoritative definition of what the API must provide. When I make changes to frontend queries, I should have clear documentation showing what database and API changes are required, and any misalignments should be caught before they cause runtime errors.

### Acceptance Scenarios

1. **Given** a developer adds a new GraphQL field to a frontend query, **When** the schema alignment check runs, **Then** the system identifies if the database column exists and if the Rust API exposes it correctly, generating a detailed report of any gaps.

2. **Given** the database schema is modified, **When** the alignment validation runs, **Then** the system warns if any frontend queries expect fields that no longer exist or have changed types.

3. **Given** a complete alignment check, **When** documentation is generated, **Then** developers receive a comprehensive mapping document showing which frontend queries expect which database columns and which Rust API fields satisfy each requirement.

4. **Given** a schema mismatch is detected, **When** the developer attempts to commit their changes, **Then** the commit is blocked, a detailed error report is displayed in the terminal showing which fields are misaligned and what changes are required, AND a `SCHEMA_ALIGNMENT.md` file is updated in the repository with the current alignment status

5. **Given** a new GraphQL operation file is created in the frontend, **When** the system scans it, **Then** all expected fields, types, and relationships are extracted and documented with their current implementation status (implemented, missing, mismatched).

### Edge Cases

- What happens when a frontend query uses GraphQL aliases that differ from database column names?
- How does the system handle computed fields that don't directly map to database columns?
- What if a database column exists but isn't exposed through the GraphQL API?
- How are optional vs required fields validated (nullable vs non-nullable)?
- What about nested GraphQL queries that involve multiple database tables?
- How are enum values validated between frontend expectations and database constraints?
- What happens when a GraphQL query expects a field that the database has under a different name (e.g., frontend expects `recurrencePattern` but DB has `rrule`)?

## Requirements _(mandatory)_

### Functional Requirements

#### Schema Validation

- **FR-001**: System MUST scan all GraphQL operation files in the frontend codebase to extract expected fields, types, and relationships
- **FR-002**: System MUST compare extracted frontend expectations against the actual database schema (table columns, types, constraints)
- **FR-003**: System MUST validate that the Rust GraphQL API exposes all fields expected by frontend queries with matching types
- **FR-004**: System MUST detect type mismatches between frontend expectations, database columns, and API responses (e.g., String vs Int, nullable vs non-nullable)
- **FR-005**: System MUST identify GraphQL field aliases and track how they map to actual database column names
- **FR-006**: System MUST validate enum values match between frontend GraphQL enums, Rust API enums, and PostgreSQL enum types

#### Documentation Generation

- **FR-007**: System MUST generate comprehensive documentation showing a complete mapping matrix of: frontend queries → GraphQL fields → Rust API schema → database columns
- **FR-008**: Documentation MUST include implementation status for each field (implemented, missing in DB, missing in API, type mismatch)
- **FR-009**: System MUST maintain per-page and per-API-call documentation showing exactly what data each frontend component expects
- **FR-010**: When schema changes are detected, system MUST generate a detailed change report explaining what changed, why it matters, and what updates are required
- **FR-011**: Documentation MUST be version-controlled and updated automatically whenever frontend queries, database schema, or API definitions change

#### Drift Prevention

- **FR-012**: System MUST prevent schema drift by establishing the frontend as the single source of truth for API requirements
- **FR-013**: System MUST block git commits via pre-commit hook when schema misalignments are detected, displaying a detailed error report of the violations
- **FR-014**: When a developer modifies a database migration or Rust API schema, system MUST validate against current frontend expectations during pre-commit validation, before allowing the commit
- **FR-015**: System MUST track the history of alignment violations and resolutions to identify patterns of schema drift

#### Change Communication

- **FR-016**: When a frontend GraphQL query is modified, system MUST generate a detailed explanation of what database and API changes are required
- **FR-017**: Change explanations MUST include: affected fields, required database migrations, required Rust API updates, and potential breaking changes
- **FR-018**: System MUST notify developers when frontend changes require backend updates via two channels: (1) terminal output during pre-commit hook with immediate actionable errors, and (2) a persistent `SCHEMA_ALIGNMENT.md` file in the repository root showing current alignment status
- **FR-019**: All schema alignment changes MUST be logged with timestamps, affected components, and the developer who made the change
- **FR-019a**: System MUST maintain a `SCHEMA_ALIGNMENT.md` file in the repository root that is automatically updated on each validation run, containing: current alignment status, list of misaligned fields with details, required actions for each issue, and timestamp of last validation

#### Quality Assurance

- **FR-020**: System MUST validate that 100% of fields in frontend GraphQL queries have corresponding database columns (1:1 mapping requirement)
- **FR-021**: System MUST validate that all database columns exposed by the Rust API are actually requested by at least one frontend query (prevent unused fields)
- **FR-022**: System MUST detect and report "zombie fields" - API fields that no frontend query uses anymore
- **FR-023**: System scope is explicitly limited to schema validation (field existence, type matching, enum validation); performance analysis such as N+1 query detection, join complexity analysis, and query optimization is out of scope

### Key Entities

- **Frontend GraphQL Operation**: A GraphQL query or mutation defined in the frontend codebase (e.g., in `.ts` or `.graphql` files), containing expected fields, their types, arguments, and relationships. Represents the authoritative definition of what the API must provide.

- **Database Column**: A column in a PostgreSQL table with specific type, constraints (nullable, default values), and relationships (foreign keys). Must exist for every field expected by frontend queries.

- **Rust API Schema Field**: A GraphQL field exposed by the Rust async-graphql server, with resolver implementation, type definition, and optional field aliases. Must match frontend expectations in name and type.

- **Alignment Report**: A generated document showing the mapping between frontend expectations, database schema, and API implementation, highlighting any gaps, mismatches, or discrepancies.

- **Schema Change Event**: A logged event recording when frontend queries, database schema, or API definitions are modified, including impact analysis and required follow-up actions.

---

## Review & Acceptance Checklist

_GATE: Automated checks run during main() execution_

### Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

_Updated by main() during processing_

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked and resolved (3 clarifications completed)
- [x] User scenarios defined
- [x] Requirements generated (23 functional requirements)
- [x] Entities identified (5 key entities)
- [x] Review checklist passed

---

## Notes for Planning Phase

This specification establishes a **schema governance system** to prevent the type of misalignment issues that occurred with the Events calendar feature. The core principle is treating the frontend GraphQL operations as the authoritative contract that both the database and Rust API must fulfill.

The system needs to be **proactive rather than reactive** - catching misalignments before they cause runtime errors. This requires automated validation at multiple points in the development workflow.

Key design considerations for the planning phase:
- How to efficiently scan and parse GraphQL operations from frontend files
- How to introspect the database schema programmatically
- How to compare Rust async-graphql schema definitions against frontend expectations
- How to generate actionable, developer-friendly alignment reports
- Where to store and version-control the alignment documentation
- How to implement a pre-commit hook that validates schema alignment without slowing down developer workflow

The specification intentionally avoids prescribing implementation details, allowing the planning phase to explore different approaches to achieving these requirements.
