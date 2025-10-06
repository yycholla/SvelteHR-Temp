# Quickstart Guide: Performance Reviews Creation

**Feature**: Performance Reviews Creation with Goals Integration
**Branch**: `023-reviews-creation-it`
**Date**: 2025-10-06

## Purpose

This quickstart guide validates the entire performance reviews feature through end-to-end testing scenarios. It covers admin and manager workflows, goal management, draft persistence, and RBAC enforcement.

## Prerequisites

### Environment Setup

```bash
# Ensure you're on the feature branch
git checkout 023-reviews-creation-it

# Install dependencies
npm install

# Start development servers
docker compose -f docker-compose.dev.yml up -d  # PostgreSQL + PostGraphile
npm run dev                                      # SvelteKit dev server

# Verify services
curl http://localhost:8080/graphql  # PostGraphile health check
curl http://localhost:5173          # SvelteKit health check
```

### Test Data

```sql
-- Create test users (run in PostgreSQL)
INSERT INTO users (id, email, first_name, last_name, role, manager_id) VALUES
  ('admin-uuid', 'admin@test.com', 'Admin', 'User', 'admin', NULL),
  ('manager-uuid', 'manager@test.com', 'Manager', 'User', 'manager', NULL),
  ('employee1-uuid', 'employee1@test.com', 'Employee', 'One', 'employee', 'manager-uuid'),
  ('employee2-uuid', 'employee2@test.com', 'Employee', 'Two', 'employee', NULL);

-- Create test goal for employee1
INSERT INTO goals (id, employee_id, title, description, target_completion_date, success_metrics, status) VALUES
  ('goal1-uuid', 'employee1-uuid', 'Complete Q1 Training', 'Finish all onboarding modules', '2025-03-31', 'All modules completed', 'active');
```

## Test Scenarios

### Scenario 1: Admin Creates Annual Review with New Goal

**User Story**: As an administrator, I need to create an annual review for any employee with a new performance goal.

**Steps**:

1. **Login as Admin**
   ```bash
   # Navigate to login page
   open http://localhost:5173/login

   # Credentials: admin@test.com / password
   ```

2. **Navigate to Employee Profile**
   ```bash
   # Go to employee1 profile
   open http://localhost:5173/dashboard/employees/employee1-uuid
   ```

3. **Click "Start Performance Review" Button**
   - Button should be visible on employee profile page
   - Click to open review creation dialog

4. **Fill Out Review Form**
   - **Review Type**: Select "Annual Review" from dropdown
   - **Review Period**: Start: 2025-01-01, End: 2025-12-31
   - **Goals**: Click "Create New Goal" tab
     - **Title**: "Improve Code Quality"
     - **Description**: "Reduce bug rate by 30%"
     - **Target Date**: 2025-12-31
     - **Success Metrics**: "Bug rate drops from 10% to 7%"
   - **Notes**: "First annual review - focus on code quality"

5. **Save as Draft**
   - Click "Save as Draft" button
   - Should see success toast notification
   - Dialog should close

6. **Verify Draft Saved**
   ```bash
   # Navigate to reviews management page
   open http://localhost:5173/dashboard/reviews

   # Should see draft review in list with:
   # - Employee: Employee One
   # - Type: Annual Review
   # - Status: Draft badge
   ```

**Expected Results**:
- ✅ Review created with status "draft"
- ✅ New goal created and linked to review
- ✅ Goal appears in employee's goal list
- ✅ Activity log records review creation (audit trail)
- ✅ Draft review visible in management page

**Validation Queries**:

```sql
-- Check review was created
SELECT * FROM performance_reviews WHERE employee_id = 'employee1-uuid';

-- Check goal was created and linked
SELECT g.*, rg.review_id
FROM goals g
JOIN review_goals rg ON g.id = rg.goal_id
WHERE g.employee_id = 'employee1-uuid' AND g.title = 'Improve Code Quality';

-- Check audit log
SELECT * FROM activity_logs
WHERE resource_type = 'performance_reviews'
ORDER BY created_at DESC LIMIT 1;
```

---

### Scenario 2: Manager Creates Quarterly Review for Direct Report

**User Story**: As a manager, I need to create a quarterly review for my direct report with an existing goal.

**Steps**:

1. **Login as Manager**
   ```bash
   # Navigate to login page
   open http://localhost:5173/login

   # Credentials: manager@test.com / password
   ```

2. **Navigate to Direct Report's Employee Page**
   ```bash
   # Go to employee1 profile (direct report)
   open http://localhost:5173/dashboard/employees/employee1-uuid
   ```

3. **Click "Start Review" Button**
   - Button should be visible (employee1 is direct report)

4. **Fill Out Review Form**
   - **Review Type**: Select "Quarterly Review"
   - **Review Period**: Start: 2025-01-01, End: 2025-03-31
   - **Goals**: Click "Link Existing Goals" tab
     - Check "Complete Q1 Training" (existing goal)
   - **Notes**: "Q1 check-in"

5. **Submit Review (Not Draft)**
   - Click "Create Review" button (final submission)
   - Review status should be "in_progress"

6. **Verify Review Created**
   ```bash
   # Navigate to reviews management page
   open http://localhost:5173/dashboard/reviews
   ```

**Expected Results**:
- ✅ Review created with status "in_progress"
- ✅ Existing goal linked to review
- ✅ Review visible in manager's reviews list
- ✅ Employee can see their own review

**Validation Queries**:

```sql
-- Check review was created by manager
SELECT * FROM performance_reviews
WHERE employee_id = 'employee1-uuid'
  AND reviewer_id = 'manager-uuid'
  AND review_type = 'quarterly_review';
```

---

### Scenario 3: Manager Cannot Create Review for Non-Direct Report

**User Story**: As a manager, I should not be able to create reviews for employees who don't report to me.

**Steps**:

1. **Login as Manager** (manager@test.com)

2. **Navigate to Non-Direct Report's Employee Page**
   ```bash
   # Go to employee2 profile (NOT a direct report - manager_id is NULL)
   open http://localhost:5173/dashboard/employees/employee2-uuid
   ```

3. **Verify Button Not Visible**
   - "Start Review" button should NOT be visible
   - Page should not show review creation option

4. **Attempt Direct URL Access** (Security Test)
   ```bash
   # Try to access review creation directly
   open http://localhost:5173/dashboard/reviews/create?employeeId=employee2-uuid
   ```

**Expected Results**:
- ✅ "Start Review" button not visible for non-direct reports
- ✅ Direct URL access returns 403 Forbidden
- ✅ Error message: "You can only create reviews for your direct reports"
- ✅ No review created in database

---

### Scenario 4: Draft Resume Across Sessions

**User Story**: As an administrator, I need to resume editing a draft review after navigating away.

**Steps**:

1. **Login as Admin**

2. **Start Creating a Review**
   - Navigate to employee2 profile
   - Click "Start Performance Review"
   - Fill in partial data:
     - Review Type: "Mid-Year Review"
     - Review Period Start: 2025-06-01
     - (Leave notes empty)
   - Click "Save as Draft"

3. **Navigate Away**
   ```bash
   # Go to dashboard
   open http://localhost:5173/dashboard
   ```

4. **Return to Draft**
   ```bash
   # Go to reviews management page
   open http://localhost:5173/dashboard/reviews

   # Click "Edit" on the draft review
   ```

5. **Verify Data Restored**
   - Review Type should be "Mid-Year Review"
   - Review Period Start should be "2025-06-01"
   - Can continue editing and add notes
   - Click "Save as Draft" again

6. **Complete the Review**
   - Fill in remaining fields
   - Click "Create Review" (final submission)
   - Status changes to "in_progress"

**Expected Results**:
- ✅ Draft data persisted across sessions
- ✅ All form fields restored exactly as saved
- ✅ Can update draft multiple times
- ✅ Final submission changes status from draft → in_progress

---

### Scenario 5: Duplicate Active Review Prevention

**User Story**: The system should prevent creating duplicate active reviews of the same type for the same employee.

**Steps**:

1. **Login as Admin**

2. **Create First Annual Review**
   - Navigate to employee1 profile
   - Create Annual Review with status "draft"
   - Submit successfully

3. **Attempt Second Annual Review**
   - Navigate to employee1 profile again
   - Click "Start Performance Review"
   - Select "Annual Review" (same type)
   - Fill in data and click "Create Review"

4. **Verify Error**
   - Should see error toast notification
   - Error message: "Active Annual Review already exists for this employee. Complete it before creating a new one."
   - Dialog should remain open (not submitted)

5. **Complete First Review**
   - Go to existing draft Annual Review
   - Update status to "completed"
   - Set completed_at timestamp

6. **Create New Annual Review (Should Succeed)**
   - Navigate to employee1 profile again
   - Click "Start Performance Review"
   - Select "Annual Review" (same type)
   - Submit successfully (previous review is completed)

**Expected Results**:
- ✅ Duplicate active reviews blocked
- ✅ Clear error message displayed
- ✅ After completing first review, can create new review of same type
- ✅ Database partial unique index enforces constraint

**Validation Queries**:

```sql
-- Should only see one active Annual Review at a time
SELECT * FROM performance_reviews
WHERE employee_id = 'employee1-uuid'
  AND review_type = 'annual_review'
  AND status IN ('draft', 'in_progress');
```

---

### Scenario 6: Soft Delete Goal Preservation

**User Story**: When a goal linked to a review is deleted, it should be soft-deleted and remain visible in the review.

**Steps**:

1. **Login as Admin**

2. **Create Review with Goal**
   - Create Quarterly Review for employee1
   - Link existing goal "Complete Q1 Training"
   - Submit review

3. **Delete the Goal**
   ```bash
   # Navigate to employee1's goals page
   open http://localhost:5173/dashboard/employees/employee1-uuid/goals

   # Click delete on "Complete Q1 Training" goal
   ```

4. **Verify Soft Delete**
   - Goal should have "deleted" badge
   - Goal should NOT appear in active goals list
   - Goal should NOT be selectable for new reviews

5. **Check Review Still Shows Goal**
   ```bash
   # Navigate to the Quarterly Review
   open http://localhost:5173/dashboard/reviews/{review-id}
   ```

6. **Verify Goal Visible in Review**
   - Goal "Complete Q1 Training" should still be visible
   - Should have "DELETED" indicator/badge next to it
   - Goal data (title, description, metrics) should be preserved

**Expected Results**:
- ✅ Goal soft-deleted (deleted = TRUE)
- ✅ Goal removed from active goals list
- ✅ Goal remains visible in associated reviews
- ✅ "DELETED" indicator displayed
- ✅ All goal data preserved for historical context

**Validation Queries**:

```sql
-- Check goal is soft-deleted
SELECT * FROM goals WHERE id = 'goal1-uuid';
-- Should have: deleted = TRUE, deleted_at = <timestamp>

-- Check goal still linked to review
SELECT * FROM review_goals WHERE goal_id = 'goal1-uuid';
-- Association should still exist

-- Check goal NOT in active list
SELECT * FROM goals WHERE employee_id = 'employee1-uuid' AND deleted = FALSE;
-- Should not include deleted goal
```

---

### Scenario 7: All 10 Review Types Available

**User Story**: The system should support all 10 review types with clear descriptions.

**Steps**:

1. **Login as Admin**

2. **Open Review Creation Dialog**
   - Navigate to any employee profile
   - Click "Start Performance Review"

3. **Check Review Type Dropdown**
   - Click on "Review Type" dropdown
   - Verify all 10 types are listed:
     1. Annual Review
     2. Mid-Year Review
     3. Quarterly Review
     4. Probationary Review
     5. Performance Improvement Plan (PIP)
     6. 90-Day Review
     7. Project-Based Review
     8. Promotion Review
     9. Exit Review
     10. Self-Review

4. **Verify Descriptions**
   - Hover over each review type
   - Should see tooltip/description explaining the purpose

5. **Create Reviews of Different Types**
   - Create one review of each type for different employees
   - Verify all types can be created successfully

**Expected Results**:
- ✅ All 10 review types available in dropdown
- ✅ Each type has clear purpose description
- ✅ Review types displayed in logical order
- ✅ Can successfully create reviews of all types

---

### Scenario 8: Performance and Responsiveness

**User Story**: The review creation process should be fast and responsive.

**Steps**:

1. **Login as Admin**

2. **Measure Review Creation Time**
   - Open browser DevTools (Network tab)
   - Navigate to employee profile
   - Click "Start Performance Review"
   - Fill in data and submit
   - Measure GraphQL mutation response time

3. **Test Draft Auto-Save**
   - Open review creation dialog
   - Fill in review type
   - Wait 3 seconds without touching form
   - Check Network tab for auto-save request

4. **Test with Many Goals**
   - Create an employee with 20 existing goals
   - Open review creation for that employee
   - Switch to "Link Existing Goals" tab
   - Measure load time for goal list

**Expected Results**:
- ✅ GraphQL mutation completes in <200ms
- ✅ Draft auto-save triggers after 3 seconds of inactivity
- ✅ Goal list loads in <500ms even with 20+ goals
- ✅ UI remains responsive during all operations
- ✅ No janky/laggy form interactions

**Performance Thresholds**:
- Create review mutation: <200ms
- Draft auto-save: 3-second debounce
- Goal list query: <500ms
- Page load time: <1 second

---

## Success Criteria

All scenarios must pass:

- [x] Scenario 1: Admin creates review with new goal
- [x] Scenario 2: Manager creates review for direct report
- [x] Scenario 3: Manager blocked from non-direct report
- [x] Scenario 4: Draft resume across sessions
- [x] Scenario 5: Duplicate active review prevention
- [x] Scenario 6: Soft delete goal preservation
- [x] Scenario 7: All 10 review types available
- [x] Scenario 8: Performance and responsiveness

## Troubleshooting

### Review Creation Fails

```bash
# Check PostgreSQL logs
docker compose -f docker-compose.dev.yml logs postgres

# Check PostGraphile logs
docker compose -f docker-compose.dev.yml logs backend-dev

# Check RLS policies are enabled
psql -U postgres -d svelteHR -c "\
  SELECT tablename, policies \
  FROM pg_policies \
  WHERE tablename IN ('performance_reviews', 'goals', 'review_goals');"
```

### "Not Authorized" Errors

```bash
# Verify JWT token is valid
# Check browser devtools → Application → Cookies → hr_token

# Verify user has correct role
psql -U postgres -d svelteHR -c "\
  SELECT id, email, role FROM users WHERE email = 'admin@test.com';"
```

### Draft Auto-Save Not Working

```bash
# Check browser console for JavaScript errors
# Verify debounce timer is set correctly

# Check database for draft reviews
psql -U postgres -d svelteHR -c "\
  SELECT * FROM performance_reviews WHERE status = 'draft';"
```

---

## Cleanup

```bash
# Remove test data
psql -U postgres -d svelteHR -c "\
  DELETE FROM review_goals WHERE review_id IN ( \
    SELECT id FROM performance_reviews WHERE employee_id IN ('employee1-uuid', 'employee2-uuid') \
  ); \
  DELETE FROM performance_reviews WHERE employee_id IN ('employee1-uuid', 'employee2-uuid'); \
  DELETE FROM goals WHERE employee_id IN ('employee1-uuid', 'employee2-uuid'); \
  DELETE FROM users WHERE email LIKE '%@test.com';"
```

---

**Quickstart Complete**: All 8 test scenarios documented with clear steps, expected results, and validation queries. Ready for Phase 2 task planning.
