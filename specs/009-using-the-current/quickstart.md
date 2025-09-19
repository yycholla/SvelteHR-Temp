# Quickstart: HR Application Feature Expansion

## Overview

This quickstart guide validates the core HR management features by testing user scenarios from the feature specification. Each scenario represents a key business workflow that must function correctly.

## Prerequisites

### Database Setup

```bash
# Ensure PostgreSQL is running
PGPASSWORD=postgres123 psql -h localhost -U postgres -d hr_system -c "\dt"

# Apply HR feature migrations
PGPASSWORD=postgres123 psql -h localhost -U postgres -d hr_system -f migrations/20250119140000_hr_feature_extensions_fixed.sql

# Verify tables exist
PGPASSWORD=postgres123 psql -h localhost -U postgres -d hr_system -c "
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'hr_public'
ORDER BY tablename;"
```

### Application Setup

```bash
# Start development server
npm run dev

# Verify application is running
curl -f http://localhost:5173/dashboard || echo "App not running"

# Verify GraphQL endpoint
curl -f http://localhost:8080/graphql || echo "GraphQL not available"
```

## Test Scenarios

### Scenario 1: Employee Directory Access (FR-001)

**Given**: An HR administrator is logged in
**When**: They navigate to the employee directory
**Then**: They can view, search, and filter all employee profiles

#### Test Steps

1. **Navigate to Employee Directory**

   ```
   URL: http://localhost:5173/dashboard/employees/directory
   Expected: Page loads without 404 error
   Expected: Employee list displays with grid/list view options
   ```

2. **Search Functionality**

   ```
   Action: Enter "admin" in search box
   Expected: Results filtered to show matching employees
   Expected: Search includes name, email, and job title matches
   ```

3. **Filter by Role**

   ```
   Action: Select "Admin" from role filter dropdown
   Expected: Results show only admin users
   Expected: Filter persists during navigation
   ```

4. **Employee Profile View**
   ```
   Action: Click on an employee card/row
   Expected: Navigate to employee profile page
   Expected: Display contact information and organizational details
   ```

#### Success Criteria

- [ ] Directory page accessible at correct URL
- [ ] Search returns relevant results
- [ ] Role filtering works correctly
- [ ] Employee profiles display complete information
- [ ] Responsive design works on mobile

### Scenario 2: Leave Request Submission (FR-002)

**Given**: An employee wants to request time off
**When**: They access the leave management system
**Then**: They can view leave balance, submit requests, track approval status

#### Test Steps

1. **Access Leave Management**

   ```
   URL: http://localhost:5173/dashboard/leave/new
   Expected: Leave request form displays
   Expected: Available leave policies shown
   ```

2. **View Leave Balance**

   ```
   Action: Navigate to leave balance section
   Expected: Current year leave balances displayed
   Expected: Accrued, used, and available hours shown
   ```

3. **Submit Leave Request**

   ```
   Action: Fill out leave request form
   Fields: Leave type, start date, end date, reason
   Expected: Form validation works correctly
   Expected: Cannot request more than available balance
   ```

4. **Track Request Status**
   ```
   URL: http://localhost:5173/dashboard/leave/requests
   Expected: List of submitted requests with status
   Expected: Ability to cancel pending requests
   ```

#### Success Criteria

- [ ] Leave request form accessible and functional
- [ ] Leave balances display accurately
- [ ] Form validation prevents invalid submissions
- [ ] Request status tracking works correctly
- [ ] Email notifications sent for status changes

### Scenario 3: Attendance Tracking (FR-003)

**Given**: An employee needs to track daily attendance
**When**: They access attendance features
**Then**: They can clock in/out and view attendance history

#### Test Steps

1. **Clock In Process**

   ```
   URL: http://localhost:5173/dashboard/attendance/my
   Expected: Clock in button available if not clocked in
   Action: Click "Clock In" button
   Expected: Records current timestamp and location
   ```

2. **Attendance Status Display**

   ```
   Expected: Current status shows "Currently Working"
   Expected: Clock in time displayed
   Expected: Running timer or elapsed time shown
   ```

3. **Clock Out Process**

   ```
   Action: Click "Clock Out" button (after clocking in)
   Expected: Records clock out time
   Expected: Calculates total hours worked
   Expected: Status changes to "Day Complete"
   ```

4. **Attendance History**
   ```
   Expected: Table showing recent attendance records
   Expected: Date, clock in/out times, total hours
   Expected: Weekly summary statistics
   ```

#### Success Criteria

- [ ] Clock in/out functionality works correctly
- [ ] Timestamps recorded accurately
- [ ] Total hours calculated properly
- [ ] Attendance history displays correctly
- [ ] Geolocation captured for clock in/out

### Scenario 4: Department Management (FR-008)

**Given**: An HR administrator needs to manage departments
**When**: They access department management
**Then**: They can create, edit, and organize departments

#### Test Steps

1. **View Department List**

   ```
   URL: http://localhost:5173/dashboard/departments
   Expected: List of departments with hierarchy
   Expected: Budget information displayed
   Expected: Employee count per department
   ```

2. **Create New Department**

   ```
   URL: http://localhost:5173/dashboard/departments/new
   Expected: Department creation form
   Action: Fill in department name, description, budget
   Expected: Form validation and success message
   ```

3. **Department Hierarchy**

   ```
   Expected: Parent-child relationships displayed
   Expected: Sub-departments indented or nested
   Expected: Cannot create circular references
   ```

4. **Department Statistics**
   ```
   Expected: Total departments count
   Expected: Total budget across all departments
   Expected: Sub-department counts
   ```

#### Success Criteria

- [ ] Department list displays with proper hierarchy
- [ ] New department creation works correctly
- [ ] Budget tracking functions properly
- [ ] Parent-child relationships enforced
- [ ] Statistics calculated accurately

### Scenario 5: Performance Analytics Access (FR-005)

**Given**: A manager needs to review team performance
**When**: They access performance analytics
**Then**: They can view metrics, schedule reviews, generate reports

#### Test Steps

1. **Access Performance Dashboard**

   ```
   URL: http://localhost:5173/analytics/performance
   Expected: Performance analytics dashboard
   Expected: Team performance metrics displayed
   ```

2. **Individual Performance View**

   ```
   Action: Select team member from dropdown
   Expected: Individual performance data shown
   Expected: Goal progress and ratings displayed
   ```

3. **Performance Trends**

   ```
   Expected: Charts showing performance over time
   Expected: Comparison with team averages
   Expected: Goal completion rates
   ```

4. **Schedule Review**
   ```
   Action: Click "Schedule Review" button
   Expected: Review scheduling form
   Expected: Calendar integration for scheduling
   ```

#### Success Criteria

- [ ] Performance dashboard loads correctly
- [ ] Individual performance data accessible
- [ ] Trend analysis displays properly
- [ ] Review scheduling functions work
- [ ] Data visualization renders correctly

## Integration Tests

### Database Integration

```sql
-- Test data relationships
SELECT
  u.display_name,
  d.name as department,
  lr.status as leave_status,
  ar.total_hours as daily_hours
FROM hr_public.users u
LEFT JOIN hr_public.departments d ON u.department_id = d.id
LEFT JOIN hr_public.leave_requests lr ON lr.employee_id = u.id
LEFT JOIN hr_public.attendance_records ar ON ar.employee_id = u.id
WHERE u.is_active = true
LIMIT 5;
```

### GraphQL Integration

```bash
# Test GraphQL endpoint
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { allUsers { nodes { id displayName } } }"
  }'
```

### Authentication Integration

```bash
# Test protected routes
curl -f http://localhost:5173/dashboard/admin/users
# Should redirect to login if not authenticated
```

## Performance Validation

### Page Load Times

```bash
# Test key page performance
time curl -s http://localhost:5173/dashboard/employees/directory > /dev/null
time curl -s http://localhost:5173/dashboard/departments > /dev/null
time curl -s http://localhost:5173/dashboard/attendance/my > /dev/null
```

### GraphQL Query Performance

```graphql
# Test complex queries with timing
query GetEmployeeDirectoryWithRelations {
	allUsers(first: 100) {
		nodes {
			id
			displayName
			department {
				name
			}
			userRoleAssignmentsByUserId {
				nodes {
					userRoleByRoleId {
						name
					}
				}
			}
		}
	}
}
```

## Rollback Plan

### Database Rollback

```sql
-- If issues found, rollback HR schema extensions
DROP SCHEMA IF EXISTS hr_features CASCADE;
-- Restore from backup if needed
```

### Application Rollback

```bash
# Revert to previous working commit
git checkout HEAD~1
npm run dev
```

## Success Criteria Summary

### Functional Requirements Met

- [ ] FR-001: Employee directory with search and filtering
- [ ] FR-002: Leave request submission and tracking
- [ ] FR-003: Attendance clock in/out functionality
- [ ] FR-008: Department management with hierarchy
- [ ] FR-005: Performance analytics access

### Technical Requirements Met

- [ ] Page load times < 200ms
- [ ] GraphQL responses < 100ms
- [ ] Mobile responsive design
- [ ] Proper error handling
- [ ] Authentication and authorization

### User Experience Requirements Met

- [ ] Intuitive navigation between features
- [ ] Consistent UI patterns across pages
- [ ] Proper loading states and feedback
- [ ] Accessible design (keyboard navigation)
- [ ] Clear error messages and help text

## Troubleshooting

### Common Issues

1. **404 Errors on New Routes**
   - Check SvelteKit routing configuration
   - Verify file naming conventions (+page.svelte)
   - Ensure proper directory structure

2. **GraphQL Schema Errors**
   - Restart PostGraphile after schema changes
   - Check PostgreSQL permissions
   - Verify table exists in correct schema

3. **Authentication Issues**
   - Check JWT token validity
   - Verify user permissions in database
   - Test login flow independently

4. **Performance Issues**
   - Check database query execution plans
   - Verify indexes are properly created
   - Monitor network request waterfalls

### Support Contacts

- Database Issues: Check PostgreSQL logs
- Frontend Issues: Check browser console
- GraphQL Issues: Check PostGraphile logs
- General Questions: Review feature specification

---

**Completion Checklist**:

- [ ] All test scenarios pass
- [ ] Performance criteria met
- [ ] Integration tests successful
- [ ] Rollback plan verified
- [ ] Documentation updated
