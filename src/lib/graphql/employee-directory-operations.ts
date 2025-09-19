/**
 * GraphQL Operations for Employee Directory
 * Generated for PostGraphile schema introspection
 */

import { gql } from '@urql/svelte';

// Fragments for reusable field sets
export const USER_BASIC_FIELDS = gql`
	fragment UserBasicFields on User {
		id
		email
		displayName
		isActive
		createdAt
		updatedAt
	}
`;

export const USER_FULL_FIELDS = gql`
	fragment UserFullFields on User {
		...UserBasicFields
		lastLoginAt
		timezone
		locale
		metadata
	}
	${USER_BASIC_FIELDS}
`;

export const DEPARTMENT_FIELDS = gql`
	fragment DepartmentFields on Department {
		id
		name
		description
		createdAt
		updatedAt
	}
`;

export const USER_ROLE_FIELDS = gql`
	fragment UserRoleFields on UserRole {
		id
		name
		description
		permissions
		level
	}
`;

// Query: Get all employees/users with pagination
export const GET_EMPLOYEES_QUERY = gql`
	query GetEmployees(
		$first: Int
		$offset: Int
		$orderBy: [UsersOrderBy!]
		$condition: UserCondition
	) {
		allUsers(first: $first, offset: $offset, orderBy: $orderBy, condition: $condition) {
			nodes {
				...UserFullFields
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
			}
		}
	}
	${USER_FULL_FIELDS}
`;

// Query: Get employee by ID
export const GET_EMPLOYEE_BY_ID_QUERY = gql`
	query GetEmployeeById($id: UUID!) {
		userById(id: $id) {
			...UserFullFields
			userRoleAssignmentsByEmployeeId {
				nodes {
					id
					assignedAt
					userRoleByRoleId {
						...UserRoleFields
					}
				}
			}
		}
	}
	${USER_FULL_FIELDS}
	${USER_ROLE_FIELDS}
`;

// Query: Get employee by email
export const GET_EMPLOYEE_BY_EMAIL_QUERY = gql`
	query GetEmployeeByEmail($email: String!) {
		userByEmail(email: $email) {
			...UserFullFields
			userRoleAssignmentsByEmployeeId {
				nodes {
					id
					assignedAt
					userRoleByRoleId {
						...UserRoleFields
					}
				}
			}
		}
	}
	${USER_FULL_FIELDS}
	${USER_ROLE_FIELDS}
`;

// Query: Search employees
export const SEARCH_EMPLOYEES_QUERY = gql`
	query SearchEmployees($searchTerm: String!, $first: Int, $offset: Int) {
		allUsers(
			first: $first
			offset: $offset
			filter: {
				or: [
					{ displayName: { includesInsensitive: $searchTerm } }
					{ email: { includesInsensitive: $searchTerm } }
				]
			}
		) {
			nodes {
				...UserBasicFields
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
			}
		}
	}
	${USER_BASIC_FIELDS}
`;

// Query: Get employees by department
export const GET_EMPLOYEES_BY_DEPARTMENT_QUERY = gql`
	query GetEmployeesByDepartment($departmentId: UUID!, $first: Int, $offset: Int) {
		allUsers(
			first: $first
			offset: $offset
			condition: { metadata: { includes: { departmentId: $departmentId } } }
		) {
			nodes {
				...UserBasicFields
			}
			totalCount
		}
	}
	${USER_BASIC_FIELDS}
`;

// Query: Get employees by role
export const GET_EMPLOYEES_BY_ROLE_QUERY = gql`
	query GetEmployeesByRole($roleId: UUID!, $first: Int, $offset: Int) {
		allUserRoleAssignments(first: $first, offset: $offset, condition: { roleId: $roleId }) {
			nodes {
				userByEmployeeId {
					...UserBasicFields
				}
				assignedAt
				userRoleByRoleId {
					...UserRoleFields
				}
			}
			totalCount
		}
	}
	${USER_BASIC_FIELDS}
	${USER_ROLE_FIELDS}
`;

// Query: Get active employees count
export const GET_ACTIVE_EMPLOYEES_COUNT_QUERY = gql`
	query GetActiveEmployeesCount {
		allUsers(condition: { isActive: true }) {
			totalCount
		}
	}
`;

// Query: Get all departments for filtering
export const GET_ALL_DEPARTMENTS_QUERY = gql`
	query GetAllDepartments {
		allDepartments(orderBy: NAME_ASC) {
			nodes {
				...DepartmentFields
			}
		}
	}
	${DEPARTMENT_FIELDS}
`;

// Query: Get all user roles for filtering
export const GET_ALL_USER_ROLES_QUERY = gql`
	query GetAllUserRoles {
		allUserRoles(orderBy: LEVEL_DESC) {
			nodes {
				...UserRoleFields
			}
		}
	}
	${USER_ROLE_FIELDS}
`;

// Mutation: Create new employee
export const CREATE_EMPLOYEE_MUTATION = gql`
	mutation CreateEmployee($input: CreateUserInput!) {
		createUser(input: $input) {
			user {
				...UserFullFields
			}
			clientMutationId
		}
	}
	${USER_FULL_FIELDS}
`;

// Mutation: Update employee
export const UPDATE_EMPLOYEE_MUTATION = gql`
	mutation UpdateEmployee($input: UpdateUserByIdInput!) {
		updateUserById(input: $input) {
			user {
				...UserFullFields
			}
			clientMutationId
		}
	}
	${USER_FULL_FIELDS}
`;

// Mutation: Deactivate employee (soft delete)
export const DEACTIVATE_EMPLOYEE_MUTATION = gql`
	mutation DeactivateEmployee($id: UUID!) {
		updateUserById(input: { id: $id, userPatch: { isActive: false } }) {
			user {
				...UserBasicFields
			}
			clientMutationId
		}
	}
	${USER_BASIC_FIELDS}
`;

// Mutation: Assign role to employee
export const ASSIGN_ROLE_TO_EMPLOYEE_MUTATION = gql`
	mutation AssignRoleToEmployee($input: CreateUserRoleAssignmentInput!) {
		createUserRoleAssignment(input: $input) {
			userRoleAssignment {
				id
				employeeId
				roleId
				assignedAt
				userByEmployeeId {
					...UserBasicFields
				}
				userRoleByRoleId {
					...UserRoleFields
				}
			}
			clientMutationId
		}
	}
	${USER_BASIC_FIELDS}
	${USER_ROLE_FIELDS}
`;

// Mutation: Remove role from employee
export const REMOVE_ROLE_FROM_EMPLOYEE_MUTATION = gql`
	mutation RemoveRoleFromEmployee($id: UUID!) {
		deleteUserRoleAssignmentById(input: { id: $id }) {
			userRoleAssignment {
				id
				employeeId
				roleId
			}
			clientMutationId
		}
	}
`;

// TypeScript interfaces for type safety
export interface Employee {
	id: string;
	email: string;
	displayName: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
	lastLoginAt?: string;
	timezone?: string;
	locale?: string;
	metadata?: Record<string, any>;
}

export interface Department {
	id: string;
	name: string;
	description?: string;
	createdAt: string;
	updatedAt: string;
}

export interface UserRole {
	id: string;
	name: string;
	description?: string;
	permissions?: Record<string, any>;
	level: number;
}

export interface UserRoleAssignment {
	id: string;
	employeeId: string;
	roleId: string;
	assignedAt: string;
	userByEmployeeId?: Employee;
	userRoleByRoleId?: UserRole;
}

export interface EmployeesConnection {
	nodes: Employee[];
	totalCount: number;
	pageInfo: {
		hasNextPage: boolean;
		hasPreviousPage: boolean;
	};
}

export interface GetEmployeesQueryVariables {
	first?: number;
	offset?: number;
	orderBy?: string[];
	condition?: Record<string, any>;
}

export interface SearchEmployeesQueryVariables {
	searchTerm: string;
	first?: number;
	offset?: number;
}

export interface CreateEmployeeInput {
	user: {
		email: string;
		displayName: string;
		isActive?: boolean;
		timezone?: string;
		locale?: string;
		metadata?: Record<string, any>;
	};
	clientMutationId?: string;
}

export interface UpdateEmployeeInput {
	id: string;
	userPatch: {
		email?: string;
		displayName?: string;
		isActive?: boolean;
		timezone?: string;
		locale?: string;
		metadata?: Record<string, any>;
	};
	clientMutationId?: string;
}

export interface AssignRoleInput {
	userRoleAssignment: {
		employeeId: string;
		roleId: string;
	};
	clientMutationId?: string;
}
