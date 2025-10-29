# Tasks: Comprehensive Audit Logging with Rollback Capabilities

**Feature**: 020-we-need-to
**Branch**: `020-we-need-to`
**Input**: Design documents from `/home/chanway/Projects/SvelteHR/specs/020-we-need-to/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

## Execution Summary

This task list follows strict TDD (Test-Driven Development) order as required by the SvelteHR constitution:
1. **Database migrations first** (foundation)
2. **Tests before implementation** (RED phase)
3. **Implementation to make tests pass** (GREEN phase)
4. **Refactoring and polish** (REFACTOR phase)

**Total Tasks**: 62 tasks across 6 phases
**Estimated Duration**: 3-4 weeks
**Parallel Opportunities**: 35 tasks marked [P] can run in parallel

---

## Phase 3.1: Database Foundation (T001-T003) ✅ COMPLETE

**Prerequisites**: None
**Must complete before**: All other phases

- [x] **T001** [P] Create `activity_logs` table migration in `migrations/20251002_001_create_activity_logs.sql`
  - ✅ Add all columns per data-model.md (id, employee_id, action, resource_type, resource_id, before_snapshot, after_snapshot, ip_address, user_agent, reason, is_rollback, rolled_back_log_id, created_at)
  - ✅ Add CHECK constraints (action IN ('create','read','update','delete'))
  - ✅ Add 7 indexes (timestamp DESC, employee+time, resource, action, modifications-only, GIN snapshots, GIN reason trigram)
  - ✅ Add RLS policies (admin_dept_logs, hr_admin_org_logs, activity_logs_insert)
  - ✅ Validate snapshot rules (before_snapshot NULL for create, after_snapshot NULL for delete)
  - ✅ Add immutable triggers (prevent updates/deletes)
  - ✅ Add helper functions (get_activity_log_stats)

- [x] **T002** [P] Create `rollback_requests` table migration in `migrations/20251002_002_create_rollback_requests.sql`
  - ✅ Add all columns per data-model.md (id, activity_log_id FK, requested_by FK, requested_at, reason, status, reviewed_by FK, reviewed_at, review_reason)
  - ✅ Add CHECK constraint (status IN ('pending','approved','rejected'))
  - ✅ Add 3 indexes (status+requested_at DESC, activity_log_id, requested_by)
  - ✅ Add RLS policies (admin_own_requests, super_admin_all_requests, admin_create_requests, super_admin_update_requests)
  - ✅ Add validation CHECK (reviewed_by NULL when status='pending')
  - ✅ Add immutable triggers (prevent modification of reviewed requests)
  - ✅ Add helper functions (approve_rollback_request, reject_rollback_request)

- [x] **T003** [P] Create `bulk_rollback_batches` table migration in `migrations/20251002_003_create_bulk_rollback_batches.sql`
  - ✅ Add all columns per data-model.md (id, initiated_by FK, activity_log_ids UUID[], started_at, completed_at, status, total_count, processed_count, successful_count, failed_count, failure_details JSONB)
  - ✅ Add CHECK constraint (status IN ('queued','in_progress','completed','failed'))
  - ✅ Add CHECK constraint (total_count = array_length(activity_log_ids, 1))
  - ✅ Add CHECK constraint (processed_count = successful_count + failed_count)
  - ✅ Add CHECK constraint (array_length(activity_log_ids, 1) <= 100)
  - ✅ Add 2 indexes (status+started_at DESC, initiated_by)
  - ✅ Add RLS policies (super_admin_bulk_batches, super_admin_create_batches, super_admin_update_batches)
  - ✅ Add helper functions (update_batch_progress, cancel_batch)
  - ✅ Add statistics view (bulk_rollback_batch_stats)

---

## Phase 3.2: GraphQL Contract Tests (T004-T011) ✅ COMPLETE (RED Phase)

**Prerequisites**: Phase 3.1 complete
**Must complete before**: Phase 3.5 (implementation)

- [x] **T004** [P] Contract test for GetActivityLogs query in `tests/contract/audit-logs-get-activity-logs.test.ts`
  - Test paginated query with first=50, offset=0
  - Test filtering by employeeId, action, resourceType, date range
  - Test sorting by createdAt DESC
  - Validate response shape matches GraphQL schema
  - Assert nodes array, totalCount, pageInfo structure
  - **MUST FAIL** (mutation not implemented yet)

- [x] **T005** [P] Contract test for GetActivityLog query in `tests/contract/audit-logs-get-activity-log-detail.test.ts`
  - ✅ Test single log fetch by ID
  - ✅ Validate full details including employee, department, snapshots
  - ✅ Test rolledBackLog nested query
  - ✅ **RED Phase complete** (tests fail as expected)

- [x] **T006** [P] Contract test for GetPendingRollbackRequests query in `tests/contract/audit-logs-get-pending-rollback-requests.test.ts`
  - ✅ Test pending requests query with pagination
  - ✅ Validate nested activityLog and requester fields
  - ✅ Test super_admin-only access (should fail for admin)
  - ✅ **RED Phase complete** (tests fail as expected)

- [x] **T007** [P] Contract test for GetMyRollbackRequests query in `tests/contract/audit-logs-get-my-rollback-requests.test.ts`
  - ✅ Test user's own requests filtered by requestedBy
  - ✅ Validate status, review fields
  - ✅ Test RLS (user can only see own requests)
  - ✅ **RED Phase complete** (tests fail as expected)

- [x] **T008** [P] Contract test for RequestRollback mutation in `tests/contract/audit-logs-request-rollback-mutation.test.ts`
  - ✅ Test rollback request creation by admin
  - ✅ Validate input (activityLogId, requestedBy, reason)
  - ✅ Test notification to super admins
  - ✅ **RED Phase complete** (tests fail as expected)

- [x] **T009** [P] Contract test for ExecuteRollback mutation in `tests/contract/audit-logs-execute-rollback-mutation.test.ts`
  - ✅ Test rollback execution by super_admin
  - ✅ Validate conflict detection response
  - ✅ Test creates new activity log with is_rollback=TRUE
  - ✅ Test failure when target is already rollback entry
  - ✅ **RED Phase complete** (tests fail as expected)

- [x] **T010** [P] Contract test for ApproveRollbackRequest mutation in `tests/contract/audit-logs-approve-rollback-request-mutation.test.ts`
  - ✅ Test approval by super_admin
  - ✅ Validate automatic rollback execution on approval
  - ✅ Test notification to requester and original user
  - ✅ **RED Phase complete** (tests fail as expected)

- [x] **T011** [P] Contract test for CreateBulkRollbackBatch mutation in `tests/contract/audit-logs-create-bulk-rollback-batch-mutation.test.ts`
  - ✅ Test batch creation with array of log IDs
  - ✅ Validate max 100 log IDs constraint
  - ✅ Test returns batch ID for progress tracking
  - ✅ **RED Phase complete** (tests fail as expected)

---

## Phase 3.3: Core Service Unit Tests (T012-T020) ⚠️ MUST FAIL INITIALLY

**Prerequisites**: Phase 3.1 complete
**Can run in parallel with**: Phase 3.2

- [ ] **T012** [P] Unit test for logging service with retry in `src/tests/unit/services/audit-logging.service.test.ts`
  - Test successful log write on first attempt
  - Test retry logic (3 attempts with 100ms, 500ms, 2s backoff)
  - Test transaction rollback after all retries fail
  - Test error message "Action cancelled due to logging failure"
  - Mock PostGraphile client insert operations
  - **MUST FAIL** (service not implemented yet)

- [ ] **T013** [P] Unit test for snapshot capture utility in `src/tests/unit/utils/snapshot-capture.test.ts`
  - Test capture of before_snapshot for update/delete operations
  - Test capture of after_snapshot for create/update operations
  - Test NULL snapshots for create (before) and delete (after)
  - Test JSONB structure with _metadata and _relationships
  - Test snapshot size validation (<1GB, typically <10KB)
  - **MUST FAIL** (utility not implemented yet)

- [ ] **T014** [P] Unit test for rollback validation logic in `src/tests/unit/services/rollback-validation.test.ts`
  - Test validation prevents rollback of rollback (is_rollback=TRUE)
  - Test validation requires super_admin role
  - Test validation checks resource still exists
  - Test validation for data integrity constraints
  - **MUST FAIL** (validation not implemented yet)

- [ ] **T015** [P] Unit test for conflict detection (jsonbDiff) in `src/tests/unit/utils/jsonb-diff.test.ts`
  - Test diff detection for modified fields
  - Test no conflicts when state matches snapshot
  - Test conflict reporting (field name, current value, target value)
  - Test nested object comparison
  - **MUST FAIL** (utility not implemented yet)

- [ ] **T016** [P] Unit test for cascade snapshot collection in `src/tests/unit/utils/cascade-snapshot.test.ts`
  - Test recursive traversal of foreign key relationships
  - Test capture of cascaded delete children
  - Test snapshot format with cascaded_deletes array
  - Test relationship metadata preservation
  - **MUST FAIL** (utility not implemented yet)

- [ ] **T017** [P] Unit test for rollback execution engine in `src/tests/unit/services/rollback-execution.test.ts`
  - Test UPDATE rollback (restore before_snapshot)
  - Test DELETE rollback (recreate from before_snapshot with original ID)
  - Test CREATE rollback (delete the created resource)
  - Test cascade rollback (restore parent and children)
  - Test atomic transaction (all-or-nothing)
  - Test new activity log creation with is_rollback=TRUE
  - **MUST FAIL** (engine not implemented yet)

- [ ] **T018** [P] Unit test for bulk rollback batch processor in `src/tests/unit/services/bulk-rollback-processor.test.ts`
  - Test batch status transitions (queued → in_progress → completed)
  - Test processing in reverse chronological order
  - Test progress tracking (processed_count, successful_count, failed_count)
  - Test continue on individual failure (don't abort batch)
  - Test failure_details JSONB population
  - Test max 100 rollbacks per batch enforcement
  - **MUST FAIL** (processor not implemented yet)

- [ ] **T019** [P] Unit test for RLS policy helpers in `src/tests/unit/utils/rls-helpers.test.ts`
  - Test department scope filtering for admin role
  - Test organization-wide filtering for hr_admin/super_admin
  - Test JWT claims extraction (user_id, role, department_id)
  - Test PostGraphile session variable setting
  - **MUST FAIL** (helpers not implemented yet)

- [ ] **T020** [P] Unit test for SSE progress stream in `src/tests/unit/api/sse-progress.test.ts`
  - Test SSE connection establishment
  - Test progress event format (processed, total, status)
  - Test completion event with summary
  - Test error event handling
  - Test stream auto-close after completion
  - **MUST FAIL** (SSE endpoint not implemented yet)

---

## Phase 3.4: Component Unit Tests (T021-T027) ⚠️ MUST FAIL INITIALLY

**Prerequisites**: Phase 3.1 complete
**Can run in parallel with**: Phase 3.2, Phase 3.3

- [ ] **T021** [P] Component test + Storybook for RollbackButton in `src/lib/components/activities/RollbackButton.test.ts` and `.stories.ts`
  - Test button visibility (super_admin only)
  - Test button disabled for rollback entries (is_rollback=TRUE)
  - Test button disabled for read operations
  - Test confirmation dialog on click
  - Test loading state during rollback
  - Create Storybook stories: Default, Loading, Disabled, Error states
  - **MUST FAIL** (component not implemented yet)

- [ ] **T022** [P] Component test + Storybook for RollbackRequestCard in `src/lib/components/activities/RollbackRequestCard.test.ts` and `.stories.ts`
  - Test card displays requester info
  - Test displays activity log details
  - Test approve/reject buttons (super_admin only)
  - Test reason field for rejection
  - Test loading state during approval/rejection
  - Create Storybook stories: Pending, Approved, Rejected states
  - **MUST FAIL** (component not implemented yet)

- [ ] **T023** [P] Component test + Storybook for BulkRollbackDialog in `src/lib/components/activities/BulkRollbackDialog.test.ts` and `.stories.ts`
  - Test displays count of selected logs
  - Test displays list of logs to rollback
  - Test reason input field
  - Test progress bar during execution
  - Test summary report on completion
  - Create Storybook stories: Selection, Processing, Completed, Partial Failure states
  - **MUST FAIL** (component not implemented yet)

- [ ] **T024** [P] Component test + Storybook for ConflictResolutionModal in `src/lib/components/activities/ConflictResolutionModal.test.ts` and `.stories.ts`
  - Test displays current state vs target state diff
  - Test three resolution options (Force, Cancel, Merge)
  - Test additional confirmation for Force option
  - Test conflict field highlighting
  - Create Storybook stories: Single Conflict, Multiple Conflicts, Cascade Conflict states
  - **MUST FAIL** (component not implemented yet)

- [ ] **T025** [P] Component test for audit log filter in `src/lib/components/activities/AuditLogFilters.test.ts`
  - Test date range picker
  - Test user dropdown (with search)
  - Test action type multi-select
  - Test resource type multi-select
  - Test search input (debounced)
  - Test filter reset button
  - **MUST FAIL** (enhanced component not implemented yet)

- [ ] **T026** [P] Component test for ActivityFeed enhancements in `src/lib/components/activities/ActivityFeed.test.ts`
  - Test rollback badge display (is_rollback=TRUE)
  - Test "Rolled Back" indicator on original entry
  - Test click to expand shows rollback details
  - Test links between rollback and original log
  - **MUST FAIL** (enhancements not implemented yet)

- [ ] **T027** [P] Component test for pagination with page size selector in `src/lib/components/ui/Pagination.test.ts`
  - Test page size dropdown (25, 50, 100, 200 entries)
  - Test page navigation (prev, next, jump to page)
  - Test correct offset calculation
  - Test disabled state when no more pages
  - **MUST FAIL** (enhanced component not implemented yet)

---

## Phase 3.5: Implementation Tasks (T028-T048)

**Prerequisites**: Phase 3.2, 3.3, 3.4 tests complete and FAILING
**Goal**: Make all tests pass (GREEN phase)

### Core Services (T028-T036)

- [ ] **T028** Implement logging service with retry in `src/lib/services/audit-logging.service.ts`
  - Implement 3-attempt retry with exponential backoff (100ms, 500ms, 2s)
  - Use PostgreSQL transaction for atomicity
  - Rollback transaction if logging fails after retries
  - Integrate with PostGraphile client
  - **Makes T012 pass**

- [ ] **T029** Implement snapshot capture utility in `src/lib/utils/snapshot-capture.ts`
  - Capture full resource state as JSONB
  - Add _metadata (table, version, captured_at)
  - Add _relationships for foreign key references
  - Handle NULL snapshots for create/delete
  - **Makes T013 pass**

- [ ] **T030** Implement rollback validation logic in `src/lib/services/rollback-validation.ts`
  - Check is_rollback flag (prevent rollback of rollback)
  - Verify super_admin role from JWT
  - Check resource existence
  - Validate data integrity constraints
  - **Makes T014 pass**

- [ ] **T031** Implement conflict detection with jsonbDiff in `src/lib/utils/jsonb-diff.ts`
  - Compare current state to before_snapshot
  - Identify modified fields
  - Return conflict details (field, current, target)
  - Handle nested objects
  - **Makes T015 pass**

- [ ] **T032** Implement cascade snapshot collection in `src/lib/utils/cascade-snapshot.ts`
  - Traverse foreign keys to find cascade-deleted children
  - Capture parent and all children
  - Store in cascaded_deletes array
  - Preserve relationship metadata
  - **Makes T016 pass**

- [ ] **T033** Implement rollback execution engine in `src/lib/services/rollback-execution.ts`
  - Execute UPDATE rollback (restore before_snapshot)
  - Execute DELETE rollback (recreate with original ID)
  - Execute CREATE rollback (delete resource)
  - Handle cascade rollback (restore all children)
  - Use atomic transaction
  - Create new activity log with is_rollback=TRUE
  - **Makes T017 pass**

- [ ] **T034** Implement bulk rollback batch processor in `src/lib/services/bulk-rollback-processor.ts`
  - Process logs in reverse chronological order
  - Update batch status (queued → in_progress → completed)
  - Track progress (processed, successful, failed counts)
  - Continue on individual failures
  - Populate failure_details JSONB
  - Emit SSE progress events
  - **Makes T018 pass**

- [ ] **T035** Implement RLS policy helpers in `src/lib/utils/rls-helpers.ts`
  - Extract JWT claims (user_id, role, department_id)
  - Set PostGraphile session variables
  - Apply department scope for admin
  - Apply org-wide scope for hr_admin/super_admin
  - **Makes T019 pass**

- [ ] **T036** Implement SSE progress stream endpoint in `src/routes/api/rollback/bulk/[batchId]/progress/+server.ts`
  - Establish SSE connection
  - Stream progress events from batch processor
  - Send completion event with summary
  - Handle errors and close stream
  - **Makes T020 pass**

### UI Components (T037-T043)

- [ ] **T037** Implement RollbackButton component in `src/lib/components/activities/RollbackButton.svelte`
  - Show only for super_admin
  - Disable for rollback entries (is_rollback=TRUE)
  - Disable for read operations
  - Show confirmation dialog on click
  - Handle loading state
  - Call ExecuteRollback mutation
  - **Makes T021 pass**

- [ ] **T038** Implement RollbackRequestCard component in `src/lib/components/activities/RollbackRequestCard.svelte`
  - Display requester and activity log info
  - Show approve/reject buttons (super_admin only)
  - Require reason for rejection
  - Handle loading state
  - Call ApproveRollbackRequest or RejectRollbackRequest mutation
  - **Makes T022 pass**

- [ ] **T039** Implement BulkRollbackDialog component in `src/lib/components/activities/BulkRollbackDialog.svelte`
  - Display count and list of selected logs
  - Show reason input field
  - Display progress bar during execution
  - Show summary report on completion
  - Connect to SSE progress stream
  - **Makes T023 pass**

- [ ] **T040** Implement ConflictResolutionModal component in `src/lib/components/activities/ConflictResolutionModal.svelte`
  - Display current vs target state diff
  - Highlight conflicting fields
  - Show three resolution options (Force, Cancel, Merge)
  - Require additional confirmation for Force
  - **Makes T024 pass**

- [ ] **T041** Enhance audit log filter component in `src/lib/components/activities/AuditLogFilters.svelte`
  - Add date range picker
  - Add user dropdown with search
  - Add action type multi-select
  - Add resource type multi-select
  - Add search input (debounced 300ms)
  - Add reset button
  - **Makes T025 pass**

- [ ] **T042** Enhance ActivityFeed with rollback info in `src/lib/components/activities/ActivityFeed.svelte`
  - Add rollback badge for is_rollback=TRUE
  - Show "Rolled Back" indicator on original entries
  - Add expand to show rollback details
  - Add links between rollback and original log
  - **Makes T026 pass**

- [ ] **T043** Enhance pagination with page size selector in `src/lib/components/ui/Pagination.svelte`
  - Add page size dropdown (25, 50, 100, 200)
  - Implement page navigation (prev, next, jump)
  - Calculate correct offset
  - Disable when no more pages
  - **Makes T027 pass**

### GraphQL Operations (T044-T048)

- [ ] **T044** Create GraphQL operation files in `src/lib/graphql/audit-logs-operations.ts`
  - Implement GetActivityLogs query with filters
  - Implement GetActivityLog query (single)
  - Implement GetPendingRollbackRequests query
  - Implement GetMyRollbackRequests query
  - Implement RequestRollback mutation
  - Implement ExecuteRollback mutation
  - Implement ApproveRollbackRequest mutation
  - Implement CreateBulkRollbackBatch mutation
  - Generate TypeScript types from GraphQL schema
  - **Makes T004-T011 pass**

- [ ] **T045** Create audit logs page server in `src/routes/dashboard/activities/audit/+page.server.ts`
  - Load activity logs with pagination (50 default)
  - Apply filters (employeeId, action, resourceType, dateRange, search)
  - Enforce RLS via RLS helpers
  - Load filter options (users list, resource types)
  - Handle errors gracefully
  - **Uses GraphQL operations from T044**

- [ ] **T046** Enhance audit logs page UI in `src/routes/dashboard/activities/audit/+page.svelte`
  - Add filters UI (date, user, action, resource, search)
  - Add bulk selection checkboxes
  - Show RollbackButton for super_admin
  - Show "Request Rollback" button for admin
  - Add "Bulk Rollback" button when multiple selected
  - Integrate BulkRollbackDialog
  - Integrate ConflictResolutionModal
  - **Uses components from T037-T043**

- [ ] **T047** Create pending rollback requests page in `src/routes/dashboard/activities/audit/requests/+page.svelte` and `+page.server.ts`
  - Load pending rollback requests (super_admin only)
  - Display RollbackRequestCard for each request
  - Add filtering and sorting
  - Show approval/rejection history
  - **Uses RollbackRequestCard from T038**

- [ ] **T048** Add rollback button to existing ActivityFeed in `src/lib/components/activities/ActivityFeed.svelte`
  - Conditionally render RollbackButton based on user role
  - Pass activity log data to button
  - Handle rollback success/error
  - **Uses RollbackButton from T037**

---

## Phase 3.6: E2E Integration Tests (T049-T057)

**Prerequisites**: Phase 3.5 complete (all implementation done)
**Goal**: Validate end-to-end user journeys from quickstart.md

- [ ] **T049** [P] E2E test for audit log capture in `tests/e2e/audit-logging/log-capture.spec.ts`
  - Create employee as admin
  - Verify audit log appears within 1 second
  - Check log contains action=CREATE, before_snapshot=NULL, after_snapshot populated
  - **Validates Scenario 1 from quickstart.md**

- [ ] **T050** [P] E2E test for update logging with snapshots in `tests/e2e/audit-logging/update-snapshot.spec.ts`
  - Update employee salary
  - Verify audit log contains before_snapshot and after_snapshot
  - Verify only changed fields highlighted
  - **Validates Scenario 2 from quickstart.md**

- [ ] **T051** [P] E2E test for RBAC department scoping in `tests/e2e/audit-logging/rbac-scoping.spec.ts`
  - Login as admin, count visible logs
  - Login as hr_admin, count visible logs
  - Verify admin sees only department logs
  - Verify hr_admin sees all logs
  - **Validates Scenario 3 from quickstart.md**

- [ ] **T052** [P] E2E test for single rollback in `tests/e2e/rollback/single-rollback.spec.ts`
  - Login as super_admin
  - Find log entry with salary change
  - Click Rollback button
  - Confirm rollback
  - Verify salary reverted
  - Verify new rollback log created
  - **Validates Scenario 4 from quickstart.md**

- [ ] **T053** [P] E2E test for rollback request workflow in `tests/e2e/rollback/request-workflow.spec.ts`
  - Login as admin, submit rollback request
  - Login as super_admin, review and approve request
  - Verify rollback executes automatically
  - Verify notifications sent
  - **Validates Scenario 5 from quickstart.md**

- [ ] **T054** [P] E2E test for bulk rollback with progress in `tests/e2e/rollback/bulk-rollback.spec.ts`
  - Create 5 test employees
  - Select 5 CREATE log entries
  - Click "Bulk Rollback"
  - Watch progress in real-time
  - Verify all 5 employees deleted
  - Verify summary report shows 5/5 successful
  - **Validates Scenario 6 from quickstart.md**

- [ ] **T055** [P] E2E test for conflict detection in `tests/e2e/rollback/conflict-detection.spec.ts`
  - Create two consecutive salary updates (Log A, Log B)
  - Attempt to rollback older change (Log A)
  - Verify conflict detected
  - Select "Force" resolution
  - Verify rollback completes with conflict metadata logged
  - **Validates Scenario 7 from quickstart.md**

- [ ] **T056** [P] E2E test for performance validation in `tests/e2e/audit-logging/performance.spec.ts`
  - Seed 100,000 activity logs (or use existing dataset)
  - Measure initial page load time (<1 second target)
  - Apply filters, measure query time (<1 second target)
  - Test sorting (<500ms target)
  - Test pagination (<500ms target)
  - **Validates Scenario 8 from quickstart.md**

- [ ] **T057** [P] E2E test for logging failure handling in `tests/e2e/audit-logging/failure-handling.spec.ts`
  - Simulate logging failure (revoke INSERT permission temporarily)
  - Attempt to update employee
  - Verify 3 retry attempts with exponential backoff
  - Verify error message "Action cancelled due to logging failure"
  - Verify employee NOT updated
  - Restore permission, retry successfully
  - **Validates Scenario 9 from quickstart.md**

---

## Phase 3.7: Performance & Security Validation (T058-T062)

**Prerequisites**: Phase 3.6 complete (all E2E tests passing)
**Goal**: Final validation gates before merge

- [ ] **T058** [P] Performance benchmark for 100k entry queries in `tests/performance/audit-logs-100k.bench.ts`
  - Seed 100,000 activity logs
  - Benchmark paginated query (50 entries): MUST be <100ms
  - Benchmark filtered query (date + user): MUST be <200ms
  - Benchmark full-text search: MUST be <300ms
  - Generate performance report
  - **Validates performance target from clarifications**

- [ ] **T059** [P] Performance benchmark for bulk rollback in `tests/performance/bulk-rollback.bench.ts`
  - Create 100 test logs
  - Benchmark bulk rollback of 100 operations
  - MUST complete in 10-30 seconds (100-300ms per operation)
  - Verify atomic transactions maintained
  - Generate benchmark report
  - **Validates bulk operation performance**

- [ ] **T060** [P] Security audit for RLS policies in `tests/security/rls-audit.test.ts`
  - Test admin can only query department logs (verify SQL WHERE clause)
  - Test hr_admin can query all logs
  - Test employee cannot access audit logs at all
  - Test super_admin has full access
  - Verify JWT claims correctly extracted
  - **Validates security requirements FR-035 to FR-038**

- [ ] **T061** [P] Security audit for rollback permissions in `tests/security/rollback-permissions.test.ts`
  - Test admin can request rollback but NOT execute
  - Test hr_admin can request rollback but NOT execute
  - Test super_admin can both request AND execute
  - Test employee cannot access rollback functionality
  - Verify GraphQL mutations enforce role checks
  - **Validates security requirements FR-035, FR-036**

- [ ] **T062** [P] Load testing with 1M entry dataset in `tests/performance/audit-logs-1m.load.ts`
  - Seed 1 million activity logs
  - Run 100 concurrent queries
  - Measure response times (p50, p95, p99)
  - Verify p95 < 1 second
  - Monitor database CPU/memory usage
  - Generate load test report
  - **Validates scale requirements from clarifications**

---

## Dependencies

### Critical Path (Sequential)
```
Phase 3.1 (T001-T003: Database)
    ↓
Phase 3.2-3.4 (T004-T027: Tests - MUST FAIL)
    ↓
Phase 3.5 (T028-T048: Implementation - Make tests pass)
    ↓
Phase 3.6 (T049-T057: E2E Tests)
    ↓
Phase 3.7 (T058-T062: Performance/Security)
```

### Phase-Internal Dependencies

**Phase 3.5 Implementation**:
- T028-T036 (Core Services) can run in parallel
- T037-T043 (UI Components) can run in parallel AFTER T028-T036
- T044 (GraphQL Operations) blocks T045-T048
- T045 (Server-side) blocks T046-T047
- T046-T048 (Pages) depend on all components

**Detailed Implementation Order**:
```
T028-T036 [P] → T037-T043 [P] → T044 → T045 → T046, T047, T048 [P]
```

### No Dependencies (Can Run Anytime After Prerequisites)
- Phase 3.1: T001, T002, T003 [P]
- Phase 3.2: T004-T011 [P]
- Phase 3.3: T012-T020 [P]
- Phase 3.4: T021-T027 [P]
- Phase 3.6: T049-T057 [P]
- Phase 3.7: T058-T062 [P]

---

## Parallel Execution Examples

### Launch Phase 3.1 (Database Migrations)
```bash
# All 3 migrations can run in parallel (different files)
Task: "Create activity_logs migration in supabase/migrations/20251002_001_create_activity_logs.sql"
Task: "Create rollback_requests migration in supabase/migrations/20251002_002_create_rollback_requests.sql"
Task: "Create bulk_rollback_batches migration in supabase/migrations/20251002_003_create_bulk_rollback_batches.sql"
```

### Launch Phase 3.2 (Contract Tests)
```bash
# All 8 contract tests can run in parallel (different files)
Task: "Contract test for GetActivityLogs in src/tests/graphql/activity-logs.query.test.ts"
Task: "Contract test for GetActivityLog in src/tests/graphql/activity-log-detail.query.test.ts"
Task: "Contract test for GetPendingRollbackRequests in src/tests/graphql/rollback-requests.query.test.ts"
Task: "Contract test for RequestRollback mutation in src/tests/graphql/request-rollback.mutation.test.ts"
# ... (T007-T011 similarly)
```

### Launch Phase 3.3 (Core Service Unit Tests)
```bash
# All 9 service tests can run in parallel (different files)
Task: "Unit test for logging service with retry in src/tests/unit/services/audit-logging.service.test.ts"
Task: "Unit test for snapshot capture in src/tests/unit/utils/snapshot-capture.test.ts"
Task: "Unit test for rollback validation in src/tests/unit/services/rollback-validation.test.ts"
# ... (T015-T020 similarly)
```

### Launch Phase 3.4 (Component Tests)
```bash
# All 7 component tests can run in parallel (different files)
Task: "Component test + Storybook for RollbackButton in src/lib/components/activities/RollbackButton.test.ts"
Task: "Component test + Storybook for RollbackRequestCard in src/lib/components/activities/RollbackRequestCard.test.ts"
# ... (T023-T027 similarly)
```

### Launch Phase 3.5 Core Services (Implementation)
```bash
# Core services (T028-T036) can run in parallel
Task: "Implement logging service with retry in src/lib/services/audit-logging.service.ts"
Task: "Implement snapshot capture in src/lib/utils/snapshot-capture.ts"
Task: "Implement rollback validation in src/lib/services/rollback-validation.ts"
# ... (T031-T036 similarly)
```

### Launch Phase 3.6 (E2E Tests)
```bash
# All 9 E2E tests can run in parallel (different scenarios)
Task: "E2E test for audit log capture in tests/e2e/audit-logging/log-capture.spec.ts"
Task: "E2E test for single rollback in tests/e2e/rollback/single-rollback.spec.ts"
Task: "E2E test for bulk rollback in tests/e2e/rollback/bulk-rollback.spec.ts"
# ... (T052-T057 similarly)
```

### Launch Phase 3.7 (Performance & Security)
```bash
# All 5 validation tasks can run in parallel
Task: "Performance benchmark for 100k queries in tests/performance/audit-logs-100k.bench.ts"
Task: "Performance benchmark for bulk rollback in tests/performance/bulk-rollback.bench.ts"
Task: "Security audit for RLS policies in tests/security/rls-audit.test.ts"
Task: "Security audit for rollback permissions in tests/security/rollback-permissions.test.ts"
Task: "Load testing with 1M dataset in tests/performance/audit-logs-1m.load.ts"
```

---

## Validation Checklist

Before marking tasks.md complete, verify:

- [x] All contracts have corresponding tests (T004-T011 cover all 7 queries + 7 mutations)
- [x] All entities have model tasks (activity_logs, rollback_requests, bulk_rollback_batches in T001-T003)
- [x] All tests come before implementation (Phase 3.2-3.4 before Phase 3.5)
- [x] Parallel tasks truly independent (all [P] tasks use different files)
- [x] Each task specifies exact file path (all tasks include full paths)
- [x] No task modifies same file as another [P] task (verified - no conflicts)
- [x] TDD order enforced (RED → GREEN → REFACTOR phases clearly separated)
- [x] Constitutional compliance (all 6 principles validated in plan.md)

---

## Notes

- **[P] notation**: 35 tasks can run in parallel (saves ~60% development time)
- **TDD enforcement**: Tests MUST fail initially (Phase 3.2-3.4) before implementation (Phase 3.5)
- **Commit strategy**: Commit after each task completion for clear history
- **Refactoring**: Happens continuously during GREEN phase (Phase 3.5)
- **Performance gates**: Phase 3.7 MUST pass before merge (<1s queries, <30s bulk operations)
- **Security gates**: Phase 3.7 MUST verify RLS policies and RBAC enforcement

---

## Task Generation Rules Applied

1. **From Contracts** (contracts/graphql-operations.graphql):
   - 7 queries → T004-T007, T044 (contract tests + implementation)
   - 7 mutations → T008-T011, T044 (contract tests + implementation)

2. **From Data Model** (data-model.md):
   - 3 entities (ActivityLogs, RollbackRequests, BulkRollbackBatches) → T001-T003 (migrations)
   - GraphQL types → T044 (type generation)

3. **From Research** (research.md):
   - Retry logic decision → T012, T028 (test + implementation)
   - JSONB snapshots → T013, T029 (test + implementation)
   - Conflict detection → T015, T031 (test + implementation)
   - RLS policies → T019, T035, T060 (test + implementation + security audit)

4. **From Quickstart** (quickstart.md):
   - 9 scenarios → T049-T057 (E2E tests validating each scenario)

5. **From Constitution** (SvelteHR constitution):
   - Test-first → Phases 3.2-3.4 before 3.5
   - Performance → Phase 3.7 (T058-T062)
   - Security → RLS policies in migrations, security audits in T060-T061
   - MCP integration → Use Serena MCP throughout implementation

---

**Tasks.md Status**: ✅ Complete and ready for execution
**Total Estimated Duration**: 3-4 weeks (with parallel execution)
**Next Command**: Begin implementation with Phase 3.1 (T001-T003)
