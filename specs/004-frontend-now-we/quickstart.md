# Quickstart Guide: Role-Based HR Management Frontend

**Feature**: 004-frontend-now-we  
**Phase**: 1 (Design & Contracts)  
**Created**: 2025-09-09

## Overview

This quickstart guide provides step-by-step validation scenarios for the role-based HR management frontend. Each scenario corresponds to functional requirements and user stories defined in the feature specification.

## Prerequisites

- SvelteHR application running on http://localhost:5173
- MountainHR backend running on http://localhost:8080
- Test user accounts with different roles (Employee, Manager, HR_Manager, Admin)
- Valid authentication tokens for each role

## Test User Accounts

```
Admin User:
- Email: admin@company.com
- Password: admin123
- Roles: Admin
- Permissions: * (all permissions)

HR Manager:
- Email: hr.manager@company.com
- Password: hrmanager123
- Roles: HR_Manager
- Permissions: employees:*, departments:*, reports:hr

Manager:
- Email: manager@company.com
- Password: manager123
- Roles: Manager
- Permissions: employees:read, department_employees:*, reports:team

Employee:
- Email: employee@company.com
- Password: employee123
- Roles: Employee
- Permissions: profile:read, profile:update, timesheet:*
```

## User Story Validation Scenarios

### Scenario 1: Employee Access Validation (FR-001, FR-006)

**Story**: As an employee, I want to access only my personal information and general company data I'm authorized to view.

**Validation Steps**:

1. **Login as Employee**
   ```
   Navigate to: http://localhost:5173/login
   Enter credentials: employee@company.com / employee123
   Expected: Successful login, redirect to employee dashboard
   ```

2. **Verify Employee Dashboard Access**
   ```
   Navigate to: http://localhost:5173/dashboard
   Expected: Dashboard with employee-specific widgets:
   - Personal information widget
   - Leave balance widget
   - Timesheet widget
   - No HR management options visible
   ```

3. **Access Own Profile**
   ```
   Navigate to: http://localhost:5173/profile
   Expected: Employee can view and edit own profile information
   Form fields: name, email, phone, emergency contact
   ```

4. **Attempt HR Section Access**
   ```
   Navigate to: http://localhost:5173/hr/employees
   Expected: 403 Forbidden error or redirect with "Insufficient permissions" message
   ```

5. **Attempt Admin Section Access**
   ```
   Navigate to: http://localhost:5173/admin/users
   Expected: 403 Forbidden error or redirect with "Administrator access required" message
   ```

**Success Criteria**:
- ✅ Employee can access own dashboard and profile
- ✅ Employee cannot access HR or Admin sections
- ✅ Navigation menu shows only employee-appropriate options
- ✅ All data displayed is limited to employee's own information

---

### Scenario 2: HR Manager Access Validation (FR-001, FR-007)

**Story**: As an HR manager, I want to manage employee records, approve requests, and generate HR analytics.

**Validation Steps**:

1. **Login as HR Manager**
   ```
   Navigate to: http://localhost:5173/login
   Enter credentials: hr.manager@company.com / hrmanager123
   Expected: Successful login, redirect to HR dashboard
   ```

2. **Verify HR Dashboard Access**
   ```
   Navigate to: http://localhost:5173/dashboard
   Expected: Dashboard with HR-specific widgets:
   - Employee summary widget (total, active, on leave)
   - Department distribution chart
   - Pending approvals widget
   - Recent HR activities
   ```

3. **Access Employee Management**
   ```
   Navigate to: http://localhost:5173/hr/employees
   Expected: Employee list with pagination
   Features: Search, filter by department/status, bulk actions
   Data: Full employee information (name, email, department, position, hire date)
   ```

4. **View Individual Employee Details**
   ```
   Click on any employee in the list
   Navigate to: http://localhost:5173/hr/employees/{employeeId}
   Expected: Detailed employee view with:
   - Personal information (with RBAC restrictions)
   - Employment details
   - Performance data (if authorized)
   - Edit capabilities
   ```

5. **Access Department Management**
   ```
   Navigate to: http://localhost:5173/hr/departments
   Expected: Department list with management capabilities
   Features: Add/edit departments, assign managers, view employee counts
   ```

6. **Access HR Analytics**
   ```
   Navigate to: http://localhost:5173/hr/analytics
   Expected: Custom query interface with:
   - My Queries section
   - Shared Queries section
   - Create New Query button
   - Data source options: employees, departments, analytics, reports
   ```

7. **Create Custom Query**
   ```
   Click "Create New Query"
   Fill form:
   - Name: "Department Headcount Analysis"
   - Data Source: employees
   - Fields: department, count
   - Aggregation: count
   - Group By: department
   - Visualization: bar_chart
   Expected: Query created successfully, can execute and view results
   ```

8. **Attempt Admin Section Access**
   ```
   Navigate to: http://localhost:5173/admin/users
   Expected: 403 Forbidden error with "Administrator access required"
   ```

**Success Criteria**:
- ✅ HR Manager can access all HR management functions
- ✅ Employee data displayed with appropriate RBAC filtering
- ✅ Custom query creation and execution works correctly
- ✅ Charts and visualizations render properly (D3.js/Chart.js)
- ✅ Cannot access Admin-only functions

---

### Scenario 3: Administrator Access Validation (FR-001, FR-008)

**Story**: As an administrator, I want access to all system functions including user role management and system configuration.

**Validation Steps**:

1. **Login as Administrator**
   ```
   Navigate to: http://localhost:5173/login
   Enter credentials: admin@company.com / admin123
   Expected: Successful login, redirect to admin dashboard
   ```

2. **Verify Admin Dashboard Access**
   ```
   Navigate to: http://localhost:5173/dashboard
   Expected: Dashboard with admin-specific widgets:
   - System overview widget
   - User activity metrics
   - System health indicators
   - Security alerts
   - All HR widgets (inherited permissions)
   ```

3. **Access User Management**
   ```
   Navigate to: http://localhost:5173/admin/users
   Expected: User management interface with:
   - User list with roles and permissions
   - Add/edit/deactivate user capabilities
   - Role assignment interface
   - Permission management
   ```

4. **Access Role Management**
   ```
   Navigate to: http://localhost:5173/admin/roles
   Expected: RBAC configuration interface with:
   - Role hierarchy display
   - Permission assignment matrix
   - Create/edit/delete roles
   - Permission inheritance visualization
   ```

5. **Access System Configuration**
   ```
   Navigate to: http://localhost:5173/admin/system
   Expected: System administration panel with:
   - Application settings
   - Security configuration
   - Audit logs
   - System monitoring
   ```

6. **Verify Full HR Access**
   ```
   Navigate to: http://localhost:5173/hr/employees
   Expected: Full employee management with no restrictions
   Can access all employee data, all departments, all analytics
   ```

**Success Criteria**:
- ✅ Admin can access all system areas without restrictions
- ✅ User and role management functions work correctly
- ✅ System configuration options are available
- ✅ Inherits all HR Manager capabilities
- ✅ Navigation shows all available sections

---

### Scenario 4: Custom Query and Visualization (FR-003, FR-012)

**Story**: As an authorized user, I want to create custom reports and visualizations to analyze HR data.

**Validation Steps**:

1. **Login as HR Manager**
   ```
   Use HR Manager credentials from Scenario 2
   ```

2. **Navigate to Analytics Dashboard**
   ```
   Navigate to: http://localhost:5173/hr/analytics
   Expected: Analytics interface loads successfully
   ```

3. **Create Table Visualization**
   ```
   Click "Create New Query"
   Configuration:
   - Name: "Active Employees by Department"
   - Data Source: employees
   - Fields: full_name, department, position, hire_date
   - Filters: status = "Active"
   - Visualization: table
   - Sorting: hire_date DESC
   Expected: Query created, execution shows paginated table
   ```

4. **Create Bar Chart Visualization**
   ```
   Create new query:
   - Name: "Department Distribution"
   - Data Source: employees
   - Fields: department, count
   - Aggregation: count
   - Group By: department
   - Visualization: bar_chart
   Expected: Query execution shows interactive bar chart (Chart.js)
   ```

5. **Create Line Chart Visualization**
   ```
   Create new query:
   - Name: "Hiring Trends"
   - Data Source: employees
   - Fields: hire_date, count
   - Aggregation: count
   - Group By: month(hire_date)
   - Visualization: line_chart
   Expected: Query execution shows time-series line chart
   ```

6. **Create Pie Chart Visualization**
   ```
   Create new query:
   - Name: "Status Distribution"
   - Data Source: employees
   - Fields: status, count
   - Aggregation: count
   - Group By: status
   - Visualization: pie_chart
   Expected: Query execution shows pie chart with status breakdown
   ```

7. **Test Advanced Filtering**
   ```
   Create query with multiple filters:
   - Department: Engineering OR Marketing
   - Hire Date: >= 2023-01-01
   - Status: Active
   Expected: Results filtered correctly, count matches expectations
   ```

8. **Test Query Sharing**
   ```
   Create shared query:
   - Name: "Company Overview"
   - Set is_shared: true
   - Allowed roles: HR_Manager, Admin
   Expected: Query appears in shared queries for authorized users
   ```

**Success Criteria**:
- ✅ All visualization types render correctly
- ✅ Filtering and aggregation work as expected
- ✅ Charts are interactive and responsive
- ✅ Query sharing respects RBAC permissions
- ✅ Data updates reflect in real-time

---

### Scenario 5: RBAC Security Validation (FR-002, FR-005)

**Story**: The system must enforce role-based access control preventing users from accessing data beyond their authorization level.

**Validation Steps**:

1. **Test Token Security**
   ```
   Open browser developer tools
   Check Application/Storage tabs
   Expected: No JWT tokens visible in localStorage or sessionStorage
   All authentication handled via secure cookies
   ```

2. **Test Direct URL Access**
   ```
   Login as Employee, then manually navigate to:
   - http://localhost:5173/hr/employees
   - http://localhost:5173/admin/users
   Expected: 403 Forbidden or redirect to login with appropriate error
   ```

3. **Test API Endpoint Security**
   ```
   Using browser console or API testing tool:
   Try accessing: GET /api/v2/employees without Bearer token
   Expected: 401 Unauthorized response
   ```

4. **Test Cross-Role Data Access**
   ```
   Login as Manager, attempt to:
   - Access employees outside their department
   - Modify admin-level settings
   - Execute queries on restricted data sources
   Expected: 403 Forbidden responses, filtered data sets
   ```

5. **Test Session Expiration**
   ```
   Login and wait for token expiration (or manually invalidate)
   Attempt to navigate to protected pages
   Expected: Automatic redirect to login page
   Token cookies cleared automatically
   ```

6. **Test CSRF Protection**
   ```
   Attempt to submit forms without proper CSRF tokens
   Expected: 403 CSRF verification failed
   ```

**Success Criteria**:
- ✅ No client-side token exposure
- ✅ All protected routes require proper authentication
- ✅ API endpoints enforce Bearer token authentication
- ✅ Data filtering works correctly per user permissions
- ✅ Session management handles expiration gracefully
- ✅ CSRF protection prevents unauthorized form submissions

---

### Scenario 6: Navigation and User Experience (FR-009)

**Story**: The system must provide intuitive navigation between different data views and management pages.

**Validation Steps**:

1. **Test Responsive Navigation**
   ```
   Login with different roles and verify:
   - Navigation menu adapts to user permissions
   - Mobile responsive design works correctly
   - Breadcrumb navigation shows current location
   ```

2. **Test Search and Filtering**
   ```
   In employee management:
   - Use search box to find employees by name
   - Filter by department using dropdown
   - Filter by status (Active/Inactive)
   - Combine multiple filters
   Expected: Real-time filtering, clear filter indicators
   ```

3. **Test Pagination and Performance**
   ```
   Load large employee lists:
   - Navigate through multiple pages
   - Change page size (10, 20, 50 items)
   - Test pagination controls
   Expected: Fast page loads, smooth navigation
   ```

4. **Test Error Handling**
   ```
   Trigger various error conditions:
   - Network connectivity issues
   - Invalid form submissions
   - Authorization errors
   Expected: User-friendly error messages, recovery options
   ```

5. **Test Loading States**
   ```
   Monitor page loads and API calls:
   Expected: Loading spinners, skeleton screens, progress indicators
   No blank pages or hanging states
   ```

**Success Criteria**:
- ✅ Intuitive navigation for all user types
- ✅ Responsive design works on desktop and mobile
- ✅ Search and filtering provide good user experience
- ✅ Performance is acceptable (< 2s page loads)
- ✅ Error handling is graceful and informative

---

## Performance Validation

### Load Testing Scenarios

1. **Dashboard Load Performance**
   ```
   Measure time to first contentful paint
   Target: < 1 second for initial dashboard load
   ```

2. **Employee List Performance**
   ```
   Load 1000+ employee records with pagination
   Target: < 2 seconds per page
   ```

3. **Query Execution Performance**
   ```
   Execute complex queries with aggregations
   Target: < 5 seconds for query execution
   ```

4. **Visualization Rendering**
   ```
   Render charts with 100+ data points
   Target: < 1 second for chart rendering
   ```

## Security Validation Checklist

- [ ] No JWT tokens in client-side storage
- [ ] All API calls use Bearer authentication
- [ ] RBAC enforced on all protected routes
- [ ] Data filtering applied server-side
- [ ] CSRF protection enabled
- [ ] XSS prevention via template escaping
- [ ] Input validation on all forms
- [ ] Secure cookie configuration
- [ ] Session timeout handling
- [ ] Audit logging for sensitive operations

## Browser Compatibility

Test all scenarios across:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS Safari, Android Chrome)

## Accessibility Validation

- [ ] Keyboard navigation works throughout application
- [ ] Screen reader compatibility (ARIA labels)
- [ ] Color contrast meets WCAG standards
- [ ] Focus indicators visible and logical
- [ ] Form labels properly associated
- [ ] Error messages announced to screen readers

## Success Criteria Summary

The frontend implementation is considered successful when:

1. **Functional Requirements Met**:
   - All user stories validate successfully
   - RBAC enforcement works as specified
   - Custom queries and visualizations function correctly
   - Navigation and UX meet usability standards

2. **Performance Targets Achieved**:
   - Page load times < 2 seconds
   - Query execution < 5 seconds
   - Chart rendering < 1 second
   - Smooth 60fps animations

3. **Security Standards Met**:
   - No client-side token exposure
   - Server-side RBAC enforcement
   - All security validation checks pass
   - Audit logging captures sensitive operations

4. **Quality Standards Met**:
   - Cross-browser compatibility
   - Mobile responsiveness
   - Accessibility compliance
   - Error handling and recovery

## Troubleshooting Common Issues

### Authentication Issues
```
Problem: Login redirects in a loop
Solution: Check cookie domain configuration and CORS settings
```

### Permission Denied Errors
```
Problem: 403 errors for valid user actions
Solution: Verify role permissions in backend, check token validity
```

### Chart Rendering Issues
```
Problem: Charts not displaying or rendering incorrectly
Solution: Check D3.js/Chart.js versions, verify data format
```

### Performance Issues
```
Problem: Slow page loads or query execution
Solution: Check database indexes, optimize GraphQL queries, enable caching
```

---

**Next Steps**: After all validation scenarios pass, proceed to Phase 2 (Task Generation) using the `/tasks` command to create detailed implementation tasks.