# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Migrate the HR system's backend from sqlx to SeaORM while maintaining 100% feature parity with existing SvelteKit frontend functionality. The migration involves 10+ core entities with complex relationships, computed columns, and GraphQL API compatibility. Include SeaORM optimizations, enhanced authentication integration using axum-login, and comprehensive data integrity validation.

**Critical Migration Scope**:

- **10 Core Entities**: Users, Departments, Tasks, Leave Requests, Performance Reviews, Audit Logs, Notifications, Documents, Reports, Employee Records
- **Complex Relationships**: Self-referential hierarchies (departments, tasks), multi-table joins, computed columns
- **Frontend Compatibility**: Maintain existing GraphQL field names, relationships, and query patterns
- **Authentication**: JWT compatibility with SvelteKit Better Auth, RBAC integration
- **Data Integrity**: Preserve all constraints, validations, and business rules

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: Rust 1.75+ (current project uses Rust for GraphQL backend)
**Primary Dependencies**: SeaORM 0.12, async-graphql 7.0, axum 0.8, jsonwebtoken 9.0, sqlx (migration source)
**Storage**: PostgreSQL (existing database with 15+ tables, computed columns, constraints)
**Testing**: cargo test (Rust unit tests), integration tests for GraphQL API
**Target Platform**: Linux server (containerized deployment)
**Project Type**: Web application backend (GraphQL API server)
**Performance Goals**: <500ms API responses, <2s complex operations, maintain existing query performance
**Constraints**: Medium scale (10k-100k records, 100-1000 concurrent users), 99.9% uptime, 100% frontend compatibility
**Scale/Scope**: Enterprise HR system with 10+ entities, RBAC authentication, comprehensive audit logging, complex relationships

## Existing Codebase Analysis

### Database Schema Overview

**Current State**: PostgreSQL with 15+ tables across hr_public, hr_private, and hr_hidden schemas
**Key Tables**:

- `hr_public.users` - Core user entity with authentication, RBAC, and profile data (computed columns: display_name, full_name)
- `hr_public.departments` - Organizational structure with hierarchical relationships and manager assignments
- `hr_public.tasks` - Complex task system with dependencies, assignments, audit trails, and multi-assignee support
- `hr_public.leave_requests` - Time-off management with approval workflows and balance tracking
- `hr_public.performance_reviews` - Employee evaluations with goals, feedback, and rating systems
- `hr_public.activity_logs` - Comprehensive audit logging with rollback capabilities and before/after snapshots
- `hr_public.events` - Event management with attendees, scheduling, and RSVP functionality
- `hr_public.documents` - File management with access controls, versioning, and encryption

**Computed Columns**: Display names, full names, derived aggregations, and business logic fields
**Constraints**: Foreign keys, unique constraints, check constraints, and business rule validations
**Enums**: Task status/priority, leave types/status, review status, event types, user roles

### Frontend Expectations

**GraphQL API Compatibility Requirements**:

- **Existing Queries**: `users`, `departments`, `tasks`, `leaveRequests`, `performanceReviews`, `activityLogs`, `events`
- **Field Naming**: Must maintain exact field names (e.g., `display_name`, `full_name`, `department_id`, `manager_id`)
- **Relationships**: Lazy-loaded relationships via DataLoader pattern for performance
- **Pagination**: Relay-style pagination with `nodes`, `totalCount`, `pageInfo` structure
- **Filtering**: PostGraphile-style conditions and filters with complex WHERE clauses
- **Authentication**: JWT tokens compatible with SvelteKit Better Auth integration

**Query Patterns to Preserve**:

- Complex joins across multiple tables (users → departments → managers)
- Self-referential relationships (departments hierarchy, task dependencies)
- Computed aggregations (employee counts, task statistics, leave balances)
- Time-based filtering and sorting with timezone handling
- Soft delete patterns with `deleted_at` timestamps

### Current Implementation Patterns

**sqlx Usage Patterns**:

- Direct SQL queries with `query_as!` macros for type-safe deserialization
- Manual relationship loading with separate queries and DataLoader batching
- Transaction management for complex multi-table operations
- Raw SQL for complex business logic and computed columns
- Connection pooling with `PgPool` for performance

**Authentication Implementation**:

- JWT token validation in axum middleware
- User context extraction from tokens for GraphQL resolvers
- Role-based authorization checks with permission hierarchies
- Session management for web interface state
- Integration with SvelteKit Better Auth for frontend auth

**Error Handling Patterns**:

- Database constraint error handling with user-friendly messages
- Transaction rollback on failures with proper cleanup
- Audit logging for all data modification operations
- Graceful degradation for missing relationships
- Validation error aggregation and reporting

**Performance Patterns**:

- DataLoader for N+1 query prevention
- Connection pooling for database efficiency
- Query optimization with proper indexing
- Caching strategies for frequently accessed data
- Pagination for large result sets

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

[Gates determined based on constitution file]

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
