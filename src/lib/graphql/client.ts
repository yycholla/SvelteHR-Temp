/**
 * GraphQL Client for GelDB Integration
 * Provides authenticated GraphQL operations for MountainHR
 */

import { browser } from '$app/environment';
import { PUBLIC_GELDB_GRAPHQL_URL } from '$env/static/public';
import { mockGraphQLServer } from './mock-server';
import type { GraphQLResponse } from '../../tests/contract/auth.test';

interface GraphQLRequestOptions {
	token?: string;
	headers?: Record<string, string>;
}

/**
 * GraphQL Client for GelDB backend integration
 * Handles authentication, error handling, and type-safe requests
 */
export class GraphQLClient {
	private endpoint: string;
	private defaultHeaders: Record<string, string>;
	private useMockServer: boolean;

	constructor(endpoint?: string, useMockServer?: boolean) {
		// Default to GelDB GraphQL endpoint
		this.endpoint = endpoint || PUBLIC_GELDB_GRAPHQL_URL || 'http://localhost:5656/db/main/graphql';
		this.useMockServer = useMockServer ?? (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true');
		this.defaultHeaders = {
			'Content-Type': 'application/json',
			'Accept': 'application/json'
		};
	}

	/**
	 * Execute GraphQL request with proper error handling
	 */
	async request<T = any>(
		query: string,
		variables?: any,
		options?: GraphQLRequestOptions
	): Promise<GraphQLResponse<T>> {
		// Use mock server in test environment
		if (this.useMockServer) {
			console.log(`🧪 Using Mock GraphQL Server`);
			// Pass token information to mock server for authentication testing
			const mockVariables = { ...variables, _token: options?.token };
			return mockGraphQLServer.request<T>(query, mockVariables);
		}

		const headers = {
			...this.defaultHeaders,
			...options?.headers
		};

		// Add authentication token if provided
		if (options?.token) {
			headers['Authorization'] = `Bearer ${options.token}`;
		}

		const requestBody = {
			query: query.trim(),
			variables: variables || {}
		};

		try {
			console.log(`🔄 GraphQL Request to ${this.endpoint}:`, {
				query: query.slice(0, 100) + '...',
				variables
			});

			const response = await fetch(this.endpoint, {
				method: 'POST',
				headers,
				body: JSON.stringify(requestBody)
			});

			if (!response.ok) {
				console.error(`❌ HTTP Error ${response.status}:`, response.statusText);
				return {
					errors: [{
						message: `HTTP ${response.status}: ${response.statusText}`
					}]
				};
			}

			const result: GraphQLResponse<T> = await response.json();

			if (result.errors && result.errors.length > 0) {
				console.error('❌ GraphQL Errors:', result.errors);
			} else if (result.data) {
				console.log('✅ GraphQL Success:', Object.keys(result.data));
			}

			return result;
		} catch (error) {
			console.error('❌ GraphQL Request Failed:', error);
			return {
				errors: [{
					message: error instanceof Error ? error.message : 'Network error'
				}]
			};
		}
	}

	/**
	 * Execute authenticated GraphQL request
	 * Automatically includes authentication token from storage
	 */
	async authenticatedRequest<T = any>(
		query: string,
		variables?: any,
		token?: string
	): Promise<GraphQLResponse<T>> {
		// Try to get token from parameter, localStorage, or cookies
		let authToken = token;

		if (!authToken && browser) {
			// Try localStorage first
			authToken = localStorage.getItem('hr_token') || undefined;
			
			// Try cookies as fallback
			if (!authToken) {
				const cookies = document.cookie.split(';');
				for (const cookie of cookies) {
					const [name, value] = cookie.trim().split('=');
					if (name === 'hr_token' || name === 'auth-token') {
						authToken = value;
						break;
					}
				}
			}
		}

		return this.request<T>(query, variables, {
			token: authToken || undefined
		});
	}

	/**
	 * Check if GraphQL endpoint is available
	 */
	async healthCheck(): Promise<boolean> {
		try {
			// Simple introspection query to check if GraphQL endpoint is available
			const introspectionQuery = `
				query IntrospectionQuery {
					__schema {
						queryType {
							name
						}
					}
				}
			`;

			const result = await this.request(introspectionQuery);
			return !result.errors && !!result.data;
		} catch (error) {
			console.warn('GraphQL endpoint health check failed:', error);
			return false;
		}
	}

	/**
	 * Get GraphQL schema information
	 */
	async getSchema(): Promise<any> {
		const introspectionQuery = `
			query IntrospectionQuery {
				__schema {
					types {
						name
						kind
						description
					}
					queryType {
						name
						fields {
							name
							description
						}
					}
					mutationType {
						name
						fields {
							name
							description
						}
					}
				}
			}
		`;

		const result = await this.request(introspectionQuery);
		return result.data?.__schema;
	}
}

/**
 * Default GraphQL client instance
 * Can be used throughout the application
 */
export const graphqlClient = new GraphQLClient();

/**
 * Authentication-specific GraphQL operations
 * Type-safe wrappers for common auth operations
 */
export const authOperations = {
	/**
	 * Login mutation with proper typing
	 */
	async login(email: string, password: string): Promise<GraphQLResponse<any>> {
		const LOGIN_MUTATION = `
			mutation Login($input: LoginInput!) {
				login(input: $input) {
					token
					refreshToken
					user {
						id
						email
						firstName
						lastName
						roles {
							id
							name
							level
						}
					}
					expiresAt
				}
			}
		`;

		return graphqlClient.request(LOGIN_MUTATION, {
			input: { email, password }
		});
	},

	/**
	 * Get current user (Me query)
	 */
	async me(token?: string): Promise<GraphQLResponse<any>> {
		const ME_QUERY = `
			query Me {
				me {
					id
					email
					firstName
					lastName
					isActive
					roles {
						id
						name
						level
						permissions {
							resource
							action
							scope
						}
					}
					employee {
						id
						employeeId
						position
						department {
							id
							name
						}
					}
				}
			}
		`;

		return graphqlClient.authenticatedRequest(ME_QUERY, {}, token);
	},

	/**
	 * Refresh authentication token
	 */
	async refreshToken(refreshToken: string): Promise<GraphQLResponse<any>> {
		const REFRESH_MUTATION = `
			mutation RefreshToken($refreshToken: String!) {
				refreshToken(refreshToken: $refreshToken) {
					token
					refreshToken
					expiresAt
				}
			}
		`;

		return graphqlClient.request(REFRESH_MUTATION, { refreshToken });
	}
};

/**
 * Dashboard-specific GraphQL operations
 */
export const dashboardOperations = {
	/**
	 * Get comprehensive dashboard statistics
	 */
	async getDashboardStats(userRole?: string): Promise<GraphQLResponse<any>> {
		const DASHBOARD_STATS_QUERY = `
			query DashboardStats($userRole: String) {
				dashboardStats(userRole: $userRole) {
					personalStats {
						totalEmployees
						newEmployeesThisMonth
						pendingTasks
						availableTimeOff
						myTasks
						myPendingLeave
					}
					teamStats {
						teamSize
						teamTasksCompleted
						teamPendingApprovals
						teamPerformanceScore
					}
					systemStats {
						apiRequestCount
						averageLatency
						errorRate
						activeConnections
						systemUptime
					}
					hrStats {
						totalEmployees
						complianceItems
						leaveRequests
						hrRequests
					}
					recentActivities {
						id
						type
						message
						time
						avatar
					}
					upcomingEvents {
						id
						title
						date
						attendees
						type
					}
					notifications
				}
			}
		`;

		return graphqlClient.authenticatedRequest(DASHBOARD_STATS_QUERY, { userRole });
	},

	/**
	 * Get quick employee count for dashboard
	 */
	async getEmployeeCount(): Promise<GraphQLResponse<any>> {
		const EMPLOYEE_COUNT_QUERY = `
			query EmployeeCount {
				employeeCount {
					total
					active
					newThisMonth
				}
			}
		`;

		return graphqlClient.authenticatedRequest(EMPLOYEE_COUNT_QUERY);
	}
};

/**
 * Employee-specific GraphQL operations
 */
export const employeeOperations = {
	/**
	 * Get paginated employee list
	 */
	async getEmployees(params: {
		page?: number;
		limit?: number;
		search?: string;
		department?: string;
		status?: string;
		sortBy?: string;
		sortOrder?: string;
	} = {}): Promise<GraphQLResponse<any>> {
		const EMPLOYEES_QUERY = `
			query Employees(
				$page: Int
				$limit: Int
				$search: String
				$department: ID
				$status: EmployeeStatus
				$sortBy: EmployeeSortField
				$sortOrder: SortOrder
			) {
				employees(
					page: $page
					limit: $limit
					search: $search
					department: $department
					status: $status
					sortBy: $sortBy
					sortOrder: $sortOrder
				) {
					employees {
						id
						employeeId
						user {
							id
							email
							firstName
							lastName
						}
						department {
							id
							name
						}
						position
						status
						hireDate
						createdAt
						updatedAt
					}
					total
					page
					limit
					hasNextPage
					hasPreviousPage
				}
			}
		`;

		return graphqlClient.authenticatedRequest(EMPLOYEES_QUERY, params);
	},

	/**
	 * Get single employee by ID
	 */
	async getEmployee(id: string): Promise<GraphQLResponse<any>> {
		const EMPLOYEE_QUERY = `
			query Employee($id: ID!) {
				employee(id: $id) {
					id
					employeeId
					user {
						id
						email
						firstName
						lastName
						isActive
					}
					department {
						id
						name
						description
					}
					position
					manager {
						id
						employeeId
						user {
							firstName
							lastName
						}
					}
					directReports {
						id
						employeeId
						user {
							firstName
							lastName
						}
						position
					}
					hireDate
					status
					salary
					phone
					address
					createdAt
					updatedAt
				}
			}
		`;

		return graphqlClient.authenticatedRequest(EMPLOYEE_QUERY, { id });
	},

	/**
	 * Create new employee
	 */
	async createEmployee(input: {
		email: string;
		firstName: string;
		lastName: string;
		employeeId: string;
		departmentId: string;
		position: string;
		managerId?: string;
		hireDate: string;
		salary?: number;
		phone?: string;
		address?: string;
	}): Promise<GraphQLResponse<any>> {
		const CREATE_EMPLOYEE_MUTATION = `
			mutation CreateEmployee($input: CreateEmployeeInput!) {
				createEmployee(input: $input) {
					id
					employeeId
					user {
						id
						email
						firstName
						lastName
					}
					department {
						id
						name
					}
					position
					hireDate
					status
					createdAt
					updatedAt
				}
			}
		`;

		return graphqlClient.authenticatedRequest(CREATE_EMPLOYEE_MUTATION, { input });
	}
};

// Export types for use in components
export type { GraphQLResponse };