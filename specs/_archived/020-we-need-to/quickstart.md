# Quickstart: Audit Logging with Rollback

**Feature**: 020-we-need-to
**Branch**: `020-we-need-to`
**Date**: 2025-10-02

## Quick Start Guide

This guide validates the audit logging and rollback feature is working correctly by executing the core user journeys.

### Prerequisites

1. **Database**: PostgreSQL 15+ with PostGraphile configured
2. **Authentication**: Three test users with different roles:
   - `admin@test.com` (role: admin, department: Engineering)
   - `hradmin@test.com` (role: hr_admin)
   - `superadmin@test.com` (role: super_admin)
3. **Backend**: MountainHR backend running on port 8080
4. **Frontend**: SvelteKit dev server running on port 5173

### Test Scenario 1: Audit Log Capture (5 minutes)

**Objective**: Verify all user actions are logged with state snapshots

**Steps**:

1. Login as `admin@test.com`
2. Navigate to `/dashboard/employees/new`
3. Create a new employee:
   ```
   First Name: Test
   Last Name: Employee
   Email: test.employee@company.com
   Department: Engineering
   Salary: $65,000
   ```
4. Click "Save Employee"
5. Navigate to `/dashboard/activities/audit`
6. Verify new log entry appears:
   - Action: CREATE
   - Resource Type: employees
   - User: Admin User
   - Before Snapshot: NULL
   - After Snapshot: Contains employee data with $65,000 salary

**Expected Result**: ✅ Audit log captured within 1 second of save

**If Failed**: Check `activity_logs` table for insert, verify logging middleware is active

---

### Test Scenario 2: Update Logging with Before/After Snapshots (3 minutes)

**Objective**: Verify updates capture both before and after states

**Steps**:

1. Still logged in as `admin@test.com`
2. Navigate to employee detail page for "Test Employee"
3. Edit salary from $65,000 to $70,000
4. Click "Save Changes"
5. Navigate to `/dashboard/activities/audit`
6. Filter by "Test Employee"
7. Click on the UPDATE log entry
8. Expand to view full details

**Expected Result**:
- ✅ Before Snapshot shows `salary: 65000`
- ✅ After Snapshot shows `salary: 70000`
- ✅ Only changed fields highlighted

**If Failed**: Check `before_snapshot` and `after_snapshot` columns, verify diff logic

---

### Test Scenario 3: RBAC Department Scoping (2 minutes)

**Objective**: Verify admins only see their department's logs

**Steps**:

1. Logout and login as `admin@test.com` (Engineering department)
2. Navigate to `/dashboard/activities/audit`
3. Note visible log count
4. Logout and login as `hradmin@test.com`
5. Navigate to `/dashboard/activities/audit`
6. Compare log count

**Expected Result**:
- ✅ Admin sees only Engineering department logs
- ✅ HR Admin sees all organization-wide logs
- ✅ No 403 errors for either user

**If Failed**: Check RLS policies on `activity_logs` table, verify JWT claims in `hooks.server.ts`

---

### Test Scenario 4: Single Rollback by Super Admin (5 minutes)

**Objective**: Verify super admin can rollback erroneous changes

**Steps**:

1. Logout and login as `superadmin@test.com`
2. Navigate to `/dashboard/activities/audit`
3. Find the UPDATE log entry where salary changed to $70,000
4. Click "Rollback" button
5. Confirmation dialog appears showing:
   - Current state: $70,000
   - Will revert to: $65,000
   - Affected user: Test Employee
6. Enter rollback reason: "Salary increase entered in error"
7. Click "Confirm Rollback"
8. Wait for success notification
9. Navigate to employee detail page
10. Verify salary is now $65,000
11. Return to audit logs
12. Verify new log entry with `is_rollback = TRUE`

**Expected Result**:
- ✅ Salary reverted to $65,000
- ✅ Rollback logged as new audit entry
- ✅ Original employee notified of rollback

**If Failed**: Check `executeRollback` mutation, verify rollback logic in backend

---

### Test Scenario 5: Rollback Request Workflow (Admin → Super Admin) (7 minutes)

**Objective**: Verify admin can request rollback requiring super admin approval

**Steps**:

**Part A: Admin requests rollback**
1. Logout and login as `admin@test.com`
2. Navigate to `/dashboard/activities/audit`
3. Find a log entry (e.g., employee department change)
4. Click "Request Rollback" button (not "Rollback" - that's for super admins only)
5. Enter reason: "Employee assigned to wrong department"
6. Click "Submit Request"
7. Verify success notification

**Part B: Super admin approves**
1. Logout and login as `superadmin@test.com`
2. Navigate to `/dashboard/activities/audit`
3. Click "Pending Requests" tab
4. See the new rollback request from admin
5. Click "Review Request"
6. Review dialog shows:
   - Requesting admin: Admin User
   - Reason: "Employee assigned to wrong department"
   - Log details: department change from A → B
7. Click "Approve"
8. Enter optional review reason: "Approved - valid correction"
9. Confirm approval
10. Verify rollback executes automatically
11. Verify admin receives notification of approval

**Expected Result**:
- ✅ Admin can submit request but not execute
- ✅ Super admin sees pending request
- ✅ Approval triggers automatic rollback
- ✅ Both admin and employee notified

**If Failed**: Check `rollback_requests` table, verify approval mutation and notification service

---

### Test Scenario 6: Bulk Rollback with Progress Tracking (10 minutes)

**Objective**: Verify bulk rollback of multiple erroneous changes

**Steps**:

**Setup: Create multiple logs to rollback**
1. Login as `admin@test.com`
2. Create 5 test employees with intentional errors (wrong department)
3. Wait for audit logs to populate

**Execute bulk rollback**
1. Logout and login as `superadmin@test.com`
2. Navigate to `/dashboard/activities/audit`
3. Select checkboxes for the 5 CREATE log entries
4. Click "Bulk Rollback" button
5. Confirmation dialog shows:
   - 5 logs selected
   - Estimated time: 1-2 seconds
   - Will delete all 5 employees
6. Enter reason: "Batch import error - wrong department"
7. Click "Confirm Bulk Rollback"
8. Progress modal appears showing:
   - Progress bar: 0/5
   - Status: Processing...
9. Watch progress update in real-time via SSE
10. When complete, modal shows summary:
    - Successful: 5
    - Failed: 0
11. Verify employees are deleted
12. Verify 5 new rollback log entries created

**Expected Result**:
- ✅ All 5 rollbacks execute successfully
- ✅ Real-time progress updates via SSE
- ✅ Summary report shows 5/5 successful
- ✅ Each rollback logged individually

**If Failed**: Check bulk rollback batch processing, verify SSE endpoint, check batch size limit (100 max)

---

### Test Scenario 7: Conflict Detection & Resolution (8 minutes)

**Objective**: Verify system detects conflicts when rolling back modified resources

**Steps**:

**Setup: Create a conflict**
1. Login as `admin@test.com`
2. Update Test Employee salary: $65,000 → $70,000 (Log A)
3. Wait 1 minute
4. Update Test Employee salary again: $70,000 → $75,000 (Log B)

**Attempt rollback of older change**
1. Logout and login as `superadmin@test.com`
2. Navigate to `/dashboard/activities/audit`
3. Find Log A (the $65k → $70k change)
4. Click "Rollback" button
5. System detects conflict:
   - Current state: $75,000
   - Rollback target: $65,000
   - Conflict detected: salary field modified since original change
6. Modal displays three resolution options:
   - **Force**: Overwrite current $75k with $65k (destructive)
   - **Cancel**: Abort rollback, keep $75k
   - **Merge**: Manually review and decide (shows diff)
7. Select "Force" option
8. Confirm with additional warning
9. Verify salary reverted to $65,000
10. Verify rollback log includes conflict metadata

**Expected Result**:
- ✅ Conflict detected before rollback
- ✅ Three resolution strategies offered
- ✅ Force option works correctly
- ✅ Conflict details logged

**If Failed**: Check conflict detection logic (`jsonbDiff` function), verify resolution UI

---

### Test Scenario 8: Performance Validation (5 minutes)

**Objective**: Verify query performance meets <1 second target

**Steps**:

1. Seed database with 100,000 activity logs:
   ```bash
   npm run test:seed-audit-logs -- --count=100000
   ```
2. Login as `superadmin@test.com`
3. Navigate to `/dashboard/activities/audit`
4. Open browser DevTools → Network tab
5. Measure initial page load time
6. Apply filters:
   - Date range: Last 30 days
   - User: specific employee
   - Action: UPDATE only
7. Measure filtered query time
8. Sort by different columns
9. Test pagination (jump to page 50)

**Expected Result**:
- ✅ Initial load: <1 second (50 entries)
- ✅ Filtered query: <1 second
- ✅ Sorting: <500ms
- ✅ Pagination: <500ms

**If Failed**: Check database indexes, verify query plans with `EXPLAIN ANALYZE`, consider Redis caching

---

### Test Scenario 9: Logging Failure Handling (3 minutes)

**Objective**: Verify fail-safe retry mechanism blocks unlogged actions

**Steps**:

**Simulate logging failure**
1. Temporarily disable `activity_logs` table write access:
   ```sql
   REVOKE INSERT ON activity_logs FROM app_user;
   ```
2. Login as `admin@test.com`
3. Attempt to update an employee record
4. Observe retry attempts in network logs (100ms, 500ms, 2s delays)
5. After 3 failed retries, error message displays:
   "Action cancelled due to logging failure. Please try again."
6. Verify employee record was NOT updated
7. Restore table access:
   ```sql
   GRANT INSERT ON activity_logs TO app_user;
   ```
8. Retry the same update
9. Verify success

**Expected Result**:
- ✅ 3 retry attempts with exponential backoff
- ✅ Original action blocked after all retries fail
- ✅ Clear error message to user
- ✅ No partial state or unlogged changes

**If Failed**: Check retry logic in logging service, verify transaction rollback

---

## Smoke Test Checklist

Quick validation that core functionality works (5 minutes):

- [ ] Audit logs page loads without errors
- [ ] Can filter logs by date, user, action, resource type
- [ ] Super admin sees "Rollback" button on log entries
- [ ] Admin sees "Request Rollback" button (not "Rollback")
- [ ] Rollback button disabled for rollback log entries
- [ ] Bulk selection checkboxes work
- [ ] Bulk rollback button appears when multiple logs selected
- [ ] Pending Requests tab visible to super admin only
- [ ] All GraphQL queries return expected data structure
- [ ] RLS policies enforce correct access control

---

## Troubleshooting

### Issue: Audit logs not capturing

**Symptoms**: Actions complete but no logs appear
**Fixes**:
1. Check `activity_logs` table exists and has correct schema
2. Verify logging middleware is registered in `hooks.server.ts`
3. Check PostGraphile connection and permissions
4. Verify JWT contains correct `user_id` claim

### Issue: Rollback fails with "conflict detected"

**Symptoms**: Rollback blocked even when no conflict expected
**Fixes**:
1. Check `jsonbDiff` function logic
2. Verify snapshot structure matches current schema
3. Try "Force" resolution option
4. Check for schema changes since snapshot was captured

### Issue: Bulk rollback gets stuck at "in_progress"

**Symptoms**: Progress never reaches 100%, no completion event
**Fixes**:
1. Check background worker is running
2. Verify SSE endpoint is accessible
3. Check `bulk_rollback_batches` table for batch status
4. Look for errors in backend logs
5. Try canceling and resubmitting with fewer logs

### Issue: Performance <1s not met

**Symptoms**: Queries take >2 seconds
**Fixes**:
1. Run `ANALYZE activity_logs;` to update statistics
2. Check index usage with `EXPLAIN ANALYZE`
3. Verify indexes exist (see data-model.md)
4. Consider partitioning by month if >3 million entries
5. Enable Redis caching for filter dropdowns

---

## Success Criteria

All test scenarios above must pass for feature to be considered complete:

- [x] Scenario 1: Audit log capture
- [x] Scenario 2: Update logging with snapshots
- [x] Scenario 3: RBAC department scoping
- [x] Scenario 4: Single rollback
- [x] Scenario 5: Rollback request workflow
- [x] Scenario 6: Bulk rollback with progress
- [x] Scenario 7: Conflict detection
- [x] Scenario 8: Performance validation
- [x] Scenario 9: Logging failure handling

**Additional Validation**:
- [ ] All E2E tests pass
- [ ] Unit test coverage >90%
- [ ] No TypeScript compilation errors
- [ ] All constitutional gates passed
- [ ] Security audit approved
- [ ] Performance benchmarks met

---

## Next Steps After Quickstart

1. Run full E2E test suite: `npm run test:e2e`
2. Run performance benchmarks: `npm run test:perf`
3. Generate test coverage report: `npm run test:coverage`
4. Security scan: `npm run audit:security`
5. Ready for code review and merge

---

**Quickstart Last Updated**: 2025-10-02
**Feature Status**: Design complete, ready for implementation
