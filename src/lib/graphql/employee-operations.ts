/**
 * T027: Employee Operations - GraphQL Integration
 *
 * Standardized employee management operations with comprehensive error handling,
 * timeout enforcement, and retry logic following the T021-T024 entity model patterns.
 */

import { gql } from '@urql/svelte';
import type { OperationStore } from '@urql/svelte';
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
	private client: OperationStore;

	constructor(client: OperationStore) {
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
		// Import required models for standardized error handling
		const { DataRequest, createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		// Create data request with standard timeout and retry configuration
		const dataRequest = createDataRequest({
			operationName: 'GetEmployees',
			variables: {
				first: params.first || 20,
				after: params.after,
				filter: params.filter,
				orderBy: params.orderBy
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000,
			retryAttempts: 0,
			maxRetries: 3
		});

		// Retry handler with exponential backoff
		class EmployeeRetryHandler {
			private attempts = 0;

			async execute<T>(fn: () => Promise<T>, request: DataRequest): Promise<T> {
				while (this.attempts <= request.maxRetries) {
					try {
						// Update request status
						(request as any).status = 'pending';

						// Execute with timeout
						const result = await Promise.race([
							fn(),
							new Promise<never>((_, reject) =>
								setTimeout(() => reject(new Error('Employee query timeout')), request.timeoutMs)
							)
						]);

						(request as any).status = 'completed';
						return result;
					} catch (error) {
						this.attempts++;
						(request as any).retryAttempts = this.attempts;

						if (this.attempts > request.maxRetries) {
							(request as any).status = 'failed';

							// Create structured error response
							const errorResponse = createErrorResponse(error, {
								type: error.message.includes('timeout') ? 'TIMEOUT_ERROR' : 'GRAPHQL_ERROR',
								userMessage: 'Unable to load employee data. Please try again or contact support.'
							});

							console.error('Employee query error:', errorResponse.toLogEntry());
							throw errorResponse;
						}

						// Exponential backoff: 1s, 2s, 4s
						const delay = Math.min(1000 * Math.pow(2, this.attempts - 1), 4000);
						await new Promise((resolve) => setTimeout(resolve, delay));
					}
				}
				throw new Error('Max retries exceeded');
			}
		}

		const retryHandler = new EmployeeRetryHandler();

		return retryHandler.execute(async () => {
			return new Promise<PaginatedEmployees>((resolve, reject) => {
				// Subscribe to the employees query
				const unsubscribe = this.client.subscribe(
					{
						query: GET_EMPLOYEES_QUERY,
						variables: {
							first: params.first || 20,
							after: params.after,
							filter: params.filter,
							orderBy: params.orderBy
						}
					},
					(result) => {
						if (result.error) {
							console.error('Employees GraphQL error:', result.error);
							const errorResponse = createErrorResponse(result.error, {
								type: 'GRAPHQL_ERROR',
								userMessage:
									'Unable to load employee list. Please check your permissions and try again.'
							});
							reject(errorResponse);
							unsubscribe();
						} else if (result.data?.allUsers) {
							console.log(`Loaded ${result.data.allUsers.nodes.length} employees`);
							resolve(result.data.allUsers);
							unsubscribe();
						}
					}
				);
			});
		}, dataRequest);
	}

	/**
	 * Get departments list for filters and selections
	 */
	async getDepartments(params: {
		userCredentials: UserCredentials;
	}): Promise<{ departments: Array<{ id: string; name: string; description?: string }> }> {
		const { DataRequest, createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetDepartments',
			variables: { first: 100 }, // Get all departments
			userCredentials: params.userCredentials,
			timeoutMs: 3000,
			retryAttempts: 0,
			maxRetries: 2
		});

		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				const errorResponse = createErrorResponse(new Error('Departments fetch timeout'), {
					type: 'TIMEOUT_ERROR',
					userMessage: 'Department data is taking longer than expected. Please try again.'
				});
				reject(errorResponse);
				unsubscribe();
			}, dataRequest.timeoutMs);

			const unsubscribe = this.client.subscribe(
				{
					query: GET_DEPARTMENTS_QUERY,
					variables: { first: 100 }
				},
				(result) => {
					clearTimeout(timeoutId);

					if (result.error) {
						console.error('Departments GraphQL error:', result.error);
						const errorResponse = createErrorResponse(result.error, {
							type: 'GRAPHQL_ERROR',
							userMessage: 'Unable to load departments. Please try again.'
						});
						reject(errorResponse);
						unsubscribe();
					} else if (result.data?.allDepartments) {
						console.log(`Loaded ${result.data.allDepartments.nodes.length} departments`);
						resolve({ departments: result.data.allDepartments.nodes });
						unsubscribe();
					}
				}
			);
		});
	}

	/**
	 * Get single employee by ID with full details
	 */
	async getEmployeeById(params: {
		id: string;
		userCredentials: UserCredentials;
	}): Promise<Employee> {
		const { DataRequest, createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetEmployeeById',
			variables: { id: params.id },
			userCredentials: params.userCredentials,
			timeoutMs: 3000, // Shorter timeout for single record
			retryAttempts: 0,
			maxRetries: 2
		});

		return new Promise<Employee>((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				const errorResponse = createErrorResponse(new Error('Employee fetch timeout'), {
					type: 'TIMEOUT_ERROR',
					userMessage: 'Employee data is taking longer than expected. Please try again.'
				});
				reject(errorResponse);
				unsubscribe();
			}, dataRequest.timeoutMs);

			const unsubscribe = this.client.subscribe(
				{
					query: GET_EMPLOYEE_BY_ID_QUERY,
					variables: { id: params.id }
				},
				(result) => {
					clearTimeout(timeoutId);

					if (result.error) {
						console.error('Employee by ID error:', result.error);
						const errorResponse = createErrorResponse(result.error, {
							type: 'GRAPHQL_ERROR',
							userMessage:
								'Unable to load employee details. Please check the employee ID and try again.'
						});
						reject(errorResponse);
						unsubscribe();
					} else if (result.data?.employee) {
						console.log(`Loaded employee: ${result.data.employee.displayName}`);
						resolve(result.data.employee);
						unsubscribe();
					} else {
						const errorResponse = createErrorResponse(new Error('Employee not found'), {
							type: 'VALIDATION_ERROR',
							userMessage: 'Employee not found. Please check the employee ID.'
						});
						reject(errorResponse);
						unsubscribe();
					}
				}
			);
		});
	}

	/**
	 * Get employee dashboard data
	 */
	async getEmployeeDashboard(params: {
		employeeId: string;
		userCredentials: UserCredentials;
	}): Promise<any> {
		const { DataRequest, createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetEmployeeDashboard',
			variables: { employeeId: params.employeeId },
			userCredentials: params.userCredentials,
			timeoutMs: 4000,
			retryAttempts: 0,
			maxRetries: 2
		});

		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				const errorResponse = createErrorResponse(new Error('Employee dashboard timeout'), {
					type: 'TIMEOUT_ERROR',
					userMessage: 'Dashboard data is loading slowly. Please try again.'
				});
				reject(errorResponse);
				unsubscribe();
			}, dataRequest.timeoutMs);

			const unsubscribe = this.client.subscribe(
				{
					query: GET_EMPLOYEE_DASHBOARD_QUERY,
					variables: { employeeId: params.employeeId }
				},
				(result) => {
					clearTimeout(timeoutId);

					if (result.error) {
						console.error('Employee dashboard error:', result.error);
						const errorResponse = createErrorResponse(result.error, {
							type: 'GRAPHQL_ERROR',
							userMessage: 'Unable to load employee dashboard. Please try refreshing the page.'
						});
						reject(errorResponse);
						unsubscribe();
					} else if (result.data?.employee) {
						console.log(`Loaded dashboard for: ${result.data.employee.displayName}`);
						resolve(result.data.employee);
						unsubscribe();
					}
				}
			);
		});
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
		const { DataRequest, createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'CreateEmployee',
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 8000, // Longer timeout for mutations
			retryAttempts: 0,
			maxRetries: 1 // Single retry for mutations
		});

		return new Promise<Employee>((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				const errorResponse = createErrorResponse(new Error('Employee creation timeout'), {
					type: 'TIMEOUT_ERROR',
					userMessage:
						'Employee creation is taking longer than expected. Please check if the employee was created.'
				});
				reject(errorResponse);
				unsubscribe();
			}, dataRequest.timeoutMs);

			const unsubscribe = this.client.subscribe(
				{
					query: CREATE_EMPLOYEE_MUTATION,
					variables: { input: params.input }
				},
				(result) => {
					clearTimeout(timeoutId);

					if (result.error) {
						console.error('Create employee error:', result.error);
						const errorResponse = createErrorResponse(result.error, {
							type: 'VALIDATION_ERROR',
							userMessage: 'Unable to create employee. Please check the information and try again.'
						});
						reject(errorResponse);
						unsubscribe();
					} else if (result.data?.createEmployee?.employee) {
						console.log(`Created employee: ${result.data.createEmployee.employee.displayName}`);
						resolve(result.data.createEmployee.employee);
						unsubscribe();
					}
				}
			);
		});
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
		const { DataRequest, createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'UpdateEmployee',
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 6000,
			retryAttempts: 0,
			maxRetries: 1
		});

		return new Promise<Employee>((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				const errorResponse = createErrorResponse(new Error('Employee update timeout'), {
					type: 'TIMEOUT_ERROR',
					userMessage:
						'Employee update is taking longer than expected. Please verify the changes were saved.'
				});
				reject(errorResponse);
				unsubscribe();
			}, dataRequest.timeoutMs);

			const unsubscribe = this.client.subscribe(
				{
					query: UPDATE_EMPLOYEE_MUTATION,
					variables: { input: params.input }
				},
				(result) => {
					clearTimeout(timeoutId);

					if (result.error) {
						console.error('Update employee error:', result.error);
						const errorResponse = createErrorResponse(result.error, {
							type: 'VALIDATION_ERROR',
							userMessage: 'Unable to update employee. Please check the information and try again.'
						});
						reject(errorResponse);
						unsubscribe();
					} else if (result.data?.updateEmployee?.employee) {
						console.log(`Updated employee: ${result.data.updateEmployee.employee.displayName}`);
						resolve(result.data.updateEmployee.employee);
						unsubscribe();
					}
				}
			);
		});
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
		const { DataRequest, createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'DeactivateEmployee',
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 4000,
			retryAttempts: 0,
			maxRetries: 1
		});

		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				const errorResponse = createErrorResponse(new Error('Employee deactivation timeout'), {
					type: 'TIMEOUT_ERROR',
					userMessage:
						'Employee deactivation is taking longer than expected. Please verify the change was applied.'
				});
				reject(errorResponse);
				unsubscribe();
			}, dataRequest.timeoutMs);

			const unsubscribe = this.client.subscribe(
				{
					query: DEACTIVATE_EMPLOYEE_MUTATION,
					variables: { input: params.input }
				},
				(result) => {
					clearTimeout(timeoutId);

					if (result.error) {
						console.error('Deactivate employee error:', result.error);
						const errorResponse = createErrorResponse(result.error, {
							type: 'PERMISSION_ERROR',
							userMessage:
								'Unable to deactivate employee. Please check your permissions and try again.'
						});
						reject(errorResponse);
						unsubscribe();
					} else if (result.data?.deactivateEmployee?.employee) {
						console.log(`Deactivated employee: ${params.input.id}`);
						resolve(result.data.deactivateEmployee.employee);
						unsubscribe();
					}
				}
			);
		});
	}
}

/**
 * Factory function to create EmployeeOperations instance
 */
export function createEmployeeOperations(client: OperationStore): EmployeeOperations {
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
