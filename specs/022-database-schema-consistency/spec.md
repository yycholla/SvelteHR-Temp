# Feature Specification: Database Schema Consistency and Migration Audit

**Feature Branch**: `022-database-schema-consistency`
**Created**: 2025-10-03
**Status**: Draft
**Input**: User description: "It appears that some database changes have been applied without being properly implemented in our initialization schema or migrations. This is an issue as I am trying to make this project replicatable. Please review our entire db structure and tables and cross reference the schema, initialization, and migration files. These should be 1 to 1. I want to be able to initialize this database on any computer and have it work in tandem with the frontend as if it was made there."

## Execution Flow (main)

```
1. Parse user description from Input
   → Identified need: Ensure database changes are tracked in version control
2. Extract key concepts from description
   → Actors: Developers setting up project, DevOps teams deploying
   → Actions: Initialize database, apply migrations, verify schema consistency
   → Data: Database tables, columns, constraints, indexes, functions
   → Constraints: Must be identical across environments
3. For each unclear aspect:
   → All critical clarifications resolved
4. Fill User Scenarios & Testing section
   → User flow: Developer clones repo → runs init → gets working database
5. Generate Functional Requirements
   → All requirements are testable via schema inspection
6. Identify Key Entities
   → Database schemas, migration files, initialization scripts
7. Run Review Checklist
   → All clarifications resolved - spec ready for planning
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines

- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-03

- Q: Should production databases be included in automated schema drift audits? → A: No - only audit development/staging environments
- Q: Should schema consistency verification be integrated into CI/CD pipelines? → A: Yes - informational only (warns but doesn't block)
- Q: When schema drift is discovered in production (through manual audit), what action should be taken? → A: Generate migration files only (no auto-fix)
- Q: When the audit discovers schema elements in version control but missing from the database, should the generated migration be auto-applied? → A: Never auto-apply (always require manual review)

---

## User Scenarios & Testing _(mandatory)_

### Primary User Story

A new developer joins the team and needs to set up the SvelteHR project on their local machine. They clone the repository, follow the setup instructions to initialize the database, and expect to have a fully functional database that matches exactly what other developers have, with all tables, columns, constraints, indexes, and functions properly created. The frontend application should work immediately without any "table doesn't exist" or "column not found" errors.

Similarly, when deploying to a new environment (staging, production), the DevOps team should be able to run initialization scripts that create an identical database schema to what developers use locally.

### Acceptance Scenarios

1. **Given** a fresh PostgreSQL instance, **When** a developer runs the database initialization script, **Then** all 22 tables (users, departments, events, tasks, activity_logs, rollback_requests, bulk_rollback_batches, etc.) must be created with identical structure to the current production schema

2. **Given** migration files numbered 01 through 20251003_003, **When** applied sequentially to a fresh database, **Then** the resulting schema must match byte-for-byte the schema created by the initialization script

3. **Given** the current production database schema, **When** compared against the initialization schema in version control, **Then** there must be zero differences in table structures, column definitions, constraints, indexes, or functions

4. **Given** a developer who has never seen this project, **When** they follow the README database setup instructions, **Then** they can start the frontend application and all features work without database-related errors

5. **Given** a new table created via migration file (e.g., bulk_rollback_batches), **When** reviewing the initialization schema, **Then** that table definition must also exist in the initialization schema with identical structure

6. **Given** the migration file history, **When** a new migration is added, **Then** the initialization schema must be updated to reflect the cumulative changes

### Edge Cases

- What happens when a developer manually creates a table in their local database but doesn't add it to migrations?
- How does the system detect when someone applied a migration directly to the database without updating the migration files in version control?
- What happens when a migration file is edited after it's been applied to production?
- How do we handle migration numbering conflicts when multiple developers create migrations simultaneously?
- What happens if the initialization script is run on a database that already has partial schema?
- When production drift is detected through manual audit, system generates migration files but does not apply changes (manual review required)

---

## Requirements _(mandatory)_

### Functional Requirements

#### Schema Consistency Requirements

- **FR-001**: System MUST provide an initialization script that creates all database tables, indexes, constraints, and functions required for the application to function
- **FR-002**: The initialization script MUST produce a schema identical to applying all migration files sequentially to a fresh database
- **FR-003**: Every table, column, index, constraint, and function in the current database MUST have a corresponding definition in either the initialization schema or a migration file
- **FR-004**: Migration files MUST be numbered sequentially to ensure deterministic application order
- **FR-005**: System MUST document which migration file created each table/column/constraint for audit trail purposes

#### Verification Requirements

- **FR-006**: System MUST provide a verification tool that compares the current database schema against the initialization schema plus all migrations
- **FR-007**: The verification tool MUST report all differences including: missing tables, extra tables, column type mismatches, missing constraints, extra constraints, missing indexes, and extra indexes
- **FR-008**: System MUST fail verification if any differences are detected between expected schema and actual database schema
- **FR-009**: Verification MUST be runnable in local development, CI/CD pipelines, and staging environments (production excluded from automated audits)
- **FR-009a**: CI/CD integration MUST run verification as informational check only (warns but does not block deployments)

#### Migration Management Requirements

- **FR-010**: Migration files MUST never be edited after being applied to any non-development environment
- **FR-011**: System MUST track which migrations have been applied to prevent duplicate application
- **FR-012**: Migration files MUST be idempotent where possible (safe to run multiple times)
- **FR-013**: Each migration file MUST have a corresponding rollback migration or clear documentation of why rollback is not possible
- **FR-014**: System MUST prevent applying migrations out of order

#### Documentation Requirements

- **FR-015**: README MUST contain complete, step-by-step instructions for database initialization from scratch
- **FR-016**: Each migration file MUST have a comment header explaining what it changes and why
- **FR-017**: System MUST maintain a CHANGELOG of all schema changes with dates and migration file references
- **FR-018**: Documentation MUST specify the supported PostgreSQL version(s)

#### Current State Audit Requirements

- **FR-019**: System MUST audit all current tables (users, departments, events, tasks, activity_logs, rollback_requests, bulk_rollback_batches, attendance_records, compensation_bands, emergency_contacts, employee_goals, employee_vehicles, event_attendees, hr_reports, leave_requests, notifications, payroll_records, performance_reviews, review_templates, time_off_balances, time_off_policies, user_role_assignments) against initialization and migration files
- **FR-020**: Audit MUST identify tables that exist in database but not in version control
- **FR-021**: Audit MUST identify columns/constraints/indexes added outside of migration files
- **FR-022**: Audit MUST produce a report listing all discrepancies found

#### Remediation Requirements

- **FR-023**: For any table/column/constraint found in database but missing from version control, system MUST generate a migration file to document it
- **FR-024**: For any table/column/constraint in version control but missing from database, system MUST create a migration to add it
- **FR-024a**: Remediation migrations MUST never auto-apply and always require manual review before execution
- **FR-025**: After remediation, system MUST verify that initialization schema + migrations exactly matches the target database
- **FR-026**: For production databases, drift remediation MUST only generate migration files without applying changes (manual review required)

### Key Entities

- **Database Schema**: The complete definition of all tables, columns, data types, constraints, indexes, and functions in the PostgreSQL database
- **Initialization Script**: A single SQL file that creates the entire database schema from scratch in its current state
- **Migration File**: A versioned SQL file that applies a specific change to the database schema (e.g., adding a table, modifying a column)
- **Migration History**: A record of which migration files have been applied to which database instances
- **Schema Verification Report**: A comparison report showing differences between expected schema (from init + migrations) and actual database schema
- **Discrepancy**: Any difference between version-controlled schema definitions and the actual database schema

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

**Outstanding Clarifications:**
- None - all clarifications resolved

---

## Execution Status

_Updated by main() during processing_

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## Success Metrics

When this feature is complete, the following must be true:

1. **Zero Schema Drift**: Running the verification tool against development and staging environments shows zero differences
2. **Fresh Setup Success Rate**: 100% of new developers can initialize a working database on first attempt by following README
3. **Deployment Reliability**: Database initialization/migration succeeds on first attempt in 100% of fresh environment deployments
4. **Migration Coverage**: 100% of tables/columns/constraints have a traceable origin in either init schema or a migration file
5. **Documentation Completeness**: All 22 current tables are documented with creation source (init or migration number)

---

## Assumptions

- PostgreSQL is the database system in use
- Docker is used for local development database instances
- The project uses SQL migration files (not ORM-based migrations)
- There is currently a production or staging database that represents the "source of truth" for schema comparison
- Developers have permission to run schema inspection queries on development and staging environments
- Production databases are excluded from automated schema drift audits (manual audits only)
- The hr_public schema is the primary schema containing application tables

---

## Out of Scope

- Migrating from PostgreSQL to another database system
- Automatic schema synchronization between environments (this feature only audits and reports)
- Data migration or backfilling (only schema structure)
- Performance optimization of existing tables/indexes
- Database backup and restore procedures
- Changing the database migration framework or tooling
