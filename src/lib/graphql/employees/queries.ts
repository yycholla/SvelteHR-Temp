import { gql } from '@urql/svelte';

/**
 * Query: Get all users (employees) with pagination
 * Backend: Rust idiomatic - users(limit, offset) returns direct array
 *
 * @deprecated This GraphQL query is deprecated for employee list views.
 * Use EmployeeService.getEmployees() instead for employee CRUD operations.
 * See: docs/architecture/employee-module-migration.md
 * Migration: Task 21 (Week 4) - Employee list view migrated to domain service
 *
 * This query is still used for:
 * - Document upload employee selection
 * - Other modules that reference employees (not yet migrated)
 */
export const GET_EMPLOYEES_QUERY = gql`
	query GetEmployees($limit: Int = 20, $offset: Int = 0) {
		users(limit: $limit, offset: $offset) {
			id
			email
			displayName
			firstName
			lastName
			fullName
			role
			phone
			jobTitle
			departmentId
			managerId
			hireDate
			terminationDate
			isActive
			status
			createdAt
			updatedAt
			department {
				id
				name
				description
			}
			manager {
				id
				fullName
				displayName
				email
			}
		}
	}
`;

/**
 * Query: Get single user (employee) by ID
 * Backend: Rust idiomatic - user(id) not userById
 *
 * @deprecated This GraphQL query is deprecated for employee detail views.
 * Use EmployeeService.getEmployeeById() instead for employee CRUD operations.
 * See: docs/architecture/employee-module-migration.md
 * Migration: Task 16 (Week 4) - Employee detail view migrated to domain service
 *
 * This query may still be used in other modules (goals, reviews, etc.) for
 * employee reference lookups. Those will migrate when their modules adopt domain services.
 */
export const GET_EMPLOYEE_BY_ID_QUERY = gql`
	query GetEmployeeById($id: UUID!) {
		user(id: $id) {
			id
			email
			displayName
			firstName
			lastName
			fullName
			role
			phone
			jobTitle
			departmentId
			managerId
			hireDate
			terminationDate
			isActive
			status
			createdAt
			updatedAt
			department {
				id
				name
				description
				managerId
			}
			manager {
				id
				fullName
				displayName
				email
			}
		}
	}
`;

/**
 * Query: Get current authenticated user
 * Backend: Rust idiomatic - me() returns current user
 */
export const GET_CURRENT_USER_QUERY = gql`
	query GetCurrentUser {
		me {
			id
			email
			displayName
			firstName
			lastName
			fullName
			role
			phone
			jobTitle
			departmentId
			managerId
			isActive
			status
			department {
				id
				name
			}
			manager {
				id
				fullName
			}
		}
	}
`;

/**
 * Query: Get all departments
 * Backend: Rust idiomatic - departments(limit, offset) returns direct array
 */
export const GET_DEPARTMENTS_QUERY = gql`
	query GetEmployeeDepartments($limit: Int = 100, $offset: Int = 0) {
		departments(limit: $limit, offset: $offset) {
			id
			name
			description
			managerId
			createdAt
			updatedAt
			manager {
				id
				fullName
			}
		}
	}
`;

/**
 * Query: Get employee statistics for a date range (for time-series charts)
 * Backend: Rust idiomatic - employeeStatistics(startDate, endDate) returns array of daily snapshots
 */
export const GET_EMPLOYEE_STATISTICS_QUERY = gql`
	query GetEmployeeStatistics($startDate: String!, $endDate: String!) {
		employeeStatistics(startDate: $startDate, endDate: $endDate) {
			id
			snapshotDate
			totalCount
			activeCount
			inactiveCount
			departmentCount
			createdAt
			updatedAt
		}
	}
`;

/**
 * Query: Get the most recent employee statistics snapshot
 * Backend: Rust idiomatic - latestEmployeeStatistics() returns single snapshot
 */
export const GET_LATEST_EMPLOYEE_STATISTICS_QUERY = gql`
	query GetLatestEmployeeStatistics {
		latestEmployeeStatistics {
			id
			snapshotDate
			totalCount
			activeCount
			inactiveCount
			departmentCount
			createdAt
			updatedAt
		}
	}
`;
