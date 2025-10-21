# Quickstart Guide: Database Schema Optimization Testing

**Feature**: 029-let-s-optimize | **Branch**: `029-let-s-optimize` | **Date**: 2025-10-10

## Overview

This quickstart guide provides manual verification steps for testing the database schema optimizations introduced in Feature 029. The guide is organized by priority phase (P0-P4) and covers all 80+ functional requirements.

## Prerequisites

Before starting verification:

```bash
# 1. Ensure you're on the feature branch
git checkout 029-let-s-optimize

# 2. Rebuild database with new migrations
npm run db:rebuild

# 3. Verify schema snapshot
npm run db:verify

# 4. Start development server with Doppler
npm run dev

# 5. Access application at http://localhost:5173
# Login with: admin@mountainhr.dev / admin123
```

## Test Environment Setup

**Database State Required**:
- At least 10 test users with varying roles (admin, manager, employee)
- 3-5 departments with hierarchical structure
- Sample performance reviews, goals, leave requests
- Test events with attendees and RSVP statuses

**Seed Script** (run if needed):
```bash
# Run seed script to populate test data
npm run db:seed
```

---

## Phase P0: Critical Hotfix Testing

### Test Case P0.1: Event Attendees Reminder Time (PRODUCTION BUG FIX)

**Objective**: Verify `event_attendees.reminder_time` field exists and prevents crashes

**Prerequisites**:
- Create test event with 3+ attendees
- Navigate to events page

**Steps**:

1. **Verify Field Exists in Database**:
   ```sql
   -- Run in PostgreSQL client
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_schema = 'hr_public'
     AND table_name = 'event_attendees'
     AND column_name = 'reminder_time';
   ```
   **Expected**: Returns 1 row with `reminder_time` as `integer` type

2. **Test Frontend Query**:
   - Navigate to `/events` page
   - **Expected**: Page loads without GraphQL errors
   - Check browser console for errors
   - **Expected**: No "Unknown field 'reminderTime'" errors

3. **Test RSVP with Reminder**:
   - Click on an event
   - RSVP to event with "Accept" status
   - Set reminder time to "15 minutes before"
   - Click "Save RSVP"
   - **Expected**: RSVP saved successfully, reminder time stored

4. **Verify GraphQL Query**:
   ```graphql
   query GetEventAttendees($eventId: UUID!) {
     eventAttendees(filter: { eventId: { equalTo: $eventId } }) {
       nodes {
         id
         userId
         rsvpStatus
         reminderTime  # This field should not error
       }
     }
   }
   ```
   **Expected**: Query executes without errors, `reminderTime` field returns integer or null

5. **Test Notification Scheduling**:
   - Create event 30 minutes in the future
   - RSVP with 15-minute reminder
   - Wait 15 minutes (or mock time in tests)
   - **Expected**: Notification appears 15 minutes before event start

**Success Criteria**:
- ✅ Events page loads without crashes
- ✅ `reminderTime` field queryable via GraphQL
- ✅ RSVP with reminder saves successfully
- ✅ Reminders trigger at correct times

---

## Phase P1: Core Schema Testing

### Test Case P1.1: User Manager Hierarchy

**Objective**: Verify `users.manager_id` field and organizational hierarchy

**Steps**:

1. **Verify Field Exists**:
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_schema = 'hr_public'
     AND table_name = 'users'
     AND column_name = 'manager_id';
   ```
   **Expected**: Returns 1 row with `manager_id` as `uuid` type

2. **Test Manager Assignment**:
   - Navigate to user profile edit page
   - Select "Manager" dropdown
   - Choose a manager from the list
   - Click "Save"
   - **Expected**: Manager assignment saved successfully

3. **Test Circular Reference Prevention**:
   - Try to assign User A as manager of User B
   - Then try to assign User B as manager of User A
   - **Expected**: Second assignment should fail with validation error
   - Error message: "Cannot create circular manager relationship"

4. **Test Reporting Chain Query**:
   ```graphql
   query GetReportingChain($userId: UUID!) {
     user(id: $userId) {
       id
       firstName
       lastName
       manager {
         id
         firstName
         lastName
         manager {
           id
           firstName
           lastName
         }
       }
     }
   }
   ```
   **Expected**: Returns nested manager hierarchy up to CEO (null manager)

5. **Test Direct Reports**:
   - Navigate to manager's profile
   - View "Direct Reports" section
   - **Expected**: Shows all employees where `manager_id = <manager_id>`
   - Count matches database query result

**Success Criteria**:
- ✅ Manager assignment works via UI
- ✅ Circular reference validation prevents invalid assignments
- ✅ Reporting chain query returns correct hierarchy
- ✅ Direct reports displayed accurately

### Test Case P1.2: User Profile Fields (job_title, avatar_url, date_of_birth)

**Objective**: Verify new user profile fields are queryable and updatable

**Steps**:

1. **Verify Fields Exist**:
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_schema = 'hr_public'
     AND table_name = 'users'
     AND column_name IN ('job_title', 'avatar_url', 'date_of_birth');
   ```
   **Expected**: Returns 3 rows with correct types (varchar, varchar, date)

2. **Test Job Title Update**:
   - Navigate to user profile edit page
   - Update "Job Title" field to "Senior Software Engineer"
   - Click "Save"
   - **Expected**: Job title updated successfully
   - Verify via GraphQL query or database

3. **Test Avatar Upload**:
   - Click "Change Avatar" button
   - Upload image file (JPEG/PNG, <10MB)
   - **Expected**: Image uploaded to CDN, `avatar_url` field updated
   - Verify avatar displayed in profile header

4. **Test Date of Birth (PII Encryption)**:
   - Update "Date of Birth" field to "1990-05-15"
   - Click "Save"
   - **Expected**: Date saved successfully
   - Check database directly:
     ```sql
     SELECT date_of_birth FROM hr_public.users WHERE id = '<user_id>';
     ```
   - **Expected**: Value is encrypted (not plaintext "1990-05-15")

5. **Test Profile Display**:
   - Navigate to employee directory
   - Click on employee card
   - **Expected**: Job title and avatar displayed correctly
   - Date of birth shown in formatted text (e.g., "May 15, 1990")

**Success Criteria**:
- ✅ All 3 fields updatable via UI
- ✅ Avatar upload works and URL stored correctly
- ✅ Date of birth encrypted at application level
- ✅ Fields displayed correctly in profile views

### Test Case P1.3: Department Co-Managers (manager_ids Array)

**Objective**: Verify `departments.manager_ids` array field and co-manager support

**Steps**:

1. **Verify Field Exists**:
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_schema = 'hr_public'
     AND table_name = 'departments'
     AND column_name = 'manager_ids';
   ```
   **Expected**: Returns 1 row with type `uuid[]` (array)

2. **Test Data Migration**:
   ```sql
   -- Verify data migrated from manager_id to manager_ids
   SELECT
     id,
     name,
     manager_id,
     manager_ids,
     CASE
       WHEN manager_id IS NOT NULL AND manager_ids IS NULL THEN 'MIGRATION NEEDED'
       WHEN manager_id IS NOT NULL AND manager_ids = ARRAY[manager_id] THEN 'MIGRATED'
       ELSE 'OK'
     END as migration_status
   FROM hr_public.departments;
   ```
   **Expected**: All rows show "MIGRATED" or "OK", no "MIGRATION NEEDED"

3. **Test Co-Manager Assignment**:
   - Navigate to department edit page
   - Add 2 managers to "Managers" multi-select field
   - Click "Save"
   - **Expected**: Both managers saved to `manager_ids` array

4. **Test Co-Manager Removal**:
   - Remove 1 manager from the list
   - Click "Save"
   - **Expected**: Remaining manager still in array
   - Validation: Cannot remove last manager

5. **Test GraphQL Query**:
   ```graphql
   query GetDepartmentManagers($deptId: UUID!) {
     department(id: $deptId) {
       id
       name
       managerIds
       managers {
         id
         firstName
         lastName
       }
     }
   }
   ```
   **Expected**: `managerIds` returns UUID array, `managers` returns resolved user objects

**Success Criteria**:
- ✅ Data migrated from single `manager_id` to `manager_ids` array
- ✅ Multiple managers assignable to department
- ✅ Validation prevents removing last manager
- ✅ GraphQL resolves `managers` field correctly

---

## Phase P2: Feature Tables Testing

### Test Case P2.1: Employee Skills Table

**Objective**: Verify `employee_skills` table creation and CRUD operations

**Steps**:

1. **Verify Table Exists**:
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'hr_public'
     AND table_name = 'employee_skills';
   ```
   **Expected**: Returns 1 row

2. **Test Skill Creation**:
   - Navigate to employee profile → Skills tab
   - Click "Add Skill"
   - Enter skill name: "PostgreSQL"
   - Set proficiency level: 4 (1-5 scale)
   - Enter years experience: 5
   - Click "Save"
   - **Expected**: Skill added successfully

3. **Test Proficiency Validation**:
   - Try to create skill with proficiency level 6
   - **Expected**: Validation error - "Proficiency must be between 1-5"

4. **Test Skill Endorsement**:
   - Log in as different user (colleague)
   - Navigate to employee's profile
   - Click "Endorse" on a skill
   - **Expected**: User ID added to `endorsed_by` array
   - Endorsement count increases

5. **Test Self-Endorsement Prevention**:
   - Try to endorse own skill
   - **Expected**: Validation error - "Cannot endorse your own skills"

6. **Test Skill Search**:
   - Navigate to "Skills Directory" page
   - Search for "PostgreSQL"
   - **Expected**: Returns all employees with PostgreSQL skill
   - Sorted by proficiency level DESC

7. **Test GraphQL Queries**:
   ```graphql
   query GetEmployeeSkills($userId: UUID!) {
     employeeSkills(filter: { userId: { equalTo: $userId } }) {
       nodes {
         skillName
         proficiencyLevel
         endorsedBy
         yearsExperience
         lastUsedDate
       }
     }
   }
   ```
   **Expected**: Returns all skills for user with endorsement counts

**Success Criteria**:
- ✅ Skills table created with proper constraints
- ✅ CRUD operations work via UI
- ✅ Proficiency validation enforced
- ✅ Endorsement system functional
- ✅ Skills searchable across organization

### Test Case P2.2: Employee Certifications Table

**Objective**: Verify `employee_certifications` table and expiry tracking

**Steps**:

1. **Verify Table Exists**:
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'hr_public'
     AND table_name = 'employee_certifications';
   ```
   **Expected**: Returns 1 row

2. **Test Certification Creation**:
   - Navigate to employee profile → Certifications tab
   - Click "Add Certification"
   - Enter certification name: "AWS Certified Solutions Architect"
   - Issuer: "Amazon Web Services"
   - Issued date: "2023-06-01"
   - Expiry date: "2026-06-01"
   - Credential ID: "AWS-12345"
   - Verification URL: "https://aws.amazon.com/verification/AWS-12345"
   - Click "Save"
   - **Expected**: Certification added successfully

3. **Test Expiry Date Validation**:
   - Try to create certification with `expiryDate < issuedDate`
   - **Expected**: Validation error - "Expiry date must be after issued date"

4. **Test Certification Status Calculation**:
   - Query certification with expiry in 25 days
   - **Expected**: Status = "EXPIRING_SOON"
   - Query certification with expiry in past
   - **Expected**: Status = "EXPIRED"
   - Query certification with null expiry
   - **Expected**: Status = "PERMANENT"

5. **Test Expiring Certifications Report**:
   - Navigate to HR Reports → Certifications
   - Filter by "Expiring within 30 days"
   - **Expected**: Shows all certifications expiring soon
   - Includes employee names and expiry dates

6. **Test Certification Renewal**:
   - Click "Renew" on expired certification
   - Enter new expiry date: "2027-06-01"
   - Click "Save"
   - **Expected**: Expiry date updated, status changed to "ACTIVE"

7. **Test GraphQL Queries**:
   ```graphql
   query GetExpiringCertifications($daysThreshold: Int!) {
     expiringCertifications(daysThreshold: $daysThreshold) {
       nodes {
         certificationName
         issuer
         expiryDate
         status
         daysUntilExpiry
         user {
           firstName
           lastName
         }
       }
     }
   }
   ```
   **Expected**: Returns certifications expiring within threshold

**Success Criteria**:
- ✅ Certifications table created with constraints
- ✅ Expiry date validation enforced
- ✅ Status calculation works correctly
- ✅ Expiring certifications report accurate
- ✅ Renewal process functional

### Test Case P2.3: Performance Reviews Expanded Ratings

**Objective**: Verify 6 new rating categories in `performance_reviews` table

**Steps**:

1. **Verify Fields Exist**:
   ```sql
   SELECT column_name
   FROM information_schema.columns
   WHERE table_schema = 'hr_public'
     AND table_name = 'performance_reviews'
     AND column_name IN (
       'technical_skills_rating',
       'communication_rating',
       'teamwork_rating',
       'leadership_rating',
       'problem_solving_rating',
       'initiative_rating'
     );
   ```
   **Expected**: Returns 6 rows

2. **Test Review Creation with Ratings**:
   - Navigate to HR → Performance Reviews
   - Click "Create Review"
   - Select employee and review period
   - Enter ratings for all 6 categories (1-5 scale)
   - Enter overall rating
   - Click "Save as Draft"
   - **Expected**: Review created with all ratings stored

3. **Test Rating Validation**:
   - Try to enter rating of 6 in any category
   - **Expected**: Validation error - "Rating must be between 1-5"

4. **Test Average Rating Calculation**:
   - Create review with ratings: [5, 4, 4, 3, 5, 4]
   - **Expected**: Average = (5+4+4+3+5+4) / 6 = 4.17
   - Verify in UI or GraphQL query

5. **Test Rating Breakdown Display**:
   - Navigate to employee's performance history
   - View completed review
   - **Expected**: Radar chart or bar chart shows all 6 categories
   - Hover tooltips show category names and scores

6. **Test Performance Trends**:
   - Create multiple reviews over time for same employee
   - Navigate to "Performance Trends" page
   - **Expected**: Line chart shows rating trends by category
   - Identifies improvement or decline areas

7. **Test GraphQL Queries**:
   ```graphql
   query GetPerformanceReview($reviewId: UUID!) {
     performanceReview(id: $reviewId) {
       ratingBreakdown {
         technicalSkills
         communication
         teamwork
         leadership
         problemSolving
         initiative
         overall
         average
       }
     }
   }
   ```
   **Expected**: Returns all rating categories with calculated average

**Success Criteria**:
- ✅ All 6 rating fields added to schema
- ✅ Rating validation enforced (1-5 range)
- ✅ Average rating calculated correctly
- ✅ Rating breakdown displayed in UI
- ✅ Performance trends visualized

---

## Phase P3: Enhancements Testing

### Test Case P3.1: Department Hierarchy Fields

**Objective**: Verify `departments.parent_dept_id` and hierarchy fields

**Steps**:

1. **Verify Fields Exist**:
   ```sql
   SELECT column_name
   FROM information_schema.columns
   WHERE table_schema = 'hr_public'
     AND table_name = 'departments'
     AND column_name IN ('parent_dept_id', 'hierarchy_level', 'hierarchy_path');
   ```
   **Expected**: Returns 3 rows

2. **Test Parent Department Assignment**:
   - Create top-level department: "Engineering"
   - Create child department: "Backend Team"
   - Set parent_dept_id of "Backend Team" to "Engineering"
   - **Expected**: Hierarchy created successfully

3. **Test Circular Reference Prevention**:
   - Try to set "Engineering" parent to "Backend Team" (its child)
   - **Expected**: Validation error - "Cannot create circular hierarchy"

4. **Test Hierarchy Level Calculation**:
   ```sql
   -- Create 3-level hierarchy
   -- Level 0: Engineering
   -- Level 1: Backend Team (parent: Engineering)
   -- Level 2: API Services (parent: Backend Team)

   SELECT name, hierarchy_level
   FROM hr_public.departments
   ORDER BY hierarchy_level;
   ```
   **Expected**: Engineering (0), Backend Team (1), API Services (2)

5. **Test Hierarchy Path**:
   - Query "API Services" department
   - **Expected**: `hierarchy_path = ["Engineering", "Backend Team", "API Services"]`

6. **Test Org Chart Display**:
   - Navigate to "Organization Chart" page
   - **Expected**: Departments displayed in tree structure
   - Expandable/collapsible nodes
   - Shows employee counts per department

**Success Criteria**:
- ✅ Parent department assignable
- ✅ Circular reference validation works
- ✅ Hierarchy level calculated correctly
- ✅ Hierarchy path accurate
- ✅ Org chart visualization functional

### Test Case P3.2: Leave Request Review Tracking

**Objective**: Verify `leave_requests.reviewed_by` and `reviewed_at` fields

**Steps**:

1. **Verify Fields Exist**:
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_schema = 'hr_public'
     AND table_name = 'leave_requests'
     AND column_name IN ('reviewed_by', 'reviewed_at');
   ```
   **Expected**: Returns 2 rows (uuid, timestamptz)

2. **Test Leave Request Approval**:
   - Log in as employee
   - Create leave request for 3 days
   - Submit request
   - Log out, log in as manager
   - Navigate to "Pending Leave Requests"
   - Approve the request
   - **Expected**: `reviewed_by` = manager's user ID, `reviewed_at` = current timestamp

3. **Test Reviewer Display**:
   - Navigate to employee's leave history
   - View approved request
   - **Expected**: Shows "Reviewed by: [Manager Name] on [Date]"

4. **Test GraphQL Query**:
   ```graphql
   query GetLeaveRequest($requestId: UUID!) {
     leaveRequest(id: $requestId) {
       status
       reviewedBy
       reviewedAt
       reviewer {
         firstName
         lastName
       }
     }
   }
   ```
   **Expected**: Returns reviewer details for approved/rejected requests

**Success Criteria**:
- ✅ Reviewer and timestamp recorded on approval/rejection
- ✅ Reviewer information displayed in UI
- ✅ GraphQL resolver works for `reviewer` field

---

## Phase P4: Materialized Views Testing

### Test Case P4.1: Department Metrics Materialized View

**Objective**: Verify `department_metrics` materialized view for performance

**Steps**:

1. **Verify View Exists**:
   ```sql
   SELECT matviewname
   FROM pg_matviews
   WHERE schemaname = 'hr_public'
     AND matviewname = 'department_metrics';
   ```
   **Expected**: Returns 1 row

2. **Test View Query Performance**:
   ```sql
   -- Time the query
   \timing on
   SELECT * FROM hr_public.department_metrics;
   ```
   **Expected**: Query executes in <50ms (vs. 500ms+ for raw aggregation)

3. **Test Data Accuracy**:
   ```sql
   -- Compare materialized view with live aggregation
   SELECT
     d.id,
     d.name,
     COUNT(u.id) FILTER (WHERE u.is_active) as live_employee_count,
     dm.active_employee_count as cached_employee_count
   FROM hr_public.departments d
   LEFT JOIN hr_public.users u ON u.department_id = d.id
   LEFT JOIN hr_public.department_metrics dm ON dm.department_id = d.id
   GROUP BY d.id, d.name, dm.active_employee_count;
   ```
   **Expected**: `live_employee_count` matches `cached_employee_count`

4. **Test Manual Refresh**:
   - Add new employee to department
   - Run refresh mutation:
     ```graphql
     mutation {
       refreshDepartmentMetrics {
         success
         viewsRefreshed
         duration
       }
     }
     ```
   - **Expected**: View refreshed, new employee count reflected

5. **Test Staleness Detection**:
   ```sql
   SELECT
     department_name,
     last_refreshed_at,
     NOW() - last_refreshed_at as cache_age
   FROM hr_public.department_metrics
   WHERE (NOW() - last_refreshed_at) > INTERVAL '24 hours';
   ```
   **Expected**: Returns departments with stale cache (>24 hours old)

6. **Test Dashboard Integration**:
   - Navigate to dashboard
   - View "Department Overview" widget
   - **Expected**: Data loaded from materialized view
   - Shows employee counts, average salaries, task counts
   - Load time <200ms

**Success Criteria**:
- ✅ Materialized view created with unique index
- ✅ Query performance <50ms
- ✅ Data accuracy matches live aggregation
- ✅ Manual refresh works
- ✅ Dashboard integration successful

### Test Case P4.2: All Materialized Views Refresh Schedule

**Objective**: Verify scheduled refresh of all 4 materialized views

**Steps**:

1. **Verify All Views Exist**:
   ```sql
   SELECT matviewname
   FROM pg_matviews
   WHERE schemaname = 'hr_public'
     AND matviewname IN (
       'department_metrics',
       'goal_statistics',
       'report_analytics',
       'dashboard_summaries'
     );
   ```
   **Expected**: Returns 4 rows

2. **Test Bulk Refresh**:
   ```graphql
   mutation {
     refreshAllMaterializedViews {
       success
       viewsRefreshed
       refreshedAt
       duration
       errors
     }
   }
   ```
   **Expected**: All 4 views refreshed concurrently, duration <5 seconds

3. **Test Concurrent Refresh** (PostgreSQL CONCURRENTLY option):
   ```sql
   -- Verify no table locks during refresh
   REFRESH MATERIALIZED VIEW CONCURRENTLY hr_public.department_metrics;
   ```
   **Expected**: Refresh completes without blocking SELECT queries

4. **Monitor Refresh Performance**:
   - Track refresh duration over time
   - **Expected**: Duration remains stable as data grows
   - Alert if duration exceeds 10 seconds

**Success Criteria**:
- ✅ All 4 materialized views refreshable
- ✅ Concurrent refresh prevents query blocking
- ✅ Bulk refresh mutation works
- ✅ Performance monitoring in place

---

## Integration Testing

### Test Case INT-1: End-to-End Manager Hierarchy Workflow

**Objective**: Test complete manager hierarchy with reporting chain and direct reports

**Scenario**:
1. Create organizational structure:
   - CEO (no manager)
   - VP Engineering (manager: CEO)
   - Engineering Manager (manager: VP Engineering)
   - Senior Engineer (manager: Engineering Manager)
   - Junior Engineer (manager: Engineering Manager)

2. Verify reporting chain for Junior Engineer:
   - **Expected**: [Engineering Manager, VP Engineering, CEO]

3. Verify direct reports for Engineering Manager:
   - **Expected**: [Senior Engineer, Junior Engineer]

4. Test performance review assignment:
   - Engineering Manager creates review for Junior Engineer
   - **Expected**: Review created with all 6 rating categories

5. Test goal assignment:
   - Junior Engineer creates goal
   - Engineering Manager approves goal
   - **Expected**: Goal linked to correct manager hierarchy

**Success Criteria**:
- ✅ Complete hierarchy established
- ✅ Reporting chains accurate
- ✅ Reviews flow through hierarchy
- ✅ Goals tracked by management chain

### Test Case INT-2: Department Co-Manager Permissions

**Objective**: Test RBAC with multiple department managers

**Scenario**:
1. Assign 2 co-managers to "Engineering" department
2. Both managers should have:
   - Read access to all department employees
   - Approve leave requests for department
   - Create performance reviews for department
   - View department metrics

3. Verify permissions:
   - Manager A approves leave request
   - Manager B creates performance review
   - Both can view department metrics
   - Non-managers cannot access manager functions

**Success Criteria**:
- ✅ Co-managers have equal permissions
- ✅ RBAC policies enforce department scoping
- ✅ Non-managers denied access

### Test Case INT-3: Skills & Certifications Career Development

**Objective**: Test complete career development workflow

**Scenario**:
1. Employee adds 5 skills with proficiency levels
2. Colleagues endorse 3 of the skills
3. Employee adds 2 certifications (1 active, 1 expiring)
4. Manager conducts performance review:
   - References employee skills in review notes
   - Rates technical_skills_rating based on skill proficiency
   - Sets goal to obtain new certification

5. Employee completes certification
6. Next review shows improved technical_skills_rating

**Success Criteria**:
- ✅ Skills and certifications tracked
- ✅ Performance reviews reference skills
- ✅ Career progression visible over time

---

## Performance Validation

### Test Case PERF-1: Materialized View Performance

**Objective**: Verify materialized views meet <200ms p95 query latency

**Steps**:

1. **Baseline Performance Test**:
   ```sql
   -- Without materialized view
   EXPLAIN ANALYZE
   SELECT
     d.id,
     COUNT(u.id) FILTER (WHERE u.is_active) as active_employees,
     AVG(cr.salary_amount) as avg_salary
   FROM hr_public.departments d
   LEFT JOIN hr_public.users u ON u.department_id = d.id
   LEFT JOIN hr_private.compensation_records cr ON cr.employee_id = u.id
   GROUP BY d.id;
   ```
   **Expected**: Execution time >500ms (without indexes)

2. **Materialized View Performance**:
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM hr_public.department_metrics;
   ```
   **Expected**: Execution time <50ms

3. **GraphQL Query Performance**:
   - Measure p95 latency for dashboard GraphQL query
   - **Expected**: <200ms for full dashboard load

**Success Criteria**:
- ✅ Materialized views 10x faster than live aggregation
- ✅ GraphQL p95 latency <200ms
- ✅ Dashboard loads in <2 seconds

### Test Case PERF-2: Index Effectiveness

**Objective**: Verify composite indexes improve query performance

**Steps**:

1. **Test Composite Index on task_assignees**:
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM hr_public.task_assignees
   WHERE task_id = '<uuid>' AND user_id = '<uuid>';
   ```
   **Expected**: Uses index `idx_task_assignees_task_user`, scan time <5ms

2. **Test Full-Text Search Index**:
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM hr_public.users
   WHERE to_tsvector('english', first_name || ' ' || last_name)
   @@ to_tsquery('english', 'John');
   ```
   **Expected**: Uses GIN index, scan time <10ms

**Success Criteria**:
- ✅ All composite indexes used by query planner
- ✅ Full-text search <10ms for employee search

---

## Rollback Testing

### Test Case ROLLBACK-1: Safe Schema Rollback

**Objective**: Verify migrations can be safely rolled back

**Steps**:

1. **Record Current Schema State**:
   ```bash
   npm run db:snapshot
   ```

2. **Apply All Feature 029 Migrations**:
   ```bash
   npm run db:migrate
   ```

3. **Rollback Migrations**:
   ```bash
   npm run db:rollback
   ```

4. **Verify Schema Restored**:
   ```bash
   npm run db:verify
   ```
   **Expected**: Schema matches pre-migration snapshot

5. **Test Application Still Works**:
   - Start dev server
   - Navigate to major pages
   - **Expected**: No errors, old schema works

**Success Criteria**:
- ✅ Rollback completes without errors
- ✅ Schema matches baseline
- ✅ Application functional on old schema

---

## Acceptance Criteria Summary

**Feature 029 is considered complete when:**

- [ ] **P0 Hotfix**: Event attendees reminder_time field exists, events page loads without crashes
- [ ] **P1 Core Schema**: Manager hierarchy functional, profile fields queryable, department co-managers work
- [ ] **P2 Feature Tables**: Skills and certifications CRUD works, performance review ratings expanded
- [ ] **P3 Enhancements**: Department hierarchy functional, leave review tracking works
- [ ] **P4 Performance**: All 4 materialized views created, query performance <200ms p95
- [ ] **Integration**: End-to-end workflows complete without errors
- [ ] **Performance**: Dashboard loads <2 seconds, materialized views 10x faster than live queries
- [ ] **Rollback**: Migrations safely reversible without data loss

**Sign-off Required**:
- [ ] QA testing complete (all test cases pass)
- [ ] Performance benchmarks met
- [ ] Security review complete (PII encryption verified)
- [ ] Product owner approval
- [ ] Deployment plan reviewed

---

## Troubleshooting

**Common Issues**:

1. **Migration fails with "column already exists"**:
   - **Solution**: Migrations use `IF NOT EXISTS` - check for manual schema changes

2. **GraphQL schema not updating**:
   - **Solution**: Restart PostGraphile server to regenerate schema

3. **Materialized view data stale**:
   - **Solution**: Run manual refresh mutation or check cron schedule

4. **Performance slower than expected**:
   - **Solution**: Run `ANALYZE` on tables, check index usage with `EXPLAIN`

5. **Circular reference errors**:
   - **Solution**: Application-level validation prevents cycles, check before assignment

**Logs to Check**:
- PostgreSQL logs: `/var/log/postgresql/`
- Application logs: Console output from `npm run dev`
- Migration logs: Output from `npm run db:migrate`

**Support**:
- Database admin: Check schema with `psql` client
- Frontend issues: Check browser console for GraphQL errors
- Backend issues: Check PostGraphile server logs
