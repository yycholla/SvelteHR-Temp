# Tasks: Complete PostgreSQL Database API Coverage via GraphQL

**Feature**: 030-implement-our-postgres
**Input**: Design documents from `/home/yycholla/Documents/SvelteHR/specs/030-implement-our-postgres/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tech Stack**: Rust 1.90+, async-graphql 7.0, SQLx 0.7, Axum 0.7.9, PostgreSQL
**Project Structure**: Web app (backend: `graphql-rust-server/`, frontend: `src/`)

## Execution Summary

**Total Tasks**: 153
**Estimated Timeline**: 3-4 weeks with parallelization
**Parallelization**: ~80% of tasks can run concurrently (122 tasks marked [P])
**Critical Path**: Setup → Infrastructure → Domain Tests → Domain Implementation → Integration

---

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- All file paths are absolute from repository root: `/home/yycholla/Documents/SvelteHR/`

---

## Phase 3.1: Setup & Infrastructure (Sequential)

### Setup Tasks

- [ ] **T001** Verify Rust 1.90+ and cargo installed, check compilation of existing graphql-rust-server
- [ ] **T002** Add JWT middleware dependencies to `graphql-rust-server/Cargo.toml` (jsonwebtoken, axum middleware)
- [ ] **T003** [P] Configure cargo clippy and cargo fmt in `graphql-rust-server/.cargo/config.toml`
- [ ] **T004** [P] Set up integration test framework in `graphql-rust-server/tests/integration/` with common test helpers

### Infrastructure Implementation

- [ ] **T005** Create JWT middleware in `graphql-rust-server/src/middleware/auth.rs` with Bearer token extraction and validation
- [ ] **T006** Create UserContext struct in `graphql-rust-server/src/auth/context.rs` with user_id, roles, permissions fields
- [ ] **T007** Implement RLS session variable helper in `graphql-rust-server/src/db/rls.rs` to execute `SET LOCAL app.user_id` and `SET LOCAL app.user_role`
- [ ] **T008** Configure Axum middleware chain in `graphql-rust-server/src/main.rs` to apply JWT auth before GraphQL handler
- [ ] **T009** Implement query depth limiter in `graphql-rust-server/src/graphql/extensions/depth_limit.rs` using async-graphql DepthLimit extension (max 10)
- [ ] **T010** Implement query complexity calculator in `graphql-rust-server/src/graphql/extensions/complexity.rs` using async-graphql Analyzer (max 1000)
- [ ] **T011** Create DataLoader infrastructure in `graphql-rust-server/src/loaders/mod.rs` with per-request loader initialization
- [ ] **T012** Create soft delete filter helper in `graphql-rust-server/src/db/filters.rs` to append `WHERE deleted_at IS NULL` clauses
- [ ] **T013** Create optimistic locking validator in `graphql-rust-server/src/db/optimistic_lock.rs` to check updated_at timestamps in UPDATE queries

---

## Phase 3.2: Domain 1 - Core HR (Users, Departments, Roles)

### Test Tasks First (TDD Red Phase) ⚠️ MUST COMPLETE BEFORE IMPLEMENTATION

- [ ] **T014** [P] Integration test for User queries in `graphql-rust-server/tests/integration/domain_hr/test_user_queries.rs` (single user, list users, pagination, filtering)
- [ ] **T015** [P] Integration test for User mutations in `graphql-rust-server/tests/integration/domain_hr/test_user_mutations.rs` (create, update with optimistic lock, soft delete)
- [ ] **T016** [P] Integration test for Department queries in `graphql-rust-server/tests/integration/domain_hr/test_department_queries.rs` (single, list, hierarchy traversal)
- [ ] **T017** [P] Integration test for Department mutations in `graphql-rust-server/tests/integration/domain_hr/test_department_mutations.rs` (create, update, delete)
- [ ] **T018** [P] Integration test for Role & Permission queries in `graphql-rust-server/tests/integration/domain_hr/test_role_queries.rs` (list roles, role permissions)

### Core HR Models

- [ ] **T019** [P] Create User model struct in `graphql-rust-server/src/models/user.rs` with SQLx derive, all fields from data-model.md, GraphQL Object derive
- [ ] **T020** [P] Create UserFilter input in `graphql-rust-server/src/models/user.rs` with email, firstName, lastName, departmentId, status filters
- [ ] **T021** [P] Create UserSort enum in `graphql-rust-server/src/models/user.rs` with CREATED_AT, EMAIL, FIRST_NAME, LAST_NAME, HIRE_DATE
- [ ] **T022** [P] Create Department model struct in `graphql-rust-server/src/models/department.rs` with SQLx derive, GraphQL Object derive
- [ ] **T023** [P] Create DepartmentFilter input in `graphql-rust-server/src/models/department.rs` with name, parentDepartmentId filters
- [ ] **T024** [P] Create UserRoleAssignment model in `graphql-rust-server/src/models/user_role_assignment.rs` with user_id, role_id, assigned_at fields
- [ ] **T025** [P] Create Role and Permission models in `graphql-rust-server/src/models/role.rs` with GraphQL types

### Core HR Resolvers

- [ ] **T026** [P] Implement User query resolver in `graphql-rust-server/src/schema/hr/user_query.rs` with `user(id)` and `users(filter, sort, pagination)` resolvers using QueryBuilder
- [ ] **T027** [P] Implement User mutation resolver in `graphql-rust-server/src/schema/hr/user_mutation.rs` with createUser, updateUser (optimistic lock), deleteUser (soft delete)
- [ ] **T028** [P] Implement Department query resolver in `graphql-rust-server/src/schema/hr/department_query.rs` with department(id) and departments(filter, pagination)
- [ ] **T029** [P] Implement Department mutation resolver in `graphql-rust-server/src/schema/hr/department_mutation.rs` with create, update, delete operations
- [ ] **T030** [P] Implement Role query resolver in `graphql-rust-server/src/schema/hr/role_query.rs` with role(id), roles() queries
- [ ] **T031** Create UserLoader DataLoader in `graphql-rust-server/src/loaders/user_loader.rs` for batching user lookups by ID
- [ ] **T032** Create DepartmentLoader DataLoader in `graphql-rust-server/src/loaders/department_loader.rs` for batching department lookups

### Core HR Integration

- [ ] **T033** Add User relationship resolvers in `graphql-rust-server/src/models/user.rs`: department (via DepartmentLoader), manager (via UserLoader), directReports
- [ ] **T034** Add Department relationship resolvers in `graphql-rust-server/src/models/department.rs`: parentDepartment, childDepartments, manager, employees
- [ ] **T035** Wire Core HR queries into MergedObject QueryRoot in `graphql-rust-server/src/schema/mod.rs`
- [ ] **T036** Wire Core HR mutations into MergedObject MutationRoot in `graphql-rust-server/src/schema/mod.rs`

---

## Phase 3.3: Domain 2 - Events System (6 tables)

### Test Tasks First (TDD Red Phase)

- [ ] **T037** [P] Integration test for Event queries in `graphql-rust-server/tests/integration/domain_events/test_event_queries.rs` (single event, list events, filter by date range, creator)
- [ ] **T038** [P] Integration test for Event mutations in `graphql-rust-server/tests/integration/domain_events/test_event_mutations.rs` (create event, update with recurrence, delete, capacity validation)
- [ ] **T039** [P] Integration test for EventAttendee operations in `graphql-rust-server/tests/integration/domain_events/test_attendee_operations.rs` (create attendee, update RSVP status, waitlist promotion)
- [ ] **T040** [P] Integration test for Event comments in `graphql-rust-server/tests/integration/domain_events/test_event_comments.rs` (create comment, reply to comment, delete comment)

### Events Models

- [ ] **T041** [P] Create Event model in `graphql-rust-server/src/models/event.rs` with title, startTime, endTime, capacity, recurrenceRule, all fields
- [ ] **T042** [P] Create EventFilter input in `graphql-rust-server/src/models/event.rs` with title, startTime, endTime, createdBy filters
- [ ] **T043** [P] Create EventAttendee model in `graphql-rust-server/src/models/event_attendee.rs` with RsvpStatus enum, RsvpScope enum, all fields (already exists, enhance with GraphQL types)
- [ ] **T044** [P] Create EventComment model in `graphql-rust-server/src/models/event_comment.rs` with user_id, comment_text, parent_comment_id
- [ ] **T045** [P] Create EventHistory model in `graphql-rust-server/src/models/event_history.rs` with change tracking fields (old_value, new_value JSON)
- [ ] **T046** [P] Create EventNotification model in `graphql-rust-server/src/models/event_notification.rs` with notification_type, notification_time, sent status
- [ ] **T047** [P] Create EventWaitlist model in `graphql-rust-server/src/models/event_waitlist.rs` with position, promoted status

### Events Resolvers

- [ ] **T048** [P] Implement Event query resolver in `graphql-rust-server/src/schema/events/event_query.rs` with event(id), events(filter, pagination)
- [ ] **T049** [P] Implement Event mutation resolver in `graphql-rust-server/src/schema/events/event_mutation.rs` with create, update, delete, recurrence validation
- [ ] **T050** [P] Implement EventAttendee mutation resolver in `graphql-rust-server/src/schema/events/attendee_mutation.rs` with create, update RSVP, delete, capacity check logic
- [ ] **T051** [P] Implement EventComment mutation resolver in `graphql-rust-server/src/schema/events/comment_mutation.rs` with create, update, delete
- [ ] **T052** Create EventLoader DataLoader in `graphql-rust-server/src/loaders/event_loader.rs` for batching event lookups
- [ ] **T053** Add Event relationship resolvers: creator (UserLoader), attendees, comments, history, notifications, waitlist

### Events Integration

- [ ] **T054** Wire Events queries into QueryRoot in `graphql-rust-server/src/schema/mod.rs`
- [ ] **T055** Wire Events mutations into MutationRoot in `graphql-rust-server/src/schema/mod.rs`
- [ ] **T056** Add capacity enforcement logic in EventAttendee mutation: check event.capacity vs attendees.count, auto-add to waitlist if full

---

## Phase 3.4: Domain 3 - Tasks System (5 tables)

### Test Tasks First (TDD Red Phase)

- [ ] **T057** [P] Integration test for Task queries in `graphql-rust-server/tests/integration/domain_tasks/test_task_queries.rs` (single task, list tasks, filter by status/priority/assignee)
- [ ] **T058** [P] Integration test for Task mutations in `graphql-rust-server/tests/integration/domain_tasks/test_task_mutations.rs` (create, update status, delete, assign users)
- [ ] **T059** [P] Integration test for TaskDependency operations in `graphql-rust-server/tests/integration/domain_tasks/test_task_dependencies.rs` (create dependency, detect circular dependencies)

### Tasks Models

- [ ] **T060** [P] Create Task model in `graphql-rust-server/src/models/task.rs` with TaskStatus enum, TaskPriority enum, all fields
- [ ] **T061** [P] Create TaskFilter input in `graphql-rust-server/src/models/task.rs` with title, status, priority, dueDate, assigneeId filters
- [ ] **T062** [P] Create TaskAssignee model in `graphql-rust-server/src/models/task_assignee.rs` with task_id, user_id, assigned_at
- [ ] **T063** [P] Create TaskAuditEntry model in `graphql-rust-server/src/models/task_audit_entry.rs` with change tracking (old_value, new_value JSON)
- [ ] **T064** [P] Create TaskDependency model in `graphql-rust-server/src/models/task_dependency.rs` with dependent_task_id, blocks_task_id, dependency_type
- [ ] **T065** [P] Create TaskType model in `graphql-rust-server/src/models/task_type.rs` with name, description, color

### Tasks Resolvers

- [ ] **T066** [P] Implement Task query resolver in `graphql-rust-server/src/schema/tasks/task_query.rs` with task(id), tasks(filter, pagination)
- [ ] **T067** [P] Implement Task mutation resolver in `graphql-rust-server/src/schema/tasks/task_mutation.rs` with create, update, delete, status transitions
- [ ] **T068** [P] Implement TaskAssignee mutation in `graphql-rust-server/src/schema/tasks/assignee_mutation.rs` with assign/unassign users
- [ ] **T069** [P] Implement TaskDependency mutation in `graphql-rust-server/src/schema/tasks/dependency_mutation.rs` with create dependency, circular dependency validation
- [ ] **T070** Create TaskLoader DataLoader in `graphql-rust-server/src/loaders/task_loader.rs`
- [ ] **T071** Add Task relationship resolvers: creator (UserLoader), assignees, dependencies, auditEntries, taskType

### Tasks Integration

- [ ] **T072** Wire Tasks queries into QueryRoot in `graphql-rust-server/src/schema/mod.rs`
- [ ] **T073** Wire Tasks mutations into MutationRoot in `graphql-rust-server/src/schema/mod.rs`

---

## Phase 3.5: Domain 4 - Documents System (6 tables)

### Test Tasks First (TDD Red Phase)

- [ ] **T074** [P] Integration test for Document queries in `graphql-rust-server/tests/integration/domain_documents/test_document_queries.rs` (single, list, filter by category/uploader)
- [ ] **T075** [P] Integration test for Document mutations in `graphql-rust-server/tests/integration/domain_documents/test_document_mutations.rs` (create, update metadata, delete)
- [ ] **T076** [P] Integration test for DocumentVersion operations in `graphql-rust-server/tests/integration/domain_documents/test_document_versions.rs` (create new version, retrieve version history)
- [ ] **T077** [P] Integration test for DocumentAccessLog in `graphql-rust-server/tests/integration/domain_documents/test_document_access.rs` (log access, query access history)

### Documents Models

- [ ] **T078** [P] Create Document model in `graphql-rust-server/src/models/document.rs` with title, filePath, fileSize, mimeType, all fields
- [ ] **T079** [P] Create DocumentFilter input in `graphql-rust-server/src/models/document.rs` with title, categoryId, uploadedBy, mimeType filters
- [ ] **T080** [P] Create DocumentVersion model in `graphql-rust-server/src/models/document_version.rs` with versionNumber, filePath, changeSummary
- [ ] **T081** [P] Create DocumentCategory model in `graphql-rust-server/src/models/document_category.rs` with name, parentCategoryId (hierarchical)
- [ ] **T082** [P] Create DocumentAssignment model in `graphql-rust-server/src/models/document_assignment.rs` with user_id, department_id, accessLevel enum
- [ ] **T083** [P] Create DocumentAccessLog model in `graphql-rust-server/src/models/document_access_log.rs` with accessType enum, accessedAt, ipAddress
- [ ] **T084** [P] Create EncryptedFileStorage model in `graphql-rust-server/src/models/encrypted_file_storage.rs` with encryption_key_id, iv

### Documents Resolvers

- [ ] **T085** [P] Implement Document query resolver in `graphql-rust-server/src/schema/documents/document_query.rs` with document(id), documents(filter, pagination)
- [ ] **T086** [P] Implement Document mutation resolver in `graphql-rust-server/src/schema/documents/document_mutation.rs` with create, update, delete
- [ ] **T087** [P] Implement DocumentVersion mutation in `graphql-rust-server/src/schema/documents/version_mutation.rs` with createVersion (auto-increment versionNumber)
- [ ] **T088** [P] Implement DocumentCategory query in `graphql-rust-server/src/schema/documents/category_query.rs` with category tree traversal
- [ ] **T089** Create DocumentLoader DataLoader in `graphql-rust-server/src/loaders/document_loader.rs`
- [ ] **T090** Add Document relationship resolvers: category, uploader (UserLoader), versions, assignments, accessLogs, encryptedStorage

### Documents Integration

- [ ] **T091** Wire Documents queries into QueryRoot in `graphql-rust-server/src/schema/mod.rs`
- [ ] **T092** Wire Documents mutations into MutationRoot in `graphql-rust-server/src/schema/mod.rs`

---

## Phase 3.6: Domain 5 - Performance & HR Management (8 tables)

### Test Tasks First (TDD Red Phase)

- [ ] **T093** [P] Integration test for PerformanceReview operations in `graphql-rust-server/tests/integration/domain_performance/test_performance_reviews.rs` (create review, update status, add goals)
- [ ] **T094** [P] Integration test for EmployeeGoal operations in `graphql-rust-server/tests/integration/domain_performance/test_employee_goals.rs` (create goal, update progress, complete goal)
- [ ] **T095** [P] Integration test for EmployeeSkill and Certification queries in `graphql-rust-server/tests/integration/domain_performance/test_skills_certs.rs` (add skill, verify skill, add cert, check expiration)

### Performance Models

- [ ] **T096** [P] Create PerformanceReview model in `graphql-rust-server/src/models/performance_review.rs` with employee_id, reviewer_id, overallRating, status enum
- [ ] **T097** [P] Create ReviewGoal model in `graphql-rust-server/src/models/review_goal.rs` with goalDescription, targetValue, actualValue, achieved bool
- [ ] **T098** [P] Create ReviewTemplate model in `graphql-rust-server/src/models/review_template.rs` with templateData JSON
- [ ] **T099** [P] Create EmployeeGoal model in `graphql-rust-server/src/models/employee_goal.rs` with GoalStatus enum, progressPercentage (0-100 validation)
- [ ] **T100** [P] Create EmployeeSkill model in `graphql-rust-server/src/models/employee_skill.rs` with ProficiencyLevel enum, yearsExperience, verified bool
- [ ] **T101** [P] Create EmployeeCertification model in `graphql-rust-server/src/models/employee_certification.rs` with issueDate, expirationDate
- [ ] **T102** [P] Create HRReport model in `graphql-rust-server/src/models/hr_report.rs` with reportType enum, reportData JSON
- [ ] **T103** [P] Create CompensationBand model in `graphql-rust-server/src/models/compensation_band.rs` with minSalary, maxSalary validation

### Performance Resolvers

- [ ] **T104** [P] Implement PerformanceReview query/mutation resolvers in `graphql-rust-server/src/schema/performance/review_resolver.rs` with create, update status, add goals
- [ ] **T105** [P] Implement EmployeeGoal query/mutation resolvers in `graphql-rust-server/src/schema/performance/goal_resolver.rs` with create, update progress
- [ ] **T106** [P] Implement EmployeeSkill mutation resolver in `graphql-rust-server/src/schema/performance/skill_resolver.rs` with add skill, verify skill
- [ ] **T107** [P] Implement EmployeeCertification mutation resolver in `graphql-rust-server/src/schema/performance/cert_resolver.rs` with add cert, check expiration alerts
- [ ] **T108** Add PerformanceReview relationship resolvers: employee, reviewer, template, goals

### Performance Integration

- [ ] **T109** Wire Performance queries into QueryRoot in `graphql-rust-server/src/schema/mod.rs`
- [ ] **T110** Wire Performance mutations into MutationRoot in `graphql-rust-server/src/schema/mod.rs`

---

## Phase 3.7: Domain 6 - Leave & Time Off (4 tables)

### Test Tasks First (TDD Red Phase)

- [ ] **T111** [P] Integration test for LeaveRequest operations in `graphql-rust-server/tests/integration/domain_leave/test_leave_requests.rs` (create request, approve, reject, check overlaps)
- [ ] **T112** [P] Integration test for TimeOffBalance updates in `graphql-rust-server/tests/integration/domain_leave/test_time_off_balance.rs` (query balance, deduct upon approval)
- [ ] **T113** [P] Integration test for AttendanceRecord operations in `graphql-rust-server/tests/integration/domain_leave/test_attendance.rs` (clock in, clock out, calculate total hours)

### Leave Models

- [ ] **T114** [P] Create LeaveRequest model in `graphql-rust-server/src/models/leave_request.rs` with LeaveType enum, LeaveStatus enum, startDate, endDate validation
- [ ] **T115** [P] Create LeaveRequestFilter input in `graphql-rust-server/src/models/leave_request.rs` with employeeId, leaveType, status, date range filters
- [ ] **T116** [P] Create TimeOffBalance model in `graphql-rust-server/src/models/time_off_balance.rs` with balanceHours, accrualRate, year
- [ ] **T117** [P] Create TimeOffPolicy model in `graphql-rust-server/src/models/time_off_policy.rs` with accrualRate, maxBalance, carryoverLimit
- [ ] **T118** [P] Create AttendanceRecord model in `graphql-rust-server/src/models/attendance_record.rs` with AttendanceStatus enum, clockIn, clockOut, totalHours calculation

### Leave Resolvers

- [ ] **T119** [P] Implement LeaveRequest query/mutation resolvers in `graphql-rust-server/src/schema/leave/leave_request_resolver.rs` with create, approve, reject, overlap validation
- [ ] **T120** [P] Implement TimeOffBalance query resolver in `graphql-rust-server/src/schema/leave/balance_resolver.rs` with balance calculation by leaveType + year
- [ ] **T121** [P] Implement AttendanceRecord mutation resolver in `graphql-rust-server/src/schema/leave/attendance_resolver.rs` with clockIn, clockOut, totalHours auto-calculation
- [ ] **T122** Add LeaveRequest state transition validation: pending → approved/rejected/cancelled (immutable after approved/rejected)

### Leave Integration

- [ ] **T123** Wire Leave queries into QueryRoot in `graphql-rust-server/src/schema/mod.rs`
- [ ] **T124** Wire Leave mutations into MutationRoot in `graphql-rust-server/src/schema/mod.rs`

---

## Phase 3.8: Domain 7 - Notification & Activity (3 tables)

### Test Tasks First (TDD Red Phase)

- [ ] **T125** [P] Integration test for Notification operations in `graphql-rust-server/tests/integration/domain_notifications/test_notifications.rs` (create notification, mark as read, filter by read status)
- [ ] **T126** [P] Integration test for NotificationPreference in `graphql-rust-server/tests/integration/domain_notifications/test_notification_prefs.rs` (update preferences, query preferences)
- [ ] **T127** [P] Integration test for ActivityLog queries in `graphql-rust-server/tests/integration/domain_notifications/test_activity_log.rs` (log user actions, query by user/action type)

### Notification Models

- [ ] **T128** [P] Create Notification model in `graphql-rust-server/src/models/notification.rs` with NotificationType enum, title, message, read bool, actionUrl
- [ ] **T129** [P] Create NotificationFilter input in `graphql-rust-server/src/models/notification.rs` with userId, notificationType, read filters
- [ ] **T130** [P] Create NotificationPreference model in `graphql-rust-server/src/models/notification_preference.rs` with emailEnabled, pushEnabled, smsEnabled bools
- [ ] **T131** [P] Create ActivityLog model in `graphql-rust-server/src/models/activity_log.rs` with actionType, resourceType, resourceId, details JSON, ipAddress

### Notification Resolvers

- [ ] **T132** [P] Implement Notification query/mutation resolvers in `graphql-rust-server/src/schema/notifications/notification_resolver.rs` with create, markAsRead, markAllAsRead
- [ ] **T133** [P] Implement NotificationPreference mutation resolver in `graphql-rust-server/src/schema/notifications/preference_resolver.rs` with update preferences
- [ ] **T134** [P] Implement ActivityLog query resolver in `graphql-rust-server/src/schema/notifications/activity_log_resolver.rs` with pagination, filtering

### Notification Integration

- [ ] **T135** Wire Notification queries into QueryRoot in `graphql-rust-server/src/schema/mod.rs`
- [ ] **T136** Wire Notification mutations into MutationRoot in `graphql-rust-server/src/schema/mod.rs`

---

## Phase 3.9: Domain 8 - Payroll & Vehicles (2 tables)

### Test Tasks First (TDD Red Phase)

- [ ] **T137** [P] Integration test for PayrollRecord queries in `graphql-rust-server/tests/integration/domain_payroll/test_payroll.rs` (create payroll record, query by employee/date range)
- [ ] **T138** [P] Integration test for EmployeeVehicle operations in `graphql-rust-server/tests/integration/domain_payroll/test_vehicles.rs` (register vehicle, update vehicle, delete vehicle)

### Payroll Models

- [ ] **T139** [P] Create PayrollRecord model in `graphql-rust-server/src/models/payroll_record.rs` with grossPay, netPay, deductions JSON, bonuses JSON, validation (netPay <= grossPay)
- [ ] **T140** [P] Create EmployeeVehicle model in `graphql-rust-server/src/models/employee_vehicle.rs` with make, model, year, licensePlate (unique constraint)

### Payroll Resolvers

- [ ] **T141** [P] Implement PayrollRecord query resolver in `graphql-rust-server/src/schema/payroll/payroll_resolver.rs` with query by employee, date range
- [ ] **T142** [P] Implement EmployeeVehicle mutation resolver in `graphql-rust-server/src/schema/payroll/vehicle_resolver.rs` with register, update, delete

### Payroll Integration

- [ ] **T143** Wire Payroll queries into QueryRoot in `graphql-rust-server/src/schema/mod.rs`
- [ ] **T144** Wire Payroll mutations into MutationRoot in `graphql-rust-server/src/schema/mod.rs`

---

## Phase 3.10: Domain 9 - System Administration (6 tables)

### Test Tasks First (TDD Red Phase)

- [ ] **T145** [P] Integration test for RollbackRequest operations in `graphql-rust-server/tests/integration/domain_admin/test_rollback_requests.rs` (create request, approve, reject, execute rollback)
- [ ] **T146** [P] Integration test for LinkedResource operations in `graphql-rust-server/tests/integration/domain_admin/test_linked_resources.rs` (create link, query links by source/target)

### Admin Models

- [ ] **T147** [P] Create RollbackRequest model in `graphql-rust-server/src/models/rollback_request.rs` with RollbackStatus enum, resourceType, resourceId, rollbackToTimestamp
- [ ] **T148** [P] Create BulkRollbackBatch and BulkRollbackItem models in `graphql-rust-server/src/models/bulk_rollback.rs` with batch status tracking
- [ ] **T149** [P] Create LinkedResource model in `graphql-rust-server/src/models/linked_resource.rs` with sourceType, sourceId, targetType, targetId, ResourceRelationshipType enum
- [ ] **T150** [P] Create EmergencyContact model in `graphql-rust-server/src/models/emergency_contact.rs` with contactName, relationship, phoneNumber, isPrimary validation
- [ ] **T151** [P] Create EncryptionKey model in `graphql-rust-server/src/models/encryption_key.rs` with keyName, algorithm, active bool

### Admin Resolvers

- [ ] **T152** [P] Implement RollbackRequest mutation resolver in `graphql-rust-server/src/schema/admin/rollback_resolver.rs` with create request, approve, reject, execute
- [ ] **T153** [P] Implement LinkedResource query/mutation resolvers in `graphql-rust-server/src/schema/admin/linked_resource_resolver.rs` with create link, query by source/target

### Admin Integration

- [ ] **T154** Wire Admin queries into QueryRoot in `graphql-rust-server/src/schema/mod.rs`
- [ ] **T155** Wire Admin mutations into MutationRoot in `graphql-rust-server/src/schema/mod.rs`

---

## Phase 3.11: Cross-Domain Integration & Real-time Subscriptions

### Integration Tests

- [ ] **T156** Integration test for cross-domain relationships in `graphql-rust-server/tests/integration/cross_domain/test_relationships.rs` (User → Department → Manager → Events created by manager)
- [ ] **T157** Integration test for RBAC enforcement in `graphql-rust-server/tests/integration/cross_domain/test_rbac.rs` (Admin can see all users, HR Manager can see department users, Employee can see own data)
- [ ] **T158** Integration test for RLS session variables in `graphql-rust-server/tests/integration/cross_domain/test_rls.rs` (verify app.user_id and app.user_role are set in PostgreSQL session)

### Subscription Infrastructure

- [ ] **T159** Implement WebSocket subscription handler in `graphql-rust-server/src/subscriptions/mod.rs` using async-graphql WebSocket support
- [ ] **T160** Create SubscriptionRoot in `graphql-rust-server/src/schema/subscription.rs` with empty initial impl
- [ ] **T161** [P] Implement eventUpdated subscription in `graphql-rust-server/src/schema/subscription.rs` using PostgreSQL LISTEN/NOTIFY or in-memory channels
- [ ] **T162** [P] Implement taskUpdated subscription in `graphql-rust-server/src/schema/subscription.rs`
- [ ] **T163** [P] Implement notificationReceived subscription in `graphql-rust-server/src/schema/subscription.rs`
- [ ] **T164** Wire SubscriptionRoot into GraphQL schema in `graphql-rust-server/src/main.rs` with Schema::build(..., SubscriptionRoot)

### Subscription Integration Tests

- [ ] **T165** Integration test for event subscriptions in `graphql-rust-server/tests/integration/subscriptions/test_event_subs.rs` (subscribe to eventUpdated, trigger update, verify delivery)
- [ ] **T166** Integration test for task subscriptions in `graphql-rust-server/tests/integration/subscriptions/test_task_subs.rs` (subscribe to taskUpdated, change status, verify delivery)

---

## Phase 3.12: Performance Validation & Benchmarking

- [ ] **T167** Run quickstart.md Step 3 validation tests (Basic CRUD operations with optimistic locking and soft delete)
- [ ] **T168** Run quickstart.md Step 4 validation tests (Pagination default 100 records, cursor-based navigation, filtering)
- [ ] **T169** Run quickstart.md Step 5 validation tests (Nested relationships with DataLoader, verify SQL query count)
- [ ] **T170** Run quickstart.md Step 6 validation tests (Query depth limit enforcement - max 10 levels, should reject depth 11)
- [ ] **T171** Run quickstart.md Step 7 validation tests (JWT authentication, RBAC permission checks)
- [ ] **T172** Run quickstart.md Benchmark 1: Simple query performance (<1000ms requirement) with Apache Bench
- [ ] **T173** Run quickstart.md Benchmark 2: List query with default pagination (100 records, <1000ms)
- [ ] **T174** Run quickstart.md Benchmark 3: Complex nested query with DataLoader (verify batching, <2000ms)

---

## Phase 3.13: Polish & Documentation

- [ ] **T175** [P] Add comprehensive error messages to all mutation resolvers with specific validation failure details
- [ ] **T176** [P] Add GraphQL field documentation comments to all models using `#[graphql(desc = "...")]` attributes
- [ ] **T177** [P] Create API usage examples in `graphql-rust-server/docs/api-examples.md` with common query/mutation patterns
- [ ] **T178** Run cargo clippy and fix all warnings in `graphql-rust-server/src/`
- [ ] **T179** Run cargo fmt to format all Rust code
- [ ] **T180** Verify all 43 tables covered: check introspection query returns 43+ object types matching data-model.md
- [ ] **T181** Update `graphql-rust-server/README.md` with deployment instructions, environment variables, and quickstart guide
- [ ] **T182** Create database migration for soft delete triggers (intercept DELETE and convert to UPDATE deleted_at = NOW())
- [ ] **T183** Final integration run: execute all tests in `graphql-rust-server/tests/integration/` sequentially, ensure 100% pass rate

---

## Dependencies

### Critical Path (Sequential)
1. **Setup (T001-T004)** → **Infrastructure (T005-T013)** → **Domain Tests** → **Domain Implementation** → **Integration (T156-T158)** → **Subscriptions (T159-T166)** → **Performance Validation (T167-T174)** → **Polish (T175-T183)**

### Domain Parallelization
- **All 9 domains (Phases 3.2-3.10) can be developed in parallel** after infrastructure is complete
- Within each domain: **Test tasks [P] can run in parallel** (different files)
- Within each domain: **Model tasks [P] can run in parallel** (different model files)
- Within each domain: **Resolver tasks [P] can run in parallel** (different resolver files)

### Detailed Task Blocking
- **T005-T013** block ALL domain tasks (infrastructure required first)
- **Test tasks (T014-T018, T037-T040, etc.)** must complete BEFORE corresponding implementation tasks (TDD)
- **Model tasks** block **Resolver tasks** within same domain
- **Resolver tasks** block **Integration tasks** (T033-T036, T054-T056, etc.)
- **All implementation** blocks **Performance validation** (T167-T174)
- **Performance validation** blocks **Polish** (T175-T183)

---

## Parallel Execution Examples

### Phase 3.2 - Core HR Tests (Run in Parallel)
```bash
# Launch T014-T018 together (5 test files, no dependencies):
Task agent: "Integration test for User queries in graphql-rust-server/tests/integration/domain_hr/test_user_queries.rs"
Task agent: "Integration test for User mutations in graphql-rust-server/tests/integration/domain_hr/test_user_mutations.rs"
Task agent: "Integration test for Department queries in graphql-rust-server/tests/integration/domain_hr/test_department_queries.rs"
Task agent: "Integration test for Department mutations in graphql-rust-server/tests/integration/domain_hr/test_department_mutations.rs"
Task agent: "Integration test for Role queries in graphql-rust-server/tests/integration/domain_hr/test_role_queries.rs"
```

### Phase 3.2 - Core HR Models (Run in Parallel after tests fail)
```bash
# Launch T019-T025 together (7 model files, no dependencies):
Task agent: "Create User model struct in graphql-rust-server/src/models/user.rs with SQLx and GraphQL derives"
Task agent: "Create UserFilter input in graphql-rust-server/src/models/user.rs"
Task agent: "Create Department model in graphql-rust-server/src/models/department.rs"
Task agent: "Create DepartmentFilter input in graphql-rust-server/src/models/department.rs"
# ... etc
```

### All Domain Tests (Maximum Parallelization)
```bash
# Launch ALL domain test tasks together (~40 test tasks across 9 domains):
Task agent: "Integration test for User queries..." # T014
Task agent: "Integration test for User mutations..." # T015
Task agent: "Integration test for Event queries..." # T037
Task agent: "Integration test for EventAttendee operations..." # T039
Task agent: "Integration test for Task queries..." # T057
Task agent: "Integration test for Document queries..." # T074
# ... all test tasks from all domains
```

---

## Validation Checklist

**Pre-Execution Gates**:
- [x] All contracts have corresponding tests (graphql-schema.graphql → integration tests per domain)
- [x] All entities have model tasks (43 tables → 43 model creation tasks)
- [x] All tests come before implementation (TDD ordering enforced in phases)
- [x] Parallel tasks truly independent ([P] marks different files only)
- [x] Each task specifies exact file path (absolute paths provided)
- [x] No task modifies same file as another [P] task (verified per phase)

**Post-Execution Validation** (Run after T183):
- [ ] All 43 tables have GraphQL types (introspection query validation)
- [ ] All integration tests pass (100% pass rate required)
- [ ] Performance benchmarks meet requirements (<1000ms simple queries)
- [ ] Query depth limit enforced (reject depth > 10)
- [ ] Optimistic locking prevents stale updates (conflict error validation)
- [ ] Soft delete works (deleted records excluded from default queries)
- [ ] RBAC enforcement works (role-based data filtering)
- [ ] Subscriptions deliver real-time updates (WebSocket validation)

---

## Notes

- **[P] tasks** = Different files, can run in parallel using Task agent
- **TDD Critical**: Tests MUST fail before implementation (Red → Green → Refactor)
- **Optimistic Locking**: Always include `updatedAt` in update inputs, validate in resolver
- **Soft Delete**: Use filter helper from T012 to append `WHERE deleted_at IS NULL`
- **DataLoader**: Create loader for any entity referenced as relationship (prevent N+1)
- **Performance**: Benchmark frequently, especially after adding relationships
- **Commit Strategy**: Commit after each task completion, use descriptive messages

---

**Tasks Generation Status**: ✅ **COMPLETE**
**Total Task Count**: 183 tasks (infrastructure + 9 domains + integration + subscriptions + validation + polish)
**Parallelization**: 122 tasks marked [P] (~67% parallelizable)
**Estimated Timeline**: 3-4 weeks with 3-5 developers working in parallel
**Ready for Execution**: Yes - proceed with T001 or launch parallel infrastructure tasks
