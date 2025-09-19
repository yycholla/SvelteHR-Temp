/**
 * GraphQL Operations for Department Management
 * Generated for PostGraphile schema introspection
 */

import { gql } from '@urql/svelte';

// Fragments for reusable field sets
export const DEPARTMENT_BASIC_FIELDS = gql`
	fragment DepartmentBasicFields on Department {
		id
		name
		description
		createdAt
		updatedAt
	}
`;

export const DEPARTMENT_FULL_FIELDS = gql`
	fragment DepartmentFullFields on Department {
		...DepartmentBasicFields
		metadata
	}
	${DEPARTMENT_BASIC_FIELDS}
`;

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

// Query: Get all departments with pagination
export const GET_DEPARTMENTS_QUERY = gql`
	query GetDepartments(
		$first: Int
		$offset: Int
		$orderBy: [DepartmentsOrderBy!]
		$condition: DepartmentCondition
	) {
		allDepartments(first: $first, offset: $offset, orderBy: $orderBy, condition: $condition) {
			nodes {
				...DepartmentFullFields
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
			}
		}
	}
	${DEPARTMENT_FULL_FIELDS}
`;

// Query: Get department by ID
export const GET_DEPARTMENT_BY_ID_QUERY = gql`
	query GetDepartmentById($id: UUID!) {
		departmentById(id: $id) {
			...DepartmentFullFields
		}
	}
	${DEPARTMENT_FULL_FIELDS}
`;

// Query: Get department by name
export const GET_DEPARTMENT_BY_NAME_QUERY = gql`
	query GetDepartmentByName($name: String!) {
		departmentByName(name: $name) {
			...DepartmentFullFields
		}
	}
	${DEPARTMENT_FULL_FIELDS}
`;

// Query: Search departments
export const SEARCH_DEPARTMENTS_QUERY = gql`
	query SearchDepartments($searchTerm: String!, $first: Int, $offset: Int) {
		allDepartments(
			first: $first
			offset: $offset
			filter: {
				or: [
					{ name: { includesInsensitive: $searchTerm } }
					{ description: { includesInsensitive: $searchTerm } }
				]
			}
		) {
			nodes {
				...DepartmentBasicFields
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
			}
		}
	}
	${DEPARTMENT_BASIC_FIELDS}
`;

// Query: Get departments count
export const GET_DEPARTMENTS_COUNT_QUERY = gql`
	query GetDepartmentsCount {
		allDepartments {
			totalCount
		}
	}
`;

// Query: Get department employees (via metadata lookup)
export const GET_DEPARTMENT_EMPLOYEES_QUERY = gql`
	query GetDepartmentEmployees($departmentId: UUID!, $first: Int, $offset: Int) {
		allUsers(
			first: $first
			offset: $offset
			condition: { metadata: { includes: { departmentId: $departmentId } } }
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

// Query: Get department statistics
export const GET_DEPARTMENT_STATS_QUERY = gql`
	query GetDepartmentStats($departmentId: UUID!) {
		departmentById(id: $departmentId) {
			...DepartmentBasicFields
		}
		activeEmployees: allUsers(
			condition: { isActive: true, metadata: { includes: { departmentId: $departmentId } } }
		) {
			totalCount
		}
		totalEmployees: allUsers(
			condition: { metadata: { includes: { departmentId: $departmentId } } }
		) {
			totalCount
		}
	}
	${DEPARTMENT_BASIC_FIELDS}
`;

// Query: Get departments with employee counts
export const GET_DEPARTMENTS_WITH_COUNTS_QUERY = gql`
  query GetDepartmentsWithCounts($first: Int, $offset: Int) {
    allDepartments(first: $first, offset: $offset, orderBy: NAME_ASC) {
      nodes {
        ...DepartmentBasicFields
        employeeCount: usersByMetadataDepartmentId {
          totalCount
        }
        activeEmployeeCount: usersByMetadataDepartmentIdActive: usersByMetadataDepartmentId(condition: { isActive: true }) {
          totalCount
        }
      }
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
    }
  }
  ${DEPARTMENT_BASIC_FIELDS}
`;

// Mutation: Create new department
export const CREATE_DEPARTMENT_MUTATION = gql`
	mutation CreateDepartment($input: CreateDepartmentInput!) {
		createDepartment(input: $input) {
			department {
				...DepartmentFullFields
			}
			clientMutationId
		}
	}
	${DEPARTMENT_FULL_FIELDS}
`;

// Mutation: Update department
export const UPDATE_DEPARTMENT_MUTATION = gql`
	mutation UpdateDepartment($input: UpdateDepartmentByIdInput!) {
		updateDepartmentById(input: $input) {
			department {
				...DepartmentFullFields
			}
			clientMutationId
		}
	}
	${DEPARTMENT_FULL_FIELDS}
`;

// Mutation: Update department by name
export const UPDATE_DEPARTMENT_BY_NAME_MUTATION = gql`
	mutation UpdateDepartmentByName($input: UpdateDepartmentByNameInput!) {
		updateDepartmentByName(input: $input) {
			department {
				...DepartmentFullFields
			}
			clientMutationId
		}
	}
	${DEPARTMENT_FULL_FIELDS}
`;

// Mutation: Delete department
export const DELETE_DEPARTMENT_MUTATION = gql`
	mutation DeleteDepartment($input: DeleteDepartmentByIdInput!) {
		deleteDepartmentById(input: $input) {
			department {
				...DepartmentBasicFields
			}
			clientMutationId
		}
	}
	${DEPARTMENT_BASIC_FIELDS}
`;

// Mutation: Delete department by name
export const DELETE_DEPARTMENT_BY_NAME_MUTATION = gql`
	mutation DeleteDepartmentByName($input: DeleteDepartmentByNameInput!) {
		deleteDepartmentByName(input: $input) {
			department {
				...DepartmentBasicFields
			}
			clientMutationId
		}
	}
	${DEPARTMENT_BASIC_FIELDS}
`;

// Mutation: Assign employee to department (update user metadata)
export const ASSIGN_EMPLOYEE_TO_DEPARTMENT_MUTATION = gql`
	mutation AssignEmployeeToDepartment($employeeId: UUID!, $departmentId: UUID!) {
		updateUserById(
			input: { id: $employeeId, userPatch: { metadata: { departmentId: $departmentId } } }
		) {
			user {
				...UserBasicFields
				metadata
			}
			clientMutationId
		}
	}
	${USER_BASIC_FIELDS}
`;

// Mutation: Remove employee from department
export const REMOVE_EMPLOYEE_FROM_DEPARTMENT_MUTATION = gql`
	mutation RemoveEmployeeFromDepartment($employeeId: UUID!) {
		updateUserById(input: { id: $employeeId, userPatch: { metadata: null } }) {
			user {
				...UserBasicFields
				metadata
			}
			clientMutationId
		}
	}
	${USER_BASIC_FIELDS}
`;

// TypeScript interfaces for type safety
export interface Department {
	id: string;
	name: string;
	description?: string;
	createdAt: string;
	updatedAt: string;
	metadata?: Record<string, any>;
}

export interface DepartmentWithStats extends Department {
	employeeCount?: number;
	activeEmployeeCount?: number;
}

export interface DepartmentEmployee {
	id: string;
	email: string;
	displayName: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface DepartmentsConnection {
	nodes: Department[];
	totalCount: number;
	pageInfo: {
		hasNextPage: boolean;
		hasPreviousPage: boolean;
	};
}

export interface DepartmentEmployeesConnection {
	nodes: DepartmentEmployee[];
	totalCount: number;
	pageInfo: {
		hasNextPage: boolean;
		hasPreviousPage: boolean;
	};
}

export interface DepartmentStats {
	department: Department;
	activeEmployees: { totalCount: number };
	totalEmployees: { totalCount: number };
}

export interface GetDepartmentsQueryVariables {
	first?: number;
	offset?: number;
	orderBy?: string[];
	condition?: Record<string, any>;
}

export interface SearchDepartmentsQueryVariables {
	searchTerm: string;
	first?: number;
	offset?: number;
}

export interface GetDepartmentEmployeesQueryVariables {
	departmentId: string;
	first?: number;
	offset?: number;
}

export interface CreateDepartmentInput {
	department: {
		name: string;
		description?: string;
		metadata?: Record<string, any>;
	};
	clientMutationId?: string;
}

export interface UpdateDepartmentInput {
	id: string;
	departmentPatch: {
		name?: string;
		description?: string;
		metadata?: Record<string, any>;
	};
	clientMutationId?: string;
}

export interface UpdateDepartmentByNameInput {
	name: string;
	departmentPatch: {
		name?: string;
		description?: string;
		metadata?: Record<string, any>;
	};
	clientMutationId?: string;
}

export interface DeleteDepartmentInput {
	id: string;
	clientMutationId?: string;
}

export interface DeleteDepartmentByNameInput {
	name: string;
	clientMutationId?: string;
}

export interface AssignEmployeeToDepartmentVariables {
	employeeId: string;
	departmentId: string;
}

export interface RemoveEmployeeFromDepartmentVariables {
	employeeId: string;
}

// Utility functions for department management
export const DepartmentUtils = {
	/**
	 * Format department name for display
	 */
	formatDepartmentName: (name: string): string => {
		return name.replace(/([A-Z])/g, ' $1').trim();
	},

	/**
	 * Generate department slug from name
	 */
	generateSlug: (name: string): string => {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	},

	/**
	 * Validate department name
	 */
	validateDepartmentName: (name: string): boolean => {
		return name.length >= 2 && name.length <= 100 && /^[a-zA-Z0-9\s&-]+$/.test(name);
	},

	/**
	 * Get department employee percentage
	 */
	getEmployeePercentage: (departmentCount: number, totalCount: number): number => {
		return totalCount > 0 ? Math.round((departmentCount / totalCount) * 100) : 0;
	}
};
