# Employee Management Contract: PostGraphile HR System

## Contract Overview

This contract defines employee CRUD operations, role-based data access, and employee lifecycle management through PostGraphile GraphQL API.

## Employee Queries

### 1. Current Employee Profile

**GraphQL Query:**

```graphql
query CurrentEmployee {
	currentEmployee {
		id
		firstName
		lastName
		email
		departmentId
		roleLevel
		status
		hireDate
		fullName
		department {
			id
			name
			parentDepartment {
				id
				name
			}
		}
		manager {
			id
			firstName
			lastName
			email
		}
		compensation {
			baseSalary
			currency
			annualSalary
		}
	}
}
```

**Success Response Contract (Employee Role):**

```json
{
	"data": {
		"currentEmployee": {
			"id": 123,
			"firstName": "John",
			"lastName": "Doe",
			"email": "john.doe@company.com",
			"departmentId": 5,
			"roleLevel": 20,
			"status": "ACTIVE",
			"hireDate": "2023-01-15",
			"fullName": "John Doe",
			"department": {
				"id": 5,
				"name": "Engineering",
				"parentDepartment": {
					"id": 1,
					"name": "Technology"
				}
			},
			"manager": {
				"id": 456,
				"firstName": "Jane",
				"lastName": "Smith",
				"email": "jane.smith@company.com"
			},
			"compensation": {
				"baseSalary": 75000.0,
				"currency": "USD",
				"annualSalary": 75000.0
			}
		}
	}
}
```

### 2. Employee Directory (Role-Based Access)

**GraphQL Query:**

```graphql
query Employees($first: Int, $filter: EmployeeFilter, $orderBy: [EmployeesOrderBy!]) {
	employees(first: $first, filter: $filter, orderBy: $orderBy) {
		totalCount
		nodes {
			id
			firstName
			lastName
			email
			departmentId
			roleLevel
			status
			hireDate
			department {
				id
				name
			}
			manager {
				id
				firstName
				lastName
			}
		}
		pageInfo {
			hasNextPage
			hasPreviousPage
			startCursor
			endCursor
		}
	}
}
```

**Input Contract (Manager accessing department employees):**

```json
{
	"first": 50,
	"filter": {
		"status": "ACTIVE",
		"departmentId": 5
	},
	"orderBy": ["LAST_NAME_ASC", "FIRST_NAME_ASC"]
}
```

**Success Response Contract (Manager Role):**

```json
{
	"data": {
		"employees": {
			"totalCount": 12,
			"nodes": [
				{
					"id": 123,
					"firstName": "John",
					"lastName": "Doe",
					"email": "john.doe@company.com",
					"departmentId": 5,
					"roleLevel": 20,
					"status": "ACTIVE",
					"hireDate": "2023-01-15",
					"department": {
						"id": 5,
						"name": "Engineering"
					},
					"manager": {
						"id": 456,
						"firstName": "Jane",
						"lastName": "Smith"
					}
				}
			],
			"pageInfo": {
				"hasNextPage": false,
				"hasPreviousPage": false,
				"startCursor": "cursor123",
				"endCursor": "cursor135"
			}
		}
	}
}
```

### 3. Single Employee Details

**GraphQL Query:**

```graphql
query Employee($id: Int!) {
	employee(id: $id) {
		id
		firstName
		lastName
		email
		departmentId
		roleLevel
		status
		hireDate
		fullName
		directReports {
			id
			firstName
			lastName
			email
		}
		timeOffRequests(first: 5, filter: { status: PENDING }) {
			nodes {
				id
				requestType
				startDate
				endDate
				status
				canApprove
			}
		}
		performanceReviews(first: 3) {
			nodes {
				id
				reviewPeriod
				status
				overallRating
				canView
			}
		}
	}
}
```

## Employee Mutations

### 1. Create New Employee

**GraphQL Mutation:**

```graphql
mutation CreateEmployee($input: CreateEmployeeInput!) {
	createEmployee(input: $input) {
		employee {
			id
			firstName
			lastName
			email
			departmentId
			roleLevel
			status
			hireDate
		}
	}
}
```

**Input Contract:**

```json
{
	"input": {
		"firstName": "Alice",
		"lastName": "Johnson",
		"email": "alice.johnson@company.com",
		"departmentId": 5,
		"managerId": 456,
		"roleLevel": 20,
		"hireDate": "2025-02-01"
	}
}
```

**Success Response Contract:**

```json
{
	"data": {
		"createEmployee": {
			"employee": {
				"id": 789,
				"firstName": "Alice",
				"lastName": "Johnson",
				"email": "alice.johnson@company.com",
				"departmentId": 5,
				"roleLevel": 20,
				"status": "ACTIVE",
				"hireDate": "2025-02-01"
			}
		}
	}
}
```

### 2. Update Employee Information

**GraphQL Mutation:**

```graphql
mutation UpdateEmployee($input: UpdateEmployeeInput!) {
	updateEmployee(input: $input) {
		employee {
			id
			firstName
			lastName
			email
			departmentId
			managerId
		}
	}
}
```

**Input Contract:**

```json
{
	"input": {
		"id": 123,
		"firstName": "John",
		"lastName": "Smith",
		"departmentId": 6,
		"managerId": 789
	}
}
```

### 3. Update Employee Role

**GraphQL Mutation:**

```graphql
mutation UpdateEmployeeRole($input: UpdateEmployeeRoleInput!) {
	updateEmployeeRole(input: $input) {
		employee {
			id
			roleLevel
		}
		roleChangeAudit {
			employeeId
			oldRoleLevel
			newRoleLevel
			changedBy
			reason
			effectiveDate
		}
	}
}
```

**Input Contract:**

```json
{
	"input": {
		"employeeId": 123,
		"newRoleLevel": 60,
		"effectiveDate": "2025-02-01",
		"reason": "Promotion to Senior Developer"
	}
}
```

### 4. Terminate Employee

**GraphQL Mutation:**

```graphql
mutation TerminateEmployee($input: TerminateEmployeeInput!) {
	terminateEmployee(input: $input) {
		employee {
			id
			status
		}
		terminationAudit {
			employeeId
			terminationDate
			reason
			terminatedBy
			finalPayDate
		}
	}
}
```

**Input Contract:**

```json
{
	"input": {
		"employeeId": 123,
		"terminationDate": "2025-01-31",
		"reason": "Voluntary resignation",
		"finalPayDate": "2025-01-31"
	}
}
```

## Row-Level Security Access Patterns

### Employee Self-Access (Role: hr_employee)

- **Read**: Own employee record only
- **Update**: Own contact information and non-sensitive fields only
- **Compensation**: Can view own salary information
- **Time Off**: Can view/create own requests
- **Performance Reviews**: Can view own reviews (completed only)

### Manager Department Access (Role: hr_manager)

- **Read**: All employees in managed department(s)
- **Update**: Direct reports' information (excluding salary)
- **Compensation**: Cannot view salary information
- **Time Off**: Can approve/reject department requests
- **Performance Reviews**: Can create/update reviews for direct reports

### HR Admin Full Access (Role: hr_admin)

- **Read**: All employee records across all departments
- **Update**: All employee information including sensitive data
- **Compensation**: Full salary management capabilities
- **Time Off**: Can manage all requests across organization
- **Performance Reviews**: Can view/create/update all reviews

### Super Admin Complete Access (Role: hr_super_admin)

- **All Operations**: Complete CRUD access to all data
- **System Management**: Can create/delete employees, modify roles
- **Audit Access**: Can view all audit trails and system logs

## Data Validation Rules

### Employee Creation Validation

- **Email**: Must be unique across all employees
- **Department**: Must exist and be active
- **Manager**: Must be in same or parent department
- **Role Level**: Must be valid level (20, 60, 80, 100)
- **Hire Date**: Cannot be future date

### Employee Update Validation

- **Email Changes**: Must remain unique
- **Department Transfers**: Manager approval required for cross-department moves
- **Role Changes**: Must go through formal role change process
- **Status Changes**: Follow proper employment lifecycle

### Business Logic Constraints

- **Manager Hierarchy**: Employee cannot be their own manager (direct/indirect)
- **Department Integrity**: Manager must have appropriate role level for department
- **Role Consistency**: Role level must align with PostgreSQL role grants
- **Termination Logic**: Cannot delete employee records, only deactivate

## Error Handling

### Validation Errors

```json
{
	"errors": [
		{
			"message": "Email address already exists",
			"extensions": {
				"code": "DUPLICATE_EMAIL",
				"field": "email",
				"value": "john.doe@company.com"
			}
		}
	]
}
```

### Permission Errors

```json
{
	"errors": [
		{
			"message": "Cannot access employee from different department",
			"extensions": {
				"code": "DEPARTMENT_ACCESS_DENIED",
				"employeeId": 999,
				"requestedBy": 123
			}
		}
	]
}
```

### Business Logic Errors

```json
{
	"errors": [
		{
			"message": "Cannot create circular management hierarchy",
			"extensions": {
				"code": "CIRCULAR_HIERARCHY",
				"employeeId": 123,
				"managerId": 456
			}
		}
	]
}
```

## PostgreSQL Function Integration

### Database Functions Called

```sql
-- Employee lifecycle
hr_public.create_employee(employee_data jsonb) → employees
hr_public.update_employee_role(employee_id int, new_role int, reason text) → role_change_audit
hr_public.terminate_employee(employee_id int, termination_data jsonb) → termination_audit

-- Computed fields
hr_public.employee_full_name(employees) → text
hr_public.employee_direct_reports(employees) → employees[]
hr_public.employee_can_access(viewer_id int, target_id int) → boolean

-- Validation functions
hr_private.validate_email_unique(email text, exclude_id int) → boolean
hr_private.validate_manager_hierarchy(employee_id int, manager_id int) → boolean
hr_private.validate_department_access(user_id int, department_id int) → boolean
```

### Audit Trail Functions

```sql
-- Automatic audit logging
hr_private.log_employee_change(employee_id int, changes jsonb, changed_by int) → audit_log
hr_private.log_role_change(employee_id int, old_role int, new_role int, reason text) → role_change_audit
hr_private.log_termination(employee_id int, termination_data jsonb) → termination_audit
```

## Performance Requirements

### Query Performance Targets

- Employee directory (50 records): <200ms
- Single employee lookup: <100ms
- Employee creation: <500ms
- Employee updates: <300ms
- Role changes: <1000ms (includes audit logging)

### Caching Strategy

- Employee directory: 5 minutes TTL
- Individual profiles: 1 minute TTL
- Department employee lists: 5 minutes TTL
- Salary information: No caching (real-time)
- Audit logs: No caching (compliance requirement)

### Database Optimization

```sql
-- Critical indexes for employee operations
CREATE INDEX idx_employees_email ON hr_public.employees(email);
CREATE INDEX idx_employees_department_status ON hr_public.employees(department_id, status);
CREATE INDEX idx_employees_manager_id ON hr_public.employees(manager_id);
CREATE INDEX idx_employees_role_level ON hr_public.employees(role_level);
CREATE INDEX idx_employees_hire_date ON hr_public.employees(hire_date);

-- Composite index for common manager queries
CREATE INDEX idx_employees_dept_role_status ON hr_public.employees(department_id, role_level, status);
```

This contract ensures employee management operations maintain proper security, performance, and data integrity while providing the flexibility needed for complex HR workflows.
