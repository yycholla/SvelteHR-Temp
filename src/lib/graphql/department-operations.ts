/**
 * T028: Department Operations - GraphQL Integration
 *
 * Standardized department management operations with comprehensive error handling,
 * timeout enforcement, and retry logic following the T021-T024 entity model patterns.
 */

import { gql } from '@urql/svelte';
import type { Client } from '@urql/core';
import type { DataRequest, UserCredentials } from '$lib/models/data-request';
import type { ErrorResponse } from '$lib/models/error-response';

/**
 * GraphQL Department Queries
 */
export const GET_DEPARTMENTS_QUERY = gql`
	query GetDepartments(
		$first: Int
		$after: Cursor
		$filter: DepartmentFilter
		$orderBy: [DepartmentsOrderBy!]
	) {
		departments(first: $first, after: $after, filter: $filter, orderBy: $orderBy) {
			nodes {
				id
				name
				description
				code
				isActive
				createdAt
				updatedAt
				manager {
					id
					displayName
					email
				}
				parentDepartment {
					id
					name
				}
				childDepartments {
					nodes {
						id
						name
						employeeCount
					}
				}
				employees {
					totalCount
				}
				budget {
					annual
					allocated
					spent
					remaining
				}
				location {
					building
					floor
					address
				}
				metrics {
					employeeCount
					activeProjects
					averageSalary
					turnoverRate
				}
			}
			pageInfo {
				hasNextPage
				hasPreviousPage
				startCursor
				endCursor
			}
			totalCount
		}
	}
`;

export const GET_DEPARTMENT_BY_ID_QUERY = gql`
	query GetDepartmentById($id: UUID!) {
		department(id: $id) {
			id
			name
			description
			code
			isActive
			createdAt
			updatedAt
			manager {
				id
				displayName
				email
				profile {
					firstName
					lastName
					avatarUrl
				}
			}
			parentDepartment {
				id
				name
				manager {
					displayName
				}
			}
			childDepartments {
				nodes {
					id
					name
					description
					manager {
						displayName
					}
					employees {
						totalCount
					}
				}
			}
			employees(first: 50) {
				nodes {
					id
					displayName
					email
					profile {
						firstName
						lastName
						avatarUrl
						jobTitle
						hireDate
					}
					roles {
						nodes {
							name
						}
					}
				}
				totalCount
			}
			budget {
				annual
				allocated
				spent
				remaining
				currency
				lastUpdated
			}
			location {
				building
				floor
				address
				city
				state
				zipCode
			}
			metrics {
				employeeCount
				activeProjects
				averageSalary
				turnoverRate
				performanceScore
				satisfaction
			}
		}
	}
`;

export const GET_DEPARTMENT_HIERARCHY_QUERY = gql`
	query GetDepartmentHierarchy {
		departments(filter: { isActive: true }, orderBy: [NAME_ASC]) {
			nodes {
				id
				name
				description
				code
				parentDepartment {
					id
					name
				}
				childDepartments {
					nodes {
						id
						name
						childDepartments {
							nodes {
								id
								name
							}
						}
					}
				}
				manager {
					id
					displayName
				}
				employees {
					totalCount
				}
			}
		}
	}
`;

/**
 * GraphQL Department Mutations
 */
export const CREATE_DEPARTMENT_MUTATION = gql`
	mutation CreateDepartment($input: CreateDepartmentInput!) {
		createDepartment(input: $input) {
			department {
				id
				name
				description
				code
				isActive
				manager {
					id
					displayName
				}
				parentDepartment {
					id
					name
				}
				budget {
					annual
					allocated
				}
				location {
					building
					floor
					address
				}
			}
			clientMutationId
		}
	}
`;

export const UPDATE_DEPARTMENT_MUTATION = gql`
	mutation UpdateDepartment($input: UpdateDepartmentInput!) {
		updateDepartment(input: $input) {
			department {
				id
				name
				description
				code
				isActive
				updatedAt
				manager {
					id
					displayName
				}
				parentDepartment {
					id
					name
				}
				budget {
					annual
					allocated
					spent
					remaining
				}
				location {
					building
					floor
					address
				}
			}
			clientMutationId
		}
	}
`;

export const DELETE_DEPARTMENT_MUTATION = gql`
	mutation DeleteDepartment($input: DeleteDepartmentInput!) {
		deleteDepartment(input: $input) {
			deletedDepartmentId
			clientMutationId
		}
	}
`;

/**
 * Department interfaces
 */
export interface Department {
	id: string;
	name: string;
	description?: string;
	code: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
	manager?: {
		id: string;
		displayName: string;
		email?: string;
		profile?: {
			firstName: string;
			lastName: string;
			avatarUrl?: string;
		};
	};
	parentDepartment?: {
		id: string;
		name: string;
		manager?: {
			displayName: string;
		};
	};
	childDepartments: Array<{
		id: string;
		name: string;
		description?: string;
		manager?: {
			displayName: string;
		};
		employeeCount?: number;
	}>;
	employees: {
		nodes?: Array<{
			id: string;
			displayName: string;
			email: string;
			profile?: {
				firstName: string;
				lastName: string;
				avatarUrl?: string;
				jobTitle: string;
				hireDate: string;
			};
			roles: Array<{
				name: string;
			}>;
		}>;
		totalCount: number;
	};
	budget?: {
		annual: number;
		allocated: number;
		spent: number;
		remaining: number;
		currency?: string;
		lastUpdated?: string;
	};
	location?: {
		building?: string;
		floor?: string;
		address?: string;
		city?: string;
		state?: string;
		zipCode?: string;
	};
	metrics?: {
		employeeCount: number;
		activeProjects: number;
		averageSalary?: number;
		turnoverRate?: number;
		performanceScore?: number;
		satisfaction?: number;
	};
}

export interface DepartmentFilter {
	isActive?: boolean;
	parentId?: string;
	managerId?: string;
	search?: string;
}

export interface PaginatedDepartments {
	nodes: Department[];
	pageInfo: {
		hasNextPage: boolean;
		hasPreviousPage: boolean;
		startCursor?: string;
		endCursor?: string;
	};
	totalCount: number;
}

/**
 * Standardized department operations with error handling and retry logic
 */
export class DepartmentOperations {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	/**
	 * Get paginated list of departments with filtering and sorting
	 */
	async getDepartments(params: {
		first?: number;
		after?: string;
		filter?: DepartmentFilter;
		orderBy?: string[];
		userCredentials: UserCredentials;
	}): Promise<PaginatedDepartments> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetDepartments',
			variables: {
				first: params.first || 20,
				after: params.after,
				filter: params.filter,
				orderBy: params.orderBy
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(GET_DEPARTMENTS_QUERY, dataRequest.variables).toPromise();

			if (result.error) {
				console.error('Departments GraphQL error:', result.error);
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load department list. Please check your permissions and try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.departments) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No department data returned. Please try again.'
				});
			}

			console.log(`Loaded ${result.data.departments.nodes.length} departments`);
			return result.data.departments;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load departments. Please try again.'
			});
		}
	}

	/**
	 * Get single department by ID with full details
	 */
	async getDepartmentById(params: {
		id: string;
		userCredentials: UserCredentials;
	}): Promise<Department> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetDepartmentById',
			variables: { id: params.id },
			userCredentials: params.userCredentials,
			timeoutMs: 4000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(GET_DEPARTMENT_BY_ID_QUERY, dataRequest.variables).toPromise();

			if (result.error) {
				console.error('Department by ID error:', result.error);
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load department details. Please check the department ID and try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.department) {
				throw createErrorResponse(new Error('Department not found'), {
					type: 'validation',
					userMessage: 'Department not found. Please check the department ID.'
				});
			}

			console.log(`Loaded department: ${result.data.department.name}`);
			return result.data.department;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load department details. Please try again.'
			});
		}
	}

	/**
	 * Get department hierarchy for organizational chart
	 */
	async getDepartmentHierarchy(params: {
		userCredentials: UserCredentials;
	}): Promise<Department[]> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetDepartmentHierarchy',
			variables: {},
			userCredentials: params.userCredentials,
			timeoutMs: 6000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(GET_DEPARTMENT_HIERARCHY_QUERY, dataRequest.variables).toPromise();

			if (result.error) {
				console.error('Department hierarchy error:', result.error);
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load organization chart. Please try refreshing the page.'
				});
				throw errorResponse;
			}

			if (!result.data?.departments) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No department hierarchy data returned. Please try again.'
				});
			}

			console.log(`Loaded hierarchy with ${result.data.departments.nodes.length} departments`);
			return result.data.departments.nodes;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load department hierarchy. Please try again.'
			});
		}
	}

	/**
	 * Create new department
	 */
	async createDepartment(params: {
		input: {
			name: string;
			description?: string;
			code: string;
			managerId?: string;
			parentId?: string;
			budget?: {
				annual: number;
				allocated: number;
			};
			location?: {
				building?: string;
				floor?: string;
				address?: string;
				city?: string;
				state?: string;
				zipCode?: string;
			};
		};
		userCredentials: UserCredentials;
	}): Promise<Department> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'CreateDepartment',
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 8000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(CREATE_DEPARTMENT_MUTATION, dataRequest.variables).toPromise();

			if (result.error) {
				console.error('Create department error:', result.error);
				const errorResponse = createErrorResponse(result.error, {
					type: 'validation',
					userMessage: 'Unable to create department. Please check the information and try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.createDepartment?.department) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No department data returned. Please try again.'
				});
			}

			console.log(`Created department: ${result.data.createDepartment.department.name}`);
			return result.data.createDepartment.department;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to create department. Please try again.'
			});
		}
	}

	/**
	 * Update existing department
	 */
	async updateDepartment(params: {
		input: {
			id: string;
			patch: {
				name?: string;
				description?: string;
				code?: string;
				isActive?: boolean;
				managerId?: string;
				parentId?: string;
				budget?: {
					annual?: number;
					allocated?: number;
				};
				location?: {
					building?: string;
					floor?: string;
					address?: string;
					city?: string;
					state?: string;
					zipCode?: string;
				};
			};
		};
		userCredentials: UserCredentials;
	}): Promise<Department> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'UpdateDepartment',
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 6000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(UPDATE_DEPARTMENT_MUTATION, dataRequest.variables).toPromise();

			if (result.error) {
				console.error('Update department error:', result.error);
				const errorResponse = createErrorResponse(result.error, {
					type: 'validation',
					userMessage: 'Unable to update department. Please check the information and try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.updateDepartment?.department) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No department data returned. Please try again.'
				});
			}

			console.log(`Updated department: ${result.data.updateDepartment.department.name}`);
			return result.data.updateDepartment.department;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to update department. Please try again.'
			});
		}
	}

	/**
	 * Delete department (hard delete - use with caution)
	 */
	async deleteDepartment(params: {
		input: {
			id: string;
			transferEmployeesToId?: string;
		};
		userCredentials: UserCredentials;
	}): Promise<{ deletedDepartmentId: string }> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'DeleteDepartment',
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 10000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(DELETE_DEPARTMENT_MUTATION, dataRequest.variables).toPromise();

			if (result.error) {
				console.error('Delete department error:', result.error);
				const errorResponse = createErrorResponse(result.error, {
					type: 'permission',
					userMessage: 'Unable to delete department. Please check your permissions and ensure all employees are reassigned.'
				});
				throw errorResponse;
			}

			if (!result.data?.deleteDepartment) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No deletion confirmation returned. Please try again.'
				});
			}

			console.log(`Deleted department: ${params.input.id}`);
			return result.data.deleteDepartment;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to delete department. Please try again.'
			});
		}
	}
}

/**
 * Factory function to create DepartmentOperations instance
 */
export function createDepartmentOperations(client: Client): DepartmentOperations {
	return new DepartmentOperations(client);
}

/**
 * Helper function to build department hierarchy tree
 */
export function buildDepartmentTree(departments: Department[]): Department[] {
	const departmentMap = new Map<string, Department>();
	const rootDepartments: Department[] = [];

	// First pass: create map of all departments
	for (const dept of departments) {
		departmentMap.set(dept.id, { ...dept, childDepartments: [] });
	}

	// Second pass: build tree structure
	for (const dept of departments) {
		const currentDept = departmentMap.get(dept.id)!;

		if (dept.parentDepartment) {
			const parent = departmentMap.get(dept.parentDepartment.id);
			if (parent) {
				parent.childDepartments.push(currentDept);
			}
		} else {
			rootDepartments.push(currentDept);
		}
	}

	return rootDepartments;
}

/**
 * Helper function to check if user can manage department
 */
export function canManageDepartment(
	department: Department,
	userCredentials: UserCredentials
): boolean {
	// Admin can manage all departments
	if (
		userCredentials.permissions.includes('*') ||
		userCredentials.permissions.includes('departments:write')
	) {
		return true;
	}

	// Department managers can manage their own department
	if (department.manager?.id === userCredentials.userId) {
		return true;
	}

	return false;
}
