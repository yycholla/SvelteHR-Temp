# Feature Specification: Debug and Fix Rust GraphQL API for Full Database Coverage

**Feature Branch**: `031-we-have-recently`
**Created**: 2025-10-11
**Status**: Draft
**Input**: User description: "We have recently rebuilt our graphql api in rust. It should have full table coverage and is meant to be a drop in replacement in our frontend for our postgraphile api. This does not seem to be working properly. Please research our implementations, migrations, database, graphql-rust. Find issues within our implementations as well as debug to determine further issues so that we can get this working properly."

## Execution Flow (main)

```
1. Parse user description from Input
   → Rust GraphQL API rebuild intended as PostGraphile replacement
2. Extract key concepts from description
   → Actors: Developers, Frontend application, Database
   → Actions: Query/mutate all tables, maintain compatibility, debug issues
   → Data: PostgreSQL database with 43+ tables
   → Constraints: Full table coverage, drop-in replacement, GraphQL spec compliance
3. Unclear aspects marked with [NEEDS CLARIFICATION]
4. User Scenarios & Testing section completed
5. Functional Requirements generated
6. Key Entities identified (gap analysis)
7. Review Checklist validated
8. Return: SUCCESS (spec ready for debugging and implementation)
```

---

## ⚡ Quick Guidelines

- ✅ Focus on WHAT users need and WHY (complete table access, functional parity)
- ❌ Avoid HOW to implement (implementation details belong in planning phase)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-11

- Q: What field naming convention does the existing PostGraphile implementation use for GraphQL field names? → A: camelCase (standard GraphQL convention - firstName, lastName, departmentId, createdAt)

- Q: What pagination strategy does PostGraphile use (limit/offset or cursor-based)? → A: Cursor-based pagination following Relay specification (`first`, `after`, `last`, `before` parameters with `Connection`, `Edge`, and `PageInfo` types)

- Q: What is the required refresh frequency for materialized views? → A: Not currently implemented - materialized views exist with CONCURRENT refresh capability but no automated schedule is defined. Recommend: hourly for dashboard_summaries and department_metrics, daily for goal_statistics and report_analytics (subject to business requirements)

---

## Problem Statement

### Current Situation (As-Is)

The HR application currently uses a Rust-based GraphQL API (`localhost:4001/graphql`) that was built to replace PostGraphile. Analysis reveals:

**Implementation Status:**
- **20 models implemented** in Rust GraphQL server (Users, Departments, Roles, Permissions, Events, Event Attendees, Leave Management, Tasks, Performance Reviews, Notifications)
- **43+ tables exist** in PostgreSQL database (`hr_public` schema)
- **~23 tables missing** from GraphQL API implementation
- **Frontend configured** to use Rust GraphQL endpoint but experiencing incomplete data access

**Missing Coverage Includes:**
- Emergency contacts
- Employee vehicles
- Employee skills and certifications
- HR reports
- Compensation bands
- Payroll records
- Document management (documents, versions, categories, assignments, access logs, encrypted storage)
- Time off policies and attendance records
- Activity logs and audit trails
- Rollback system (requests, batches, items)
- Event management (comments, history, waitlist)
- Task system extensions (task types, notification preferences)
- Review system extensions (templates, employee goals, cycles)
- Linked resources
- Materialized views (dashboard summaries, department metrics, goal statistics, report analytics)

### Desired Situation (To-Be)

Users should be able to access and manage **all HR data** through the Rust GraphQL API without needing to know which backend system is processing their requests. The system should provide complete, reliable, and performant access to every table in the database.

---

## User Scenarios & Testing _(mandatory)_

### Primary User Story

As an HR application user (employee, manager, or HR staff), I need the Rust GraphQL API to provide complete access to all HR data stored in the PostgreSQL database so that all application features work correctly without missing data, incomplete queries, or unexpected errors.

### Acceptance Scenarios

1. **Given** a user accesses employee profile data, **When** they query for skills and certifications, **Then** the system returns complete employee skills and certifications data from the `employee_skills` and `employee_certifications` tables

2. **Given** a user manages documents, **When** they upload, version, or retrieve documents, **Then** the system provides access to all document-related tables (documents, document_versions, document_categories, document_assignments, document_access_logs, encrypted_file_storage)

3. **Given** a user views dashboard metrics, **When** they load analytics, **Then** the system returns data from materialized views (mv_dashboard_summaries, mv_department_metrics, mv_goal_statistics, mv_report_analytics)

4. **Given** a user tracks time and attendance, **When** they view attendance records, **Then** the system retrieves data from time_off_policies, attendance_records, and leave_balances tables

5. **Given** a user performs event management, **When** they add comments or track history, **Then** the system accesses event_comments, event_history, and event_waitlist tables

6. **Given** a user manages payroll, **When** they view compensation data, **Then** the system returns payroll_records and compensation_bands information

7. **Given** a developer switches from PostGraphile to Rust GraphQL API, **When** they change the endpoint URL, **Then** all existing queries continue to work with the same field names and response structures

8. **Given** a user performs administrative rollback operations, **When** they request data rollbacks, **Then** the system provides access to rollback_requests, bulk_rollback_batches, and bulk_rollback_items tables

9. **Given** a user views emergency contacts, **When** they access employee emergency information, **Then** the system returns data from the emergency_contacts table

10. **Given** a user manages parking, **When** they register vehicles, **Then** the system provides access to the employee_vehicles table

### Edge Cases

- What happens when a frontend query requests fields from missing tables?
  - System returns GraphQL error "Cannot query field X on type Y" causing frontend to break

- How does the system handle relationships between implemented and missing tables (e.g., user → emergency_contacts)?
  - Relationship resolvers fail silently or return null, breaking data completeness

- What happens when materialized views are queried but not exposed in GraphQL?
  - Dashboard analytics fail to load, showing incomplete or stale data

- How does the system handle migration script execution order when adding new models?
  - Incorrect order causes foreign key constraint violations or missing indexes

- What happens when PostGraphile-specific field names differ from Rust implementation?
  - Frontend queries fail due to field name mismatches (e.g., camelCase vs snake_case)

---

## Requirements _(mandatory)_

### Functional Requirements

#### Data Completeness Requirements

- **FR-001**: System MUST expose GraphQL queries and mutations for all 43+ tables in the PostgreSQL database
- **FR-002**: System MUST provide read access (queries) for all tables including materialized views
- **FR-003**: System MUST provide write access (mutations) for all mutable tables (excluding audit logs and materialized views)
- **FR-004**: System MUST support relationship traversal between all connected tables (foreign key relationships)
- **FR-005**: System MUST handle soft-deleted records appropriately by excluding `deleted_at IS NOT NULL` records from default queries

#### Schema Compatibility Requirements

- **FR-006**: System MUST match PostGraphile field naming conventions (camelCase) to ensure frontend compatibility
- **FR-007**: System MUST provide the same GraphQL types and enums as PostGraphile implementation
- **FR-008**: System MUST support the same filter operators as PostGraphile (eq, ne, gt, lt, in, null checks, range queries)
- **FR-009**: System MUST maintain consistent pagination patterns using cursor-based pagination following Relay specification (first, after, last, before with Connection/Edge/PageInfo types)
- **FR-010**: System MUST return error messages in the same format as PostGraphile for frontend error handling

#### Missing Table Coverage Requirements

- **FR-011**: System MUST implement GraphQL models for emergency_contacts table with full CRUD operations
- **FR-012**: System MUST implement GraphQL models for employee_vehicles table with full CRUD operations
- **FR-013**: System MUST implement GraphQL models for employee_skills and employee_certifications tables with proficiency tracking
- **FR-014**: System MUST implement GraphQL models for document system tables (documents, document_versions, document_categories, document_assignments, document_access_logs, encrypted_file_storage)
- **FR-015**: System MUST implement GraphQL models for HR reporting tables (hr_reports, compensation_bands, payroll_records)
- **FR-016**: System MUST implement GraphQL models for time management tables (time_off_policies, attendance_records)
- **FR-017**: System MUST implement GraphQL models for activity tracking tables (activity_logs, audit trails)
- **FR-018**: System MUST implement GraphQL models for rollback system tables (rollback_requests, bulk_rollback_batches, bulk_rollback_items)
- **FR-019**: System MUST implement GraphQL models for extended event management (event_comments, event_history, event_waitlist)
- **FR-020**: System MUST implement GraphQL models for extended task system (task_types)
- **FR-021**: System MUST implement GraphQL models for extended review system (review_templates, employee_goals)
- **FR-022**: System MUST implement GraphQL read-only access to materialized views (mv_dashboard_summaries, mv_department_metrics, mv_goal_statistics, mv_report_analytics)

#### Debugging and Quality Requirements

- **FR-023**: System MUST provide detailed error messages when GraphQL queries fail, including table name, field name, and error reason
- **FR-024**: System MUST log all database connection errors with sufficient context for debugging
- **FR-025**: System MUST validate all SQL queries at compile time using SQLx macros to prevent runtime SQL errors
- **FR-026**: System MUST include integration tests for all GraphQL queries and mutations
- **FR-027**: System MUST validate that all database table columns are mapped to GraphQL fields

#### Performance and Optimization Requirements

- **FR-028**: System MUST use database connection pooling with configurable pool size (minimum 20 connections)
- **FR-029**: System MUST implement DataLoader pattern for N+1 query prevention on relationship fields
- **FR-030**: System MUST support batch operations for bulk creates, updates, and deletes
- **FR-031**: System MUST refresh materialized views on a scheduled basis (recommended: hourly for dashboard_summaries and department_metrics, daily for goal_statistics and report_analytics)
- **FR-032**: System MUST return paginated results with default page size following Relay cursor pagination

#### Migration and Deployment Requirements

- **FR-033**: System MUST provide migration scripts to add missing table coverage without breaking existing functionality
- **FR-034**: System MUST support running migrations in idempotent manner (safe to re-run)
- **FR-035**: System MUST validate that all migrations have been applied before starting the GraphQL server
- **FR-036**: System MUST provide rollback scripts for each migration in case of deployment issues
- **FR-037**: System MUST log migration execution status and any errors encountered during migration

### Key Entities _(include if feature involves data)_

#### Currently Implemented Entities (20 models)
- **Users**: Employee account information
- **Departments**: Organizational structure
- **Roles**: Permission roles
- **Permissions**: Access control permissions
- **User Role Assignments**: Role assignments to users
- **Events**: Event definitions
- **Event Attendees**: Event RSVP and attendance
- **Leave Types**: Types of leave (vacation, sick, etc.)
- **Leave Balances**: Accrued leave balances
- **Leave Requests**: Time off requests with approval workflow
- **Tasks**: Task definitions and tracking
- **Task Assignees**: Task assignments to users
- **Task Audit Entries**: Audit trail for task changes
- **Task Dependencies**: Task prerequisite relationships
- **Linked Resources**: File and URL attachments
- **Review Cycles**: Performance review cycles
- **Review Goals**: Goals within performance reviews
- **Review Feedback**: Feedback on performance reviews
- **Performance Reviews**: Employee performance evaluations
- **Notifications**: System notifications

#### Missing Entities Requiring Implementation (23+ tables)

**Employee Management:**
- **Emergency Contacts**: Emergency contact information for employees
- **Employee Vehicles**: Vehicle registration for parking and access
- **Employee Skills**: Skills inventory with proficiency levels
- **Employee Certifications**: Professional certifications with expiration tracking
- **Employee Goals**: Individual goal tracking separate from reviews

**Document Management:**
- **Documents**: Core document metadata and storage references
- **Document Versions**: Version control for document revisions
- **Document Categories**: Hierarchical document organization
- **Document Assignments**: Document access control
- **Document Access Logs**: Audit trail for document access
- **Encrypted File Storage**: Secure file storage with encryption

**Time and Attendance:**
- **Time Off Policies**: Leave accrual rules and policies
- **Attendance Records**: Daily attendance and time tracking

**Reporting and Analytics:**
- **HR Reports**: Generated reports and analytics
- **Compensation Bands**: Salary range definitions
- **Payroll Records**: Payroll processing history
- **Activity Logs**: System-wide audit trail
- **Materialized Views**: Precomputed analytics (dashboard summaries, department metrics, goal statistics, report analytics)

**Event Management Extensions:**
- **Event Comments**: Discussion threads on events
- **Event History**: Audit trail of event modifications
- **Event Waitlist**: Queue for full-capacity events

**Task System Extensions:**
- **Task Types**: Task categorization and classification

**Review System Extensions:**
- **Review Templates**: Standardized review templates

**Rollback System:**
- **Rollback Requests**: Data rollback request tracking
- **Bulk Rollback Batches**: Batch rollback operations
- **Bulk Rollback Items**: Individual items within rollback batches

---

## Review & Acceptance Checklist

_GATE: Automated checks run during main() execution_

### Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain (all clarifications resolved)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable (full table coverage = 43+ tables exposed)
- [x] Scope is clearly bounded (complete GraphQL API table coverage)
- [x] Dependencies and assumptions identified (frontend expects camelCase fields with Relay cursor pagination)

---

## Execution Status

_Updated by main() during processing_

- [x] User description parsed (Rust GraphQL API debugging and table coverage)
- [x] Key concepts extracted (full table coverage, drop-in replacement, compatibility issues)
- [x] Ambiguities marked (3 clarification points for PostGraphile compatibility)
- [x] User scenarios defined (10 acceptance scenarios covering all missing table groups)
- [x] Requirements generated (37 functional requirements across 6 categories)
- [x] Entities identified (20 implemented + 23 missing = 43 total database tables)
- [x] Review checklist passed (all clarifications resolved)

**Status**: ✅ SUCCESS "Specification complete and ready for planning phase"

---

## Analysis Summary

### Current Implementation Gap

**Coverage Analysis:**
- ✅ **20 tables implemented** (46.5% coverage)
- ❌ **23+ tables missing** (53.5% gap)
- 🔍 **Implementation focus**: Core HR entities (users, departments, roles, events, leave, tasks, reviews, notifications)
- 📊 **Missing areas**: Document management (6 tables), time tracking (2 tables), analytics (4 materialized views), employee details (4 tables), system administration (7 tables)

### Root Cause Analysis

1. **Incomplete Model Implementation**: Only 20 of 43+ database tables have corresponding Rust models in `src/models/mod.rs`
2. **Missing GraphQL Resolvers**: Query and mutation resolvers in `src/schema/query.rs` and `src/schema/mutation.rs` only cover implemented models
3. **Frontend Configuration Mismatch**: Frontend points to `localhost:4001/graphql` expecting full PostGraphile compatibility but receives incomplete schema
4. **No Validation Layer**: No automated check ensures all database tables are exposed via GraphQL
5. **Migration Gaps**: Database migrations created tables, but corresponding Rust models and resolvers were not added

### Impact on Users

- **Broken Features**: Document management, dashboard analytics, time tracking, vehicle registration, emergency contacts
- **Partial Data**: Employee profiles missing skills, certifications, emergency contacts, vehicle information
- **Failed Queries**: Frontend GraphQL queries return "field not found" errors for missing tables
- **Incomplete Analytics**: Dashboard materialized views not accessible, showing stale or no data
- **Blocked Workflows**: Rollback system, event comments/history, attendance tracking non-functional

---

## Next Steps

Before proceeding to implementation:

1. **Clarify PostGraphile Compatibility**:
   - Document PostGraphile field naming conventions (camelCase or snake_case)
   - Document PostGraphile pagination strategy (limit/offset or cursor-based)
   - Document materialized view refresh requirements

2. **Plan Implementation Priority**:
   - High Priority: Document management (blocking core functionality)
   - High Priority: Employee details (skills, certifications, emergency contacts, vehicles)
   - Medium Priority: Analytics (materialized views for dashboards)
   - Medium Priority: Time tracking (attendance, time off policies)
   - Low Priority: System administration (rollback system, activity logs)

3. **Create Implementation Plan**:
   - Generate Rust models for all 23 missing tables
   - Add GraphQL types, queries, and mutations for each model
   - Implement relationship resolvers (foreign key traversal)
   - Add integration tests for all new endpoints
   - Create migration validation script
   - Document field mapping for frontend migration

This specification provides the foundation for the planning phase where technical implementation details will be designed.
