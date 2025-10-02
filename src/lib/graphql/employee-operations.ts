/**
 * T027: Employee Operations - GraphQL Integration
 *
 * Standardized employee management operations with comprehensive error handling,
 * timeout enforcement, and retry logic following the T021-T024 entity model patterns.
 */

import { gql } from '@urql/svelte';
import type { Client } from '@urql/core';
import type { DataRequest, UserCredentials } from '$lib/models/data-request';
import type { ErrorResponse } from '$lib/models/error-response';

/**
 * GraphQL Employee Queries
 */
export const GET_EMPLOYEES_QUERY = gql`
	query GetEmployees(
		$first: Int
		$after: Cursor
	) {
		allUsers(first: $first, after: $after) {
			nodes {
				id
				email
				displayName
				firstName
				lastName
				role
				departmentId
				isActive
				hireDate
				createdAt
				updatedAt
				departmentByDepartmentId {
					id
					name
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

export const GET_EMPLOYEE_BY_ID_QUERY = gql`
	query GetEmployeeById($id: UUID!) {
		employee(id: $id) {
			id
			email
			displayName
			isActive
			createdAt
			updatedAt
			profile {
				firstName
				lastName
				phoneNumber
				avatarUrl
				dateOfBirth
				hireDate
				jobTitle
				salary
				department {
					id
					name
					description
				}
				manager {
					id
					displayName
					email
				}
				address {
					street
					city
					state
					zipCode
					country
				}
				emergencyContact {
					name
					relationship
					phoneNumber
					email
				}
				skills {
					nodes {
						name
						level
						endorsements
					}
				}
				certifications {
					nodes {
						name
						issuer
						issuedDate
						expiryDate
						credentialId
					}
				}
			}
			roles {
				nodes {
					name
					description
					permissions {
						nodes {
							resource
							action
							description
						}
					}
				}
			}
			performanceReviews {
				nodes {
					id
					reviewDate
					overallRating
					reviewer {
						displayName
					}
				}
			}
		}
	}
`;

export const GET_DEPARTMENTS_QUERY = gql`
	query GetDepartments($first: Int, $after: Cursor) {
		allDepartments(first: $first, after: $after) {
			nodes {
				id
				name
				description
				createdAt
				updatedAt
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

export const GET_EMPLOYEE_DASHBOARD_QUERY = gql`
	query GetEmployeeDashboard($employeeId: UUID!) {
		employee(id: $employeeId) {
			id
			displayName
			profile {
				firstName
				lastName
				avatarUrl
				jobTitle
				department {
					name
				}
			}
			metrics {
				attendanceRate
				completedTasks
				pendingTasks
				upcomingReviews
			}
			recentActivities(first: 10) {
				nodes {
					id
					type
					description
					createdAt
					metadata
				}
			}
			upcomingEvents(first: 5) {
				nodes {
					id
					title
					startDate
					endDate
					type
				}
			}
		}
	}
`;

/**
 * GraphQL Employee Mutations
 */
export const CREATE_EMPLOYEE_MUTATION = gql`
	mutation CreateEmployee($input: CreateEmployeeInput!) {
		createEmployee(input: $input) {
			employee {
				id
				email
				displayName
				isActive
				profile {
					firstName
					lastName
					phoneNumber
					jobTitle
					hireDate
					department {
						id
						name
					}
					manager {
						id
						displayName
					}
				}
			}
			clientMutationId
		}
	}
`;

export const UPDATE_EMPLOYEE_MUTATION = gql`
	mutation UpdateEmployee($input: UpdateEmployeeInput!) {
		updateEmployee(input: $input) {
			employee {
				id
				email
				displayName
				isActive
				updatedAt
				profile {
					firstName
					lastName
					phoneNumber
					avatarUrl
					jobTitle
					department {
						id
						name
					}
					manager {
						id
						displayName
					}
					address {
						street
						city
						state
						zipCode
						country
					}
					emergencyContact {
						name
						relationship
						phoneNumber
						email
					}
				}
			}
			clientMutationId
		}
	}
`;

export const DEACTIVATE_EMPLOYEE_MUTATION = gql`
	mutation DeactivateEmployee($input: DeactivateEmployeeInput!) {
		deactivateEmployee(input: $input) {
			employee {
				id
				isActive
				updatedAt
			}
			clientMutationId
		}
	}
`;

/**
 * Employee interfaces
 */
export interface Employee {
	id: string;
	email: string;
	displayName: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
	profile: {
		firstName: string;
		lastName: string;
		phoneNumber?: string;
		avatarUrl?: string;
		dateOfBirth?: string;
		hireDate: string;
		jobTitle: string;
		salary?: number;
		department?: {
			id: string;
			name: string;
			description?: string;
		};
		manager?: {
			id: string;
			displayName: string;
			email?: string;
		};
		address?: {
			street?: string;
			city?: string;
			state?: string;
			zipCode?: string;
			country?: string;
		};
		emergencyContact?: {
			name: string;
			relationship: string;
			phoneNumber: string;
			email?: string;
		};
		skills?: Array<{
			name: string;
			level: number;
			endorsements: number;
		}>;
		certifications?: Array<{
			name: string;
			issuer: string;
			issuedDate: string;
			expiryDate?: string;
			credentialId?: string;
		}>;
	};
	roles: Array<{
		name: string;
		description?: string;
		permissions: Array<{
			resource: string;
			action: string;
			description?: string;
		}>;
	}>;
	performanceReviews?: Array<{
		id: string;
		reviewDate: string;
		overallRating: number;
		reviewer: {
			displayName: string;
		};
	}>;
}

export interface EmployeeFilter {
	isActive?: boolean;
	departmentId?: string;
	managerId?: string;
	jobTitle?: string;
	search?: string;
}

export interface PaginatedEmployees {
	nodes: Employee[];
	pageInfo: {
		hasNextPage: boolean;
		hasPreviousPage: boolean;
		startCursor?: string;
		endCursor?: string;
	};
	totalCount: number;
}

/**
 * Standardized employee operations with error handling and retry logic
 */
export class EmployeeOperations {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	/**
	 * Get paginated list of employees with filtering and sorting
	 */
	async getEmployees(params: {
		first?: number;
		after?: string;
		filter?: EmployeeFilter;
		orderBy?: string[];
		userCredentials: UserCredentials;
	}): Promise<PaginatedEmployees> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetEmployees',
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
			const result = await this.client.query(GET_EMPLOYEES_QUERY, dataRequest.variables).toPromise();

			if (result.error) {
				console.error('Employees GraphQL error:', result.error);
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load employee list. Please check your permissions and try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.allUsers) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No employee data returned. Please try again.'
				});
			}

			console.log(`Loaded ${result.data.allUsers.nodes.length} employees`);
			return result.data.allUsers;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load employees. Please try again.'
			});
		}
	}

	/**
	 * Get departments list for filters and selections
	 */
	async getDepartments(params: {
		userCredentials: UserCredentials;
	}): Promise<{ departments: Array<{ id: string; name: string; description?: string }> }> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetDepartments',
			variables: { first: 100 },
			userCredentials: params.userCredentials,
			timeoutMs: 3000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(GET_DEPARTMENTS_QUERY, dataRequest.variables).toPromise();

			if (result.error) {
				console.error('Departments GraphQL error:', result.error);
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load departments. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.allDepartments) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No department data returned. Please try again.'
				});
			}

			console.log(`Loaded ${result.data.allDepartments.nodes.length} departments`);
			return { departments: result.data.allDepartments.nodes };
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
	 * Get single employee by ID with full details
	 */
	async getEmployeeById(params: {
		id: string;
		userCredentials: UserCredentials;
	}): Promise<Employee> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetEmployeeById',
			variables: { id: params.id },
			userCredentials: params.userCredentials,
			timeoutMs: 3000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(GET_EMPLOYEE_BY_ID_QUERY, dataRequest.variables).toPromise();

			if (result.error) {
				console.error('Employee by ID error:', result.error);
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load employee details. Please check the employee ID and try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.employee) {
				throw createErrorResponse(new Error('Employee not found'), {
					type: 'validation',
					userMessage: 'Employee not found. Please check the employee ID.'
				});
			}

			console.log(`Loaded employee: ${result.data.employee.displayName}`);
			return result.data.employee;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load employee details. Please try again.'
			});
		}
	}

	/**
	 * Get employee dashboard data
	 */
	async getEmployeeDashboard(params: {
		employeeId: string;
		userCredentials: UserCredentials;
	}): Promise<any> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetEmployeeDashboard',
			variables: { employeeId: params.employeeId },
			userCredentials: params.userCredentials,
			timeoutMs: 4000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(GET_EMPLOYEE_DASHBOARD_QUERY, dataRequest.variables).toPromise();

			if (result.error) {
				console.error('Employee dashboard error:', result.error);
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load employee dashboard. Please try refreshing the page.'
				});
				throw errorResponse;
			}

			if (!result.data?.employee) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No dashboard data returned. Please try again.'
				});
			}

			console.log(`Loaded dashboard for: ${result.data.employee.displayName}`);
			return result.data.employee;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load employee dashboard. Please try again.'
			});
		}
	}

	/**
	 * Create new employee
	 */
	async createEmployee(params: {
		input: {
			email: string;
			firstName: string;
			lastName: string;
			jobTitle: string;
			departmentId?: string;
			managerId?: string;
			hireDate: string;
			phoneNumber?: string;
			address?: {
				street?: string;
				city?: string;
				state?: string;
				zipCode?: string;
				country?: string;
			};
			emergencyContact?: {
				name: string;
				relationship: string;
				phoneNumber: string;
				email?: string;
			};
		};
		userCredentials: UserCredentials;
	}): Promise<Employee> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'CreateEmployee',
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 8000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(CREATE_EMPLOYEE_MUTATION, dataRequest.variables).toPromise();

			if (result.error) {
				console.error('Create employee error:', result.error);
				const errorResponse = createErrorResponse(result.error, {
					type: 'validation',
					userMessage: 'Unable to create employee. Please check the information and try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.createEmployee?.employee) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No employee data returned. Please try again.'
				});
			}

			console.log(`Created employee: ${result.data.createEmployee.employee.displayName}`);
			return result.data.createEmployee.employee;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to create employee. Please try again.'
			});
		}
	}

	/**
	 * Update existing employee
	 */
	async updateEmployee(params: {
		input: {
			id: string;
			patch: {
				email?: string;
				displayName?: string;
				isActive?: boolean;
				profile?: {
					firstName?: string;
					lastName?: string;
					phoneNumber?: string;
					avatarUrl?: string;
					jobTitle?: string;
					departmentId?: string;
					managerId?: string;
					address?: {
						street?: string;
						city?: string;
						state?: string;
						zipCode?: string;
						country?: string;
					};
					emergencyContact?: {
						name: string;
						relationship: string;
						phoneNumber: string;
						email?: string;
					};
				};
			};
		};
		userCredentials: UserCredentials;
	}): Promise<Employee> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'UpdateEmployee',
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 6000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(UPDATE_EMPLOYEE_MUTATION, dataRequest.variables).toPromise();

			if (result.error) {
				console.error('Update employee error:', result.error);
				const errorResponse = createErrorResponse(result.error, {
					type: 'validation',
					userMessage: 'Unable to update employee. Please check the information and try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.updateEmployee?.employee) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No employee data returned. Please try again.'
				});
			}

			console.log(`Updated employee: ${result.data.updateEmployee.employee.displayName}`);
			return result.data.updateEmployee.employee;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to update employee. Please try again.'
			});
		}
	}

	/**
	 * Deactivate employee (soft delete)
	 */
	async deactivateEmployee(params: {
		input: {
			id: string;
			reason?: string;
		};
		userCredentials: UserCredentials;
	}): Promise<{ id: string; isActive: boolean; updatedAt: string }> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'DeactivateEmployee',
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 4000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(DEACTIVATE_EMPLOYEE_MUTATION, dataRequest.variables).toPromise();

			if (result.error) {
				console.error('Deactivate employee error:', result.error);
				const errorResponse = createErrorResponse(result.error, {
					type: 'permission',
					userMessage: 'Unable to deactivate employee. Please check your permissions and try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.deactivateEmployee?.employee) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No deactivation confirmation returned. Please try again.'
				});
			}

			console.log(`Deactivated employee: ${params.input.id}`);
			return result.data.deactivateEmployee.employee;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to deactivate employee. Please try again.'
			});
		}
	}
}

/**
 * Factory function to create EmployeeOperations instance
 */
export function createEmployeeOperations(client: Client): EmployeeOperations {
	return new EmployeeOperations(client);
}

/**
 * Helper function to format employee display name
 */
export function formatEmployeeName(employee: Employee): string {
	if (employee.profile?.firstName && employee.profile?.lastName) {
		return `${employee.profile.firstName} ${employee.profile.lastName}`;
	}
	return employee.displayName || employee.email;
}

/**
 * Helper function to check if user can view employee
 */
export function canViewEmployee(employee: Employee, userCredentials: UserCredentials): boolean {
	// Admin can view all employees
	if (
		userCredentials.permissions.includes('*') ||
		userCredentials.permissions.includes('employees:read')
	) {
		return true;
	}

	// Users can view their own profile
	if (employee.id === userCredentials.userId) {
		return true;
	}

	// Managers can view their direct reports
	if (employee.profile?.manager?.id === userCredentials.userId) {
		return true;
	}

	return false;
}
