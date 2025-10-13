# Tasks: Rust GraphQL API Complete Database Coverage

**Input**: Design documents from `/home/yycholla/Documents/SvelteHR/specs/031-we-have-recently/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/graphql-schema-extensions.graphql, quickstart.md

## Execution Summary

**Total Tasks**: 48 tasks across 5 phases
**Parallel Tasks**: 40 tasks can run in parallel (marked [P])
**Domains**: 8 domain modules (Employee, Documents, Time, Analytics, System, Events, Tasks, Reviews)
**Models**: 23 new Rust models + DataLoaders + GraphQL resolvers
**Test Coverage**: 8 contract tests + 10 integration tests

## Phase 3.1: Setup (3 tasks)

- [ ] **T001** Create domain module structure in `graphql-rust-server/src/models/`
  - Create directories: `employee/`, `documents/`, `time/`, `analytics/`, `system/`, `events_ext/`, `tasks_ext/`, `reviews_ext/`
  - Update `graphql-rust-server/src/models/mod.rs` to declare new modules
  - No implementation yet - just module structure

- [ ] **T002** Create schema domain structure in `graphql-rust-server/src/schema/domains/`
  - Create files: `employee.rs`, `documents.rs`, `time.rs`, `analytics.rs`, `system.rs`, `events_ext.rs`, `tasks_ext.rs`, `reviews_ext.rs`
  - Each file has empty `Query` and `Mutation` structs
  - Update `graphql-rust-server/src/schema/mod.rs` to declare domains module

- [ ] **T003** [P] Configure Rust test infrastructure in `graphql-rust-server/tests/`
  - Create `contract/` directory for GraphQL schema tests
  - Create `integration/` directory for end-to-end tests
  - Add test helpers in `tests/common/mod.rs` for database setup and GraphQL client

---

## Phase 3.2: Contract Tests (TDD RED Phase) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [ ] **T004** [P] Contract test for Employee Management domain in `graphql-rust-server/tests/contract/employee_schema_test.rs`
  - Test `EmployeeSkill`, `EmployeeCertification`, `EmployeeVehicle`, `EmergencyContact`, `EmployeeGoal` types exist
  - Validate field names are camelCase (`employeeId`, `skillName`, `proficiencyLevel`)
  - Verify enums (`ProficiencyLevel`, `GoalStatus`) match schema
  - Test will FAIL (types don't exist yet)

- [ ] **T005** [P] Contract test for Document Management domain in `graphql-rust-server/tests/contract/documents_schema_test.rs`
  - Test `Document`, `DocumentVersion`, `DocumentCategory`, `DocumentAssignment`, `DocumentAccessLog`, `EncryptedFileStorage` types
  - Validate `DocumentConnection` implements Relay pagination (edges, pageInfo, totalCount)
  - Verify relationships (`document.category`, `document.uploader`, `document.versions`)
  - Test will FAIL

- [ ] **T006** [P] Contract test for Time Management domain in `graphql-rust-server/tests/contract/time_schema_test.rs`
  - Test `TimeOffPolicy`, `AttendanceRecord` types
  - Validate `AttendanceStatus` enum values
  - Test will FAIL

- [ ] **T007** [P] Contract test for Analytics domain (materialized views) in `graphql-rust-server/tests/contract/analytics_schema_test.rs`
  - Test `DashboardSummary`, `DepartmentMetric`, `GoalStatistic`, `ReportAnalytic` types
  - Validate read-only (no mutations)
  - Verify `lastRefreshedAt` field exists on all view types
  - Test refresh mutations (`refreshDashboardSummaries`, etc.)
  - Test will FAIL

- [ ] **T008** [P] Contract test for System Administration domain in `graphql-rust-server/tests/contract/system_schema_test.rs`
  - Test `RollbackRequest`, `BulkRollbackBatch`, `BulkRollbackItem`, `ActivityLog`, `HRReport`, `CompensationBand`, `PayrollRecord` types
  - Validate `RollbackStatus` enum
  - Test will FAIL

- [ ] **T009** [P] Contract test for Event Extensions domain in `graphql-rust-server/tests/contract/events_ext_schema_test.rs`
  - Test `EventComment`, `EventHistory`, `EventWaitlist` types
  - Verify nested replies on `EventComment`
  - Test will FAIL

- [ ] **T010** [P] Contract test for Task Extensions domain in `graphql-rust-server/tests/contract/tasks_ext_schema_test.rs`
  - Test `TaskType` type
  - Verify relationship to `Task`
  - Test will FAIL

- [ ] **T011** [P] Contract test for Review Extensions domain in `graphql-rust-server/tests/contract/reviews_ext_schema_test.rs`
  - Test `ReviewTemplate` type
  - Verify relationship to `PerformanceReview`
  - Test will FAIL

---

## Phase 3.3: Model Implementation (8 tasks)

- [ ] **T012** [P] Implement Employee Management models in `graphql-rust-server/src/models/employee/mod.rs`
  - Structs: `EmployeeSkill`, `EmployeeCertification`, `EmployeeVehicle`, `EmergencyContact`, `EmployeeGoal`
  - Enums: `ProficiencyLevel`, `GoalStatus`
  - All fields with `#[graphql(name = "camelCase")]` attributes
  - SQLx `FromRow` derives
  - Export in `graphql-rust-server/src/models/mod.rs`

- [ ] **T013** [P] Implement Document Management models in `graphql-rust-server/src/models/documents/mod.rs`
  - Structs: `Document`, `DocumentVersion`, `DocumentCategory`, `DocumentAssignment`, `DocumentAccessLog`, `EncryptedFileStorage`, `EncryptionKey`
  - Enums: `DocumentAccessLevel`, `DocumentAccessType`
  - Soft delete support on `Document` (check `deleted_at`)
  - Export in `graphql-rust-server/src/models/mod.rs`

- [ ] **T014** [P] Implement Time Management models in `graphql-rust-server/src/models/time/mod.rs`
  - Structs: `TimeOffPolicy`, `AttendanceRecord`
  - Enum: `AttendanceStatus`
  - Export in `graphql-rust-server/src/models/mod.rs`

- [ ] **T015** [P] Implement Analytics models (materialized views) in `graphql-rust-server/src/models/analytics/mod.rs`
  - Structs: `DashboardSummary`, `DepartmentMetric`, `GoalStatistic`, `ReportAnalytic`
  - All structs have `last_refreshed_at` field
  - Mark as read-only (no Input types needed)
  - Export in `graphql-rust-server/src/models/mod.rs`

- [ ] **T016** [P] Implement System Administration models in `graphql-rust-server/src/models/system/mod.rs`
  - Structs: `RollbackRequest`, `BulkRollbackBatch`, `BulkRollbackItem`, `ActivityLog`, `HRReport`, `CompensationBand`, `PayrollRecord`
  - Enum: `RollbackStatus`
  - Export in `graphql-rust-server/src/models/mod.rs`

- [ ] **T017** [P] Implement Event Extensions models in `graphql-rust-server/src/models/events_ext/mod.rs`
  - Structs: `EventComment`, `EventHistory`, `EventWaitlist`
  - Self-referential relationship on `EventComment` (parent_comment_id)
  - Export in `graphql-rust-server/src/models/mod.rs`

- [ ] **T018** [P] Implement Task Extensions models in `graphql-rust-server/src/models/tasks_ext/mod.rs`
  - Struct: `TaskType`
  - Export in `graphql-rust-server/src/models/mod.rs`

- [ ] **T019** [P] Implement Review Extensions models in `graphql-rust-server/src/models/reviews_ext/mod.rs`
  - Struct: `ReviewTemplate`
  - JSON field for `template_data`
  - Export in `graphql-rust-server/src/models/mod.rs`

---

## Phase 3.4: DataLoader Implementation (8 tasks)

- [ ] **T020** [P] Create Employee DataLoaders in `graphql-rust-server/src/loaders/employee.rs`
  - `EmployeeSkillLoader`: batch load skills by employee_id
  - `EmployeeCertificationLoader`: batch load certifications by employee_id
  - `EmployeeVehicleLoader`: batch load vehicles by employee_id
  - `EmergencyContactLoader`: batch load contacts by employee_id
  - `EmployeeGoalLoader`: batch load goals by employee_id
  - Register loaders in DataLoader context

- [ ] **T021** [P] Create Document DataLoaders in `graphql-rust-server/src/loaders/documents.rs`
  - `DocumentVersionLoader`: batch load versions by document_id
  - `DocumentAssignmentLoader`: batch load assignments by document_id
  - `DocumentAccessLogLoader`: batch load access logs by document_id
  - `DocumentCategoryLoader`: single record by category_id
  - Register loaders in DataLoader context

- [ ] **T022** [P] Create Time DataLoaders in `graphql-rust-server/src/loaders/time.rs`
  - `AttendanceRecordLoader`: batch load records by employee_id and date range
  - Register loaders in DataLoader context

- [ ] **T023** [P] Create Analytics DataLoaders in `graphql-rust-server/src/loaders/analytics.rs`
  - `DepartmentMetricLoader`: single record by department_id
  - `GoalStatisticLoader`: batch load by user_id and quarter
  - `ReportAnalyticLoader`: batch load by department_id and month range
  - Register loaders in DataLoader context

- [ ] **T024** [P] Create System DataLoaders in `graphql-rust-server/src/loaders/system.rs`
  - `BulkRollbackItemLoader`: batch load by batch_id
  - `ActivityLogLoader`: batch load by user_id
  - Register loaders in DataLoader context

- [ ] **T025** [P] Create Event Extensions DataLoaders in `graphql-rust-server/src/loaders/events_ext.rs`
  - `EventCommentLoader`: batch load by event_id
  - `EventCommentReplyLoader`: batch load replies by parent_comment_id
  - `EventHistoryLoader`: batch load by event_id
  - `EventWaitlistLoader`: batch load by event_id
  - Register loaders in DataLoader context

- [ ] **T026** [P] Create Task Extensions DataLoaders in `graphql-rust-server/src/loaders/tasks_ext.rs`
  - `TaskTypeLoader`: single record by task_type_id
  - Register loaders in DataLoader context

- [ ] **T027** [P] Create Review Extensions DataLoaders in `graphql-rust-server/src/loaders/reviews_ext.rs`
  - `ReviewTemplateLoader`: single record by template_id
  - Register loaders in DataLoader context

---

## Phase 3.5: Query Resolver Implementation (8 tasks)

- [ ] **T028** [P] Implement Employee queries in `graphql-rust-server/src/schema/domains/employee.rs`
  - Queries: `employeeSkill(id)`, `employeeSkills(filter, first, after)` with Connection
  - Queries: `employeeCertification(id)`, `employeeCertifications(filter, first, after)`
  - Queries: `employeeVehicle(id)`, `employeeVehicles(employeeId)`
  - Queries: `emergencyContact(id)`, `emergencyContacts(employeeId)`
  - Queries: `employeeGoal(id)`, `employeeGoals(employeeId)`
  - Use DataLoaders for relationships
  - Soft delete filtering

- [ ] **T029** [P] Implement Document queries in `graphql-rust-server/src/schema/domains/documents.rs`
  - Queries: `document(id)`, `documents(filter, first, after)` with Connection
  - Queries: `documentCategory(id)`, `documentCategories()`
  - Relationship resolvers using DataLoaders
  - Soft delete filtering on documents

- [ ] **T030** [P] Implement Time queries in `graphql-rust-server/src/schema/domains/time.rs`
  - Queries: `timeOffPolicy(id)`, `timeOffPolicies()`
  - Queries: `attendanceRecord(id)`, `attendanceRecords(employeeId, startDate, endDate)`
  - Date range filtering

- [ ] **T031** [P] Implement Analytics queries in `graphql-rust-server/src/schema/domains/analytics.rs`
  - Queries: `dashboardSummaries()` (single record, summaryKey="global")
  - Queries: `departmentMetrics(filter, first, after)` with Connection
  - Queries: `goalStatistics(userId, quarter, year)`
  - Queries: `reportAnalytics(departmentId, startMonth, endMonth)`
  - Read-only (no mutations in this file)

- [ ] **T032** [P] Implement System queries in `graphql-rust-server/src/schema/domains/system.rs`
  - Queries: `rollbackRequest(id)`, `rollbackRequests(status)`
  - Queries: `bulkRollbackBatch(id)`, `bulkRollbackBatches()`
  - Queries: `activityLog(id)`, `activityLogs(userId, limit)`
  - Queries: `hrReport(id)`, `compensationBand(id)`, `payrollRecord(id)`
  - Use DataLoaders

- [ ] **T033** [P] Implement Event Extensions queries in `graphql-rust-server/src/schema/domains/events_ext.rs`
  - Queries: `eventComment(id)`, `eventComments(eventId)`
  - Queries: `eventHistory(eventId)`, `eventWaitlist(eventId)`
  - Nested replies on comments using DataLoader

- [ ] **T034** [P] Implement Task Extensions queries in `graphql-rust-server/src/schema/domains/tasks_ext.rs`
  - Queries: `taskType(id)`, `taskTypes()`
  - Relationship to existing `Task` model

- [ ] **T035** [P] Implement Review Extensions queries in `graphql-rust-server/src/schema/domains/reviews_ext.rs`
  - Queries: `reviewTemplate(id)`, `reviewTemplates()`
  - Relationship to existing `PerformanceReview` model

---

## Phase 3.6: Mutation Resolver Implementation (8 tasks)

- [ ] **T036** [P] Implement Employee mutations in `graphql-rust-server/src/schema/domains/employee.rs`
  - `createEmployeeSkill(input)`, `updateEmployeeSkill(input)`, `deleteEmployeeSkill(id)`
  - `createEmployeeCertification(input)`, `deleteEmployeeCertification(id)`
  - `createEmployeeVehicle(...)`, `deleteEmployeeVehicle(id)`
  - `createEmergencyContact(...)`, `deleteEmergencyContact(id)`
  - Input validation (email format, phone format, proficiency progression)

- [ ] **T037** [P] Implement Document mutations in `graphql-rust-server/src/schema/domains/documents.rs`
  - `createDocument(input)`, `updateDocument(input)`, `deleteDocument(id)` (soft delete)
  - `createDocumentCategory(name, description, parentCategoryId)`
  - Validation: file size limits, MIME type whitelist

- [ ] **T038** [P] Implement Time mutations in `graphql-rust-server/src/schema/domains/time.rs`
  - `createTimeOffPolicy(input)`, `updateTimeOffPolicy(input)`
  - `createAttendanceRecord(input)`, `updateAttendanceRecord(input)`
  - Validation: clock_in < clock_out, calculate total_hours

- [ ] **T039** [P] Implement Analytics mutations (refresh only) in `graphql-rust-server/src/schema/domains/analytics.rs`
  - `refreshDashboardSummaries()` → executes `REFRESH MATERIALIZED VIEW CONCURRENTLY hr_public.dashboard_summaries`
  - `refreshDepartmentMetrics()`
  - `refreshGoalStatistics()`
  - `refreshReportAnalytics()`
  - Return `RefreshResult { success, message, refreshedAt }`

- [ ] **T040** [P] Implement System mutations in `graphql-rust-server/src/schema/domains/system.rs`
  - `createRollbackRequest(input)`, `approveRollbackRequest(id)`, `rejectRollbackRequest(id)`
  - `createBulkRollbackBatch(input)`
  - No mutations for ActivityLog (audit trail is append-only)

- [ ] **T041** [P] Implement Event Extensions mutations in `graphql-rust-server/src/schema/domains/events_ext.rs`
  - `createEventComment(eventId, commentText, parentCommentId?)`
  - `deleteEventComment(id)`
  - No mutations for EventHistory (audit trail)
  - `joinEventWaitlist(eventId, userId)`, `promoteFromWaitlist(id)`

- [ ] **T042** [P] Implement Task Extensions mutations in `graphql-rust-server/src/schema/domains/tasks_ext.rs`
  - `createTaskType(name, description, color)`, `updateTaskType(input)`, `deleteTaskType(id)`

- [ ] **T043** [P] Implement Review Extensions mutations in `graphql-rust-server/src/schema/domains/reviews_ext.rs`
  - `createReviewTemplate(input)`, `updateReviewTemplate(input)`, `deleteReviewTemplate(id)`

---

## Phase 3.7: Schema Composition & Integration (2 tasks)

- [ ] **T044** Merge all domain schemas into root Query/Mutation in `graphql-rust-server/src/schema/query.rs` and `mutation.rs`
  - Update `Query` struct to use `#[derive(MergedObject)]`
  - Merge: `CoreQuery`, `EmployeeQuery`, `DocumentsQuery`, `TimeQuery`, `AnalyticsQuery`, `SystemQuery`, `EventsExtQuery`, `TasksExtQuery`, `ReviewsExtQuery`
  - Update `Mutation` similarly
  - **BLOCKED BY**: T028-T043 (all domain resolvers must exist)

- [ ] **T045** Update existing User model relationships in `graphql-rust-server/src/models/user.rs`
  - Add relationship fields: `skills()`, `certifications()`, `vehicles()`, `emergencyContacts()`, `goals()`
  - Use DataLoaders from T020
  - **BLOCKED BY**: T012, T020

---

## Phase 3.8: Integration Tests (TDD GREEN Phase) (10 tasks)

- [ ] **T046** [P] Integration test: Employee skills query (Scenario 1 from quickstart.md) in `graphql-rust-server/tests/integration/employee_skills_test.rs`
  - Test `employeeSkills` query with filter by employeeId
  - Verify camelCase fields, Relay pagination structure
  - Validate proficiency enum values
  - **BLOCKED BY**: T044

- [ ] **T047** [P] Integration test: Document management query (Scenario 2) in `graphql-rust-server/tests/integration/documents_test.rs`
  - Test `documents` query with relationships (category, uploader, versions)
  - Verify cursor pagination and totalCount
  - **BLOCKED BY**: T044

- [ ] **T048** [P] Integration test: Dashboard analytics query (Scenario 3) in `graphql-rust-server/tests/integration/analytics_test.rs`
  - Test `dashboardSummaries` query
  - Verify lastRefreshedAt timestamp
  - Test single record return
  - **BLOCKED BY**: T044

- [ ] **T049** [P] Integration test: Materialized view refresh mutation (Scenario 4) in `graphql-rust-server/tests/integration/refresh_test.rs`
  - Test `refreshDashboardSummaries` mutation
  - Verify success response and timestamp update
  - **BLOCKED BY**: T044

- [ ] **T050** [P] Integration test: Emergency contacts query (Scenario 5) in `graphql-rust-server/tests/integration/emergency_contacts_test.rs`
  - Test `emergencyContacts` query by employeeId
  - Verify isPrimary boolean field
  - **BLOCKED BY**: T044

- [ ] **T051** [P] Integration test: Event comments and history (Scenario 6) in `graphql-rust-server/tests/integration/events_ext_test.rs`
  - Test `event` query with nested comments, history, waitlist
  - Verify nested replies on comments
  - **BLOCKED BY**: T044

- [ ] **T052** [P] Integration test: Rollback system query (Scenario 7) in `graphql-rust-server/tests/integration/rollback_test.rs`
  - Test `rollbackRequests` query filtered by status
  - Verify relationships (requester, approver)
  - **BLOCKED BY**: T044

- [ ] **T053** [P] Integration test: Cursor pagination validation (Scenario 8) in `graphql-rust-server/tests/integration/pagination_test.rs`
  - Test forward pagination (first/after)
  - Verify hasNextPage, endCursor functionality
  - Test cursor format (base64-encoded)
  - **BLOCKED BY**: T044

- [ ] **T054** [P] Integration test: Schema introspection validation (Scenario 9) in `graphql-rust-server/tests/integration/schema_introspection_test.rs`
  - Test all 23 new types exist via __schema query
  - Verify type names follow PascalCase
  - Check for duplicate type definitions
  - **BLOCKED BY**: T044

- [ ] **T055** [P] Integration test: Error handling validation (Scenario 10) in `graphql-rust-server/tests/integration/error_handling_test.rs`
  - Test non-existent field query returns descriptive error
  - Verify error message includes field name and type
  - Check location information (line/column)
  - **BLOCKED BY**: T044

---

## Phase 3.9: Polish & Validation (3 tasks)

- [ ] **T056** Run SQLx metadata generation with `cargo sqlx prepare` in `graphql-rust-server/`
  - Generates `.sqlx/` directory with query metadata for offline compilation
  - Commit `.sqlx/` to version control
  - Verify `cargo build --offline` works in CI
  - **BLOCKED BY**: T044 (all SQL queries must exist)

- [ ] **T057** Run complete validation suite from `quickstart.md`
  - Execute all 10 quickstart scenarios manually
  - Start Rust GraphQL server: `cd graphql-rust-server && cargo run --release`
  - Run curl commands from quickstart.md
  - Verify all expected outputs match
  - Document any deviations
  - **BLOCKED BY**: T056

- [ ] **T058** Performance validation and optimization
  - Run GraphQL query performance tests (target <200ms)
  - Verify DataLoader prevents N+1 queries (check SQL logs)
  - Test connection pooling under load (1000+ concurrent connections)
  - Profile slow queries and add database indexes if needed
  - **BLOCKED BY**: T057

---

## Dependencies

**Phase Order**:
1. Setup (T001-T003) → Tests (T004-T011) → Models (T012-T019)
2. Models → DataLoaders (T020-T027) → Queries (T028-T035)
3. Queries → Mutations (T036-T043)
4. Mutations → Schema Composition (T044-T045)
5. Schema → Integration Tests (T046-T055) → Polish (T056-T058)

**Critical Path**:
- T001 → T012 → T020 → T028 → T044 → T046 → T056 → T057 → T058

**Parallel Opportunities**:
- T004-T011 (8 contract tests in parallel)
- T012-T019 (8 model files in parallel)
- T020-T027 (8 DataLoader files in parallel)
- T028-T035 (8 query resolver files in parallel)
- T036-T043 (8 mutation resolver files in parallel)
- T046-T055 (10 integration tests in parallel)

---

## Parallel Execution Example

### Phase 3.2: Launch all contract tests together
```bash
# Execute T004-T011 concurrently
Task: "Contract test Employee domain in graphql-rust-server/tests/contract/employee_schema_test.rs"
Task: "Contract test Documents domain in graphql-rust-server/tests/contract/documents_schema_test.rs"
Task: "Contract test Time domain in graphql-rust-server/tests/contract/time_schema_test.rs"
Task: "Contract test Analytics domain in graphql-rust-server/tests/contract/analytics_schema_test.rs"
Task: "Contract test System domain in graphql-rust-server/tests/contract/system_schema_test.rs"
Task: "Contract test Events Extensions in graphql-rust-server/tests/contract/events_ext_schema_test.rs"
Task: "Contract test Tasks Extensions in graphql-rust-server/tests/contract/tasks_ext_schema_test.rs"
Task: "Contract test Reviews Extensions in graphql-rust-server/tests/contract/reviews_ext_schema_test.rs"
```

### Phase 3.3: Launch all model implementations together
```bash
# Execute T012-T019 concurrently
Task: "Implement Employee models in graphql-rust-server/src/models/employee/mod.rs"
Task: "Implement Documents models in graphql-rust-server/src/models/documents/mod.rs"
Task: "Implement Time models in graphql-rust-server/src/models/time/mod.rs"
Task: "Implement Analytics models in graphql-rust-server/src/models/analytics/mod.rs"
Task: "Implement System models in graphql-rust-server/src/models/system/mod.rs"
Task: "Implement Events Extensions in graphql-rust-server/src/models/events_ext/mod.rs"
Task: "Implement Tasks Extensions in graphql-rust-server/src/models/tasks_ext/mod.rs"
Task: "Implement Reviews Extensions in graphql-rust-server/src/models/reviews_ext/mod.rs"
```

### Phase 3.8: Launch all integration tests together
```bash
# Execute T046-T055 concurrently after T044 completes
Task: "Integration test employee skills in graphql-rust-server/tests/integration/employee_skills_test.rs"
Task: "Integration test documents in graphql-rust-server/tests/integration/documents_test.rs"
Task: "Integration test analytics in graphql-rust-server/tests/integration/analytics_test.rs"
Task: "Integration test refresh in graphql-rust-server/tests/integration/refresh_test.rs"
Task: "Integration test emergency contacts in graphql-rust-server/tests/integration/emergency_contacts_test.rs"
Task: "Integration test events extensions in graphql-rust-server/tests/integration/events_ext_test.rs"
Task: "Integration test rollback in graphql-rust-server/tests/integration/rollback_test.rs"
Task: "Integration test pagination in graphql-rust-server/tests/integration/pagination_test.rs"
Task: "Integration test schema introspection in graphql-rust-server/tests/integration/schema_introspection_test.rs"
Task: "Integration test error handling in graphql-rust-server/tests/integration/error_handling_test.rs"
```

---

## Notes

- **[P] tasks** = different files, no dependencies, can run in parallel
- **Verify tests fail (RED)** before implementing (T004-T011 must fail initially)
- **Commit after each task** to maintain atomic changes
- **SQLx compile-time validation** prevents runtime SQL errors (T056)
- **Use Serena MCP tools** for code discovery before modifying files per Constitution
- **Use Archon MCP** for task tracking per CLAUDE.md ARCHON-FIRST RULE

---

## Validation Checklist

_GATE: Verify before marking feature complete_

- [x] All contracts have corresponding tests (T004-T011 cover all domains)
- [x] All 23 entities have model tasks (T012-T019)
- [x] All tests come before implementation (Phase 3.2 before 3.3-3.6)
- [x] Parallel tasks truly independent ([P] tasks modify different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] TDD workflow enforced (RED → GREEN → REFACTOR)
- [x] PostGraphile compatibility maintained (camelCase, Relay pagination)
- [x] Performance targets met (<200ms queries, N+1 prevention)
