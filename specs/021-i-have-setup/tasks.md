# Tasks: Comprehensive Audit Logging Implementation

**Feature**: 021-i-have-setup | **Date**: 2025-10-02
**Input**: Design documents from `/home/chanway/Projects/SvelteHR/specs/021-i-have-setup/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Execution Flow (main)

```
1. Load plan.md → ✅ Tech stack: TypeScript 5.0, PostgreSQL 14+, SvelteKit 2.22.0
2. Load design documents → ✅ All documents loaded
3. Generate tasks by category → ✅ 46 tasks across 8 phases
4. Apply TDD ordering → ✅ Tests before implementation
5. Mark parallel tasks → ✅ [P] markers applied
6. Validate completeness → ✅ All contracts, entities, endpoints covered
7. Generate dependency graph → ✅ Dependencies documented below
8. Create execution examples → ✅ Parallel execution guide included
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Exact file paths included in all task descriptions
- All tasks follow TDD: tests first, implementation second

## Path Conventions

**Web Application Structure** (from plan.md):
- Database: `database/migrations/`, `database/schemas/`
- Backend: `src/lib/server/audit/`, `src/lib/server/graphql/`
- Frontend: `src/routes/dashboard/activities/`, `src/lib/components/activities/`
- Tests: `tests/e2e/`, `tests/integration/`, `tests/unit/`

---

## Phase 3.1: Setup & Dependencies

- [ ] **T001** Create database migration file `database/migrations/00XX_comprehensive_audit_logging.sql`
  - Create audit_log_signatures table (from data-model.md)
  - Create audit_retention_archives table
  - Add signature_id and batch_id columns to activity_logs
  - Add required indexes

- [ ] **T002** Install npm dependencies for audit logging
  - `pdfkit` for PDF generation
  - `csv-writer` for CSV export
  - `@types/pdfkit` for TypeScript support
  - Verify `crypto` (Node.js built-in) availability

- [ ] **T003** [P] Configure ESLint rules for audit logging modules
  - Add `src/lib/server/audit/` to TypeScript paths
  - Configure strict null checks for audit log types

---

## Phase 3.2: Database Layer Tests (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Trigger Contract Tests (from contracts/audit-triggers.sql)

- [ ] **T004** [P] Write failing test for employees INSERT trigger in `tests/integration/triggers/employee-insert.test.ts`
  - Test: INSERT employee → activity_log entry created with action='CREATE'
  - Assert: complete after_snapshot captured, before_snapshot=NULL
  - Expected: ❌ FAIL (trigger not implemented)

- [ ] **T005** [P] Write failing test for employees UPDATE trigger in `tests/integration/triggers/employee-update.test.ts`
  - Test: UPDATE employee → activity_log entry with before/after snapshots
  - Assert: field-level changes captured in both snapshots
  - Expected: ❌ FAIL (trigger not implemented)

- [ ] **T006** [P] Write failing test for employees DELETE trigger in `tests/integration/triggers/employee-delete.test.ts`
  - Test: DELETE employee → activity_log entry with before_snapshot only
  - Assert: after_snapshot=NULL, action='DELETE'
  - Expected: ❌ FAIL (trigger not implemented)

- [ ] **T007** [P] Write failing test for departments INSERT trigger in `tests/integration/triggers/department-insert.test.ts`
  - Same pattern as T004 but for departments table

- [ ] **T008** [P] Write failing test for departments UPDATE trigger in `tests/integration/triggers/department-update.test.ts`
  - Same pattern as T005 but for departments table

- [ ] **T009** [P] Write failing test for users INSERT trigger in `tests/integration/triggers/user-insert.test.ts`
  - Same pattern as T004 but for users table

- [ ] **T010** [P] Write failing test for users UPDATE trigger in `tests/integration/triggers/user-update.test.ts`
  - Same pattern as T005 but for users table

- [ ] **T011** [P] Write failing test for roles INSERT trigger in `tests/integration/triggers/role-insert.test.ts`
  - Same pattern as T004 but for roles table

- [ ] **T012** [P] Write failing test for permissions INSERT trigger in `tests/integration/triggers/permission-insert.test.ts`
  - Same pattern as T004 but for permissions table

- [ ] **T013** [P] Write failing test for events INSERT trigger in `tests/integration/triggers/event-insert.test.ts`
  - Same pattern as T004 but for events table

- [ ] **T014** [P] Write failing test for tasks INSERT trigger in `tests/integration/triggers/task-insert.test.ts`
  - Same pattern as T004 but for tasks table

- [ ] **T015** [P] Write failing test for batch operation tracking in `tests/integration/triggers/batch-operations.test.ts`
  - Test: Multiple INSERTs with same app.current_batch_id
  - Assert: All logs have matching batch_id
  - Expected: ❌ FAIL (trigger not handling batch_id)

- [ ] **T016** [P] Write failing test for system vs user actions in `tests/integration/triggers/system-actions.test.ts`
  - Test: INSERT without app.current_user_id set
  - Assert: employee_id=NULL for system actions
  - Expected: ❌ FAIL (trigger not differentiating)

### Cryptographic Signing Tests (from research.md)

- [ ] **T017** [P] Write failing unit test for ECDSA key generation in `tests/unit/crypto-signer.test.ts`
  - Test: generateKeyPair() returns valid ES256 keys
  - Assert: privateKey and publicKey are KeyObject instances
  - Expected: ❌ FAIL (module doesn't exist)

- [ ] **T018** [P] Write failing unit test for audit log signing in `tests/unit/crypto-signer.test.ts`
  - Test: signAuditLog() generates valid Base64 signature
  - Assert: signature length > 50 characters
  - Expected: ❌ FAIL (function doesn't exist)

- [ ] **T019** [P] Write failing unit test for signature verification in `tests/unit/crypto-signer.test.ts`
  - Test: verifySignature() returns true for valid signature
  - Assert: Returns false for tampered data
  - Expected: ❌ FAIL (function doesn't exist)

---

## Phase 3.3: Database Layer Implementation (ONLY after tests are failing)

### Trigger Function Implementation

- [ ] **T020** Implement universal audit trigger function in `database/migrations/00XX_comprehensive_audit_logging.sql`
  - Copy audit_trigger_func() from contracts/audit-triggers.sql
  - Handle INSERT/UPDATE/DELETE operations
  - Extract user context from session variables (SET LOCAL)
  - Insert into activity_logs table
  - Emit pg_notify for async worker
  - Run tests T004-T016: Expected ✅ PASS

- [ ] **T021** [P] Create trigger for employees table
  - `CREATE TRIGGER audit_trigger_employees AFTER INSERT OR UPDATE OR DELETE...`
  - Run T004, T005, T006: Expected ✅ PASS

- [ ] **T022** [P] Create trigger for departments table
  - Run T007, T008: Expected ✅ PASS

- [ ] **T023** [P] Create trigger for users table
  - Run T009, T010: Expected ✅ PASS

- [ ] **T024** [P] Create trigger for roles table
  - Run T011: Expected ✅ PASS

- [ ] **T025** [P] Create trigger for permissions table
  - Run T012: Expected ✅ PASS

- [ ] **T026** [P] Create trigger for events table
  - Run T013: Expected ✅ PASS

- [ ] **T027** [P] Create trigger for tasks table
  - Run T014: Expected ✅ PASS

### Cryptographic Signing Implementation

- [ ] **T028** Implement ECDSA signing utilities in `src/lib/server/audit/crypto-signer.ts`
  - generateKeyPair() using crypto.generateKeyPairSync('ec', {namedCurve: 'prime256v1'})
  - signAuditLog() using crypto.createSign('SHA256')
  - verifySignature() using crypto.createVerify('SHA256')
  - Run T017, T018, T019: Expected ✅ PASS

- [ ] **T029** Implement async signature worker in `src/lib/server/audit/signature-worker.ts`
  - PostgreSQL LISTEN on 'audit_log_inserted' channel
  - Batch signature generation (100 logs at a time)
  - Insert signatures into audit_log_signatures table
  - Error handling and retry logic

- [ ] **T030** Add signature validation to audit log queries in `src/lib/server/graphql/audit-logs.graphql`
  - Join activity_logs with audit_log_signatures
  - Add verifyAuditLogSignature query resolver
  - Return signature verification result

---

## Phase 3.4: Rollback Operations (TDD)

### Rollback Tests (from contracts/graphql-schema.graphql)

- [ ] **T031** [P] Write failing E2E test for rollback mutation in `tests/e2e/audit-logging/rollback-mutation.spec.ts`
  - Test: super_admin executes rollbackAuditLog mutation
  - Assert: Data reverted to before_snapshot, new ROLLBACK log created
  - Expected: ❌ FAIL (mutation not implemented)

- [ ] **T032** [P] Write failing E2E test for rollback permissions in `tests/e2e/audit-logging/rollback-permissions.spec.ts`
  - Test: admin (not super_admin) attempts rollback
  - Assert: Returns error "Insufficient permissions"
  - Expected: ❌ FAIL (permission check not implemented)

- [ ] **T033** [P] Write failing E2E test for rollback conflict detection in `tests/e2e/audit-logging/rollback-conflicts.spec.ts`
  - Test: Rollback when current state differs from after_snapshot
  - Assert: Returns conflict error with resolution options
  - Expected: ❌ FAIL (conflict detection not implemented)

### Rollback Implementation

- [ ] **T034** Implement rollbackAuditLog GraphQL mutation in `src/lib/server/graphql/rollback-mutation.ts`
  - Fetch original audit log by ID
  - Verify user has super_admin role
  - Restore data from before_snapshot using UPDATE query
  - Create new ROLLBACK audit log entry
  - Set rolled_back_log_id on original log
  - Run T031, T032: Expected ✅ PASS

- [ ] **T035** Implement conflict detection for rollback in `src/lib/server/graphql/rollback-mutation.ts`
  - Compare current database state with after_snapshot
  - If mismatch, return conflict error with field-level diff
  - Support forceRollback flag to override conflicts
  - Run T033: Expected ✅ PASS

- [ ] **T036** Update RollbackButton component to use real mutation in `src/lib/components/activities/RollbackButton.svelte`
  - Replace placeholder with actual GraphQL mutation call
  - Add conflict resolution modal integration
  - Show success/error toasts
  - Refresh audit log list after rollback

---

## Phase 3.5: Export Features (TDD)

### Export Tests (from contracts/api-contracts.md)

- [ ] **T037** [P] Write failing test for CSV export in `tests/unit/export-generator/csv-export.test.ts`
  - Test: exportAuditLogsCSV() generates valid CSV file
  - Assert: CSV has correct headers and all log entries
  - Expected: ❌ FAIL (module doesn't exist)

- [ ] **T038** [P] Write failing test for JSON export in `tests/unit/export-generator/json-export.test.ts`
  - Test: exportAuditLogsJSON() generates valid JSON file
  - Assert: JSON array contains all filtered logs
  - Expected: ❌ FAIL (module doesn't exist)

- [ ] **T039** [P] Write failing test for PDF export in `tests/unit/export-generator/pdf-export.test.ts`
  - Test: exportAuditLogsPDF() generates valid PDF with tables
  - Assert: PDF contains log metadata and snapshots
  - Expected: ❌ FAIL (module doesn't exist)

- [ ] **T040** [P] Write failing E2E test for export API in `tests/e2e/api/export.spec.ts`
  - Test: POST /api/audit/export with format='csv'
  - Assert: Returns 202 with jobId, download URL available after completion
  - Expected: ❌ FAIL (endpoint doesn't exist)

### Export Implementation

- [ ] **T041** Implement CSV export in `src/lib/server/audit/export-generator.ts`
  - Use csv-writer library
  - Define headers from activity_logs columns
  - Stream large datasets (don't load all into memory)
  - Run T037: Expected ✅ PASS

- [ ] **T042** Implement JSON export in `src/lib/server/audit/export-generator.ts`
  - Use native JSON.stringify with streaming
  - Include nested employee and signature data
  - Run T038: Expected ✅ PASS

- [ ] **T043** Implement PDF export in `src/lib/server/audit/export-generator.ts`
  - Use pdfkit library with streaming
  - Create formatted tables with log metadata
  - Add headers/footers with page numbers
  - Run T039: Expected ✅ PASS

- [ ] **T044** Create export API endpoint in `src/routes/api/audit/export/+server.ts`
  - POST handler: Create background job, return 202 with jobId
  - GET /{jobId} handler: Return job status
  - GET /{jobId}/download handler: Stream file download
  - Add RBAC permission check (admin/hr_admin/super_admin only)
  - Run T040: Expected ✅ PASS

- [ ] **T045** Add export button to audit logs page in `src/routes/dashboard/activities/logs/+page.svelte`
  - Add "Export" button with format dropdown (CSV/JSON/PDF)
  - Show loading spinner during export generation
  - Trigger download when ready
  - Add error handling for failed exports

---

## Phase 3.6: Retention & Archival (TDD)

### Retention Tests

- [ ] **T046** [P] Write failing test for 1-year retention in `tests/integration/retention/archival.test.ts`
  - Test: Logs older than 1 year are moved to audit_retention_archives
  - Assert: Original logs deleted, archive records created with compressed data
  - Expected: ❌ FAIL (retention manager doesn't exist)

- [ ] **T047** [P] Write failing test for archive retrieval in `tests/integration/retention/archive-retrieval.test.ts`
  - Test: Query archived logs by original_log_id
  - Assert: Decompressed data matches original log
  - Expected: ❌ FAIL (retrieval not implemented)

### Retention Implementation

- [ ] **T048** Implement retention manager in `src/lib/server/audit/retention-manager.ts`
  - archiveOldLogs() function: Find logs > 1 year old
  - Compress log data using gzip
  - Insert into audit_retention_archives with checksum
  - Delete from activity_logs and audit_log_signatures
  - Run T046: Expected ✅ PASS

- [ ] **T049** Implement archive retrieval in `src/lib/server/audit/retention-manager.ts`
  - retrieveArchivedLog() function: Fetch from audit_retention_archives
  - Decompress data
  - Verify checksum integrity
  - Run T047: Expected ✅ PASS

- [ ] **T050** Add PostgreSQL cron job for automated archival in `database/migrations/00XX_comprehensive_audit_logging.sql`
  - Use pg_cron extension (if available) or document manual cron setup
  - Schedule daily archival at 2 AM
  - Add logging for successful/failed archival runs

---

## Phase 3.7: Performance Optimization

### Performance Tests

- [ ] **T051** [P] Write performance benchmark test in `tests/performance/audit-logging-benchmark.test.ts`
  - Test: 1000 concurrent INSERT operations with audit logging
  - Assert: 95th percentile latency < 100ms
  - Measure trigger overhead separately
  - Expected: ❌ FAIL (may not meet performance target yet)

### Performance Implementation

- [ ] **T052** Implement async batch writing with PostgreSQL LISTEN/NOTIFY
  - Already implemented in T029 (signature-worker.ts)
  - Verify < 5ms synchronous audit log write
  - Verify signatures generated asynchronously
  - Run T051: Expected ✅ PASS

- [ ] **T053** Add Redis caching for audit statistics in `src/lib/server/audit/statistics-cache.ts`
  - Cache results of auditStatistics GraphQL query
  - TTL: 5 minutes for frequently accessed stats
  - Invalidate cache on new audit log creation
  - Measure query performance improvement (should be <50ms with cache)

- [ ] **T054** Create database indexes for common query patterns
  - Already partially done in T001 (migration file)
  - Add composite index on (employee_id, created_at DESC)
  - Add composite index on (resource_type, resource_id, created_at DESC)
  - Add partial index on (is_rollback=true) for rollback logs
  - Verify query plan uses indexes (EXPLAIN ANALYZE)

---

## Phase 3.8: UI Integration & E2E Tests

### UI Updates

- [ ] **T055** Update audit logs page server load with real GraphQL data in `src/routes/dashboard/activities/logs/+page.server.ts`
  - Replace placeholder data with actual GraphQL query to MountainHR backend
  - Query activityLogs with filtering and pagination
  - Query auditStatistics for summary cards
  - Handle errors gracefully

- [ ] **T056** Update audit logs page UI in `src/routes/dashboard/activities/logs/+page.svelte`
  - Remove "TODO" comments
  - Verify ActivityFeed component receives correct data shape
  - Ensure filtering works with real backend
  - Test pagination with large datasets

- [ ] **T057** Update rollback requests page with real data in `src/routes/dashboard/activities/rollback-requests/+page.server.ts`
  - Replace placeholder with GraphQL query for rollback_requests table
  - Join with activity_logs for full context
  - Implement approval/rejection mutations

- [ ] **T058** Update dashboard widgets with real statistics in `src/routes/dashboard/+page.server.ts`
  - Update RecentAuditActivity widget query
  - Update RollbackRequestsWidget query
  - Add conditional queries based on user role (admin/super_admin)

### Comprehensive E2E Tests

- [ ] **T059** [P] Write E2E test for employee creation with audit log in `tests/e2e/audit-logging/employee-creation.spec.ts`
  - Test: Create new employee via UI
  - Assert: Audit log appears in /dashboard/activities/logs
  - Assert: Log shows CREATE action with complete snapshot
  - Expected: ✅ PASS (all components working)

- [ ] **T060** [P] Write E2E test for rollback approval workflow in `tests/e2e/audit-logging/rollback-approval.spec.ts`
  - Test: Admin requests rollback → super_admin approves
  - Assert: Rollback executed, data reverted
  - Assert: Both request and rollback logs visible
  - Expected: ✅ PASS

- [ ] **T061** [P] Write E2E test for export feature in `tests/e2e/audit-logging/export-feature.spec.ts`
  - Test: Generate CSV export from audit logs page
  - Assert: File downloads with correct data
  - Test: Generate PDF export
  - Assert: PDF contains formatted audit log table
  - Expected: ✅ PASS

- [ ] **T062** [P] Write E2E test for signature verification in `tests/e2e/audit-logging/signature-verification.spec.ts`
  - Test: View audit log detail page
  - Assert: Signature status shown (valid/invalid)
  - Test: Tamper with database signature
  - Assert: Verification fails with error message
  - Expected: ✅ PASS

---

## Dependencies

**Critical Path** (blocks other work):
- T001 (migration) blocks T004-T016 (trigger tests)
- T002 (npm install) blocks T028, T041-T043 (crypto, export)
- T004-T016 (trigger tests) block T020-T027 (trigger implementation)
- T017-T019 (signing tests) block T028-T030 (signing implementation)
- T020-T027 (triggers) block T034-T036 (rollback - needs audit logs)
- T028 (crypto) blocks T029 (worker), T030 (validation)
- T037-T040 (export tests) block T041-T045 (export implementation)
- T046-T047 (retention tests) block T048-T050 (retention implementation)
- T055-T058 (UI updates) block T059-T062 (E2E tests)

**Parallel Opportunities** (independent work):
- Tests T004-T016 can all run in parallel (different files)
- Tests T017-T019 can run in parallel (same file, but different functions)
- Trigger creation T021-T027 can run in parallel (different tables)
- Export tests T037-T040 can run in parallel (different modules)
- Export implementation T041-T043 can run in parallel (different functions in same file)
- E2E tests T059-T062 can run in parallel (different test files)

**Sequential Requirements** (same file edits):
- T041-T043 edit same file (export-generator.ts) - run sequentially
- T055-T056 edit related files - prefer sequential
- T028-T029 edit different files but related - can be parallel

---

## Parallel Execution Examples

### Example 1: All Trigger Tests Together (Phase 3.2)

```bash
# Run all 13 trigger tests in parallel:
npm run test:integration -- tests/integration/triggers/

# Or launch individually with Task agent:
Task: "Write failing test for employees INSERT trigger in tests/integration/triggers/employee-insert.test.ts"
Task: "Write failing test for employees UPDATE trigger in tests/integration/triggers/employee-update.test.ts"
Task: "Write failing test for employees DELETE trigger in tests/integration/triggers/employee-delete.test.ts"
# ... (T004-T016)
```

### Example 2: Export Tests in Parallel (Phase 3.5)

```bash
# Run all export tests in parallel:
npm run test:unit -- tests/unit/export-generator/
npm run test:e2e -- tests/e2e/api/export.spec.ts

# Or with Task agent:
Task: "Write failing test for CSV export in tests/unit/export-generator/csv-export.test.ts"
Task: "Write failing test for JSON export in tests/unit/export-generator/json-export.test.ts"
Task: "Write failing test for PDF export in tests/unit/export-generator/pdf-export.test.ts"
Task: "Write failing E2E test for export API in tests/e2e/api/export.spec.ts"
```

### Example 3: E2E Tests in Parallel (Phase 3.8)

```bash
# Run all E2E tests in parallel (Playwright supports this):
npm run test:e2e -- tests/e2e/audit-logging/

# Expected output: 4 tests running in parallel, all ✅ PASS
```

---

## Progress Tracking

**Phases**:
- [ ] Phase 3.1: Setup & Dependencies (T001-T003) - 3 tasks
- [ ] Phase 3.2: Database Layer Tests (T004-T019) - 16 tasks ⚠️ MUST FAIL
- [ ] Phase 3.3: Database Layer Implementation (T020-T030) - 11 tasks
- [ ] Phase 3.4: Rollback Operations (T031-T036) - 6 tasks
- [ ] Phase 3.5: Export Features (T037-T045) - 9 tasks
- [ ] Phase 3.6: Retention & Archival (T046-T050) - 5 tasks
- [ ] Phase 3.7: Performance Optimization (T051-T054) - 4 tasks
- [ ] Phase 3.8: UI Integration & E2E (T055-T062) - 8 tasks

**Total**: 62 tasks (revised from 46 estimate - more comprehensive than originally planned)

**Completion Criteria**:
- [ ] All 62 tasks marked complete
- [ ] All tests passing (>90% coverage)
- [ ] Performance benchmark < 100ms latency
- [ ] Manual testing via quickstart.md completed
- [ ] GDPR compliance documented
- [ ] 1-year retention policy configured

---

_Tasks generated: 2025-10-02 | Ready for execution via TDD workflow_
