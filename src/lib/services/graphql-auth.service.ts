/**
 * GraphQL Authentication Service
 * 
 * Provides GraphQL-specific authentication operations while maintaining compatibility
 * with the existing REST API authentication system. This service bridges the gap
 * between GraphQL schema operations and the established RBAC system.
 * 
 * Features:
 * - Bearer token authentication via GraphQL
 * - RBAC permission verification through GraphQL queries
 * - User context management with GraphQL mutations
 * - Seamless fallback to REST authentication when needed
 */

import { createServerClient, createBrowserClient } from '$lib/graphql/client-factory';
import { browser } from '$app/environment';
import type { 
	AuthResponse, 
	LoginResponse, 
	User,
	Role,
	Permission
} from '$lib/generated/graphql';

/**
 * GraphQL Authentication Service Configuration
 */
interface GraphQLAuthConfig {
	endpoint?: string;
	timeout?: number;
	enableCache?: boolean;
	fallbackToRest?: boolean;
}

/**
 * Authentication result with GraphQL context
 */
export interface GraphQLAuthResult {
	success: boolean;
	user?: User;
	authenticated: boolean;
	permissions: string[];
	roles: string[];
	token?: string;
	expires_at?: string;
	session_id?: string;
	error?: string;
}

/**
 * Login credentials for GraphQL authentication
 */
export interface GraphQLLoginCredentials {
	email: string;
	password: string;
	remember?: boolean;
	device_name?: string;
}

/**
 * GraphQL Authentication Service
 */
export class GraphQLAuthService {
	private config: GraphQLAuthConfig;
	private serverClient: ReturnType<typeof createServerClient> | null = null;
	private browserClient: ReturnType<typeof createBrowserClient> | null = null;

	constructor(config: GraphQLAuthConfig = {}) {
		this.config = {
			endpoint: '/api/graphql',
			timeout: 10000,
			enableCache: true,
			fallbackToRest: true,
			...config
		};
	}

	/**
	 * Initialize GraphQL client based on environment
	 */
	private getClient(token?: string) {
		if (browser) {
			if (!this.browserClient) {
				this.browserClient = createBrowserClient({
					endpoint: this.config.endpoint,
					timeout: this.config.timeout,
					enableCache: this.config.enableCache
				});
			}
			return this.browserClient;
		} else {
			// Server-side: create new client with token
			return createServerClient(token, {
				endpoint: this.config.endpoint,
				timeout: this.config.timeout,
				enableCache: this.config.enableCache
			});
		}
	}

	/**
	 * Authenticate user via GraphQL login mutation
	 */
	async login(credentials: GraphQLLoginCredentials): Promise<GraphQLAuthResult> {
		try {
			const client = this.getClient();
			
			const mutation = `
				mutation Login($email: String!, $password: String!, $remember: Boolean, $deviceName: String) {
					login(
						email: $email, 
						password: $password, 
						remember: $remember,
						device_name: $deviceName
					) {
						success
						user {
							id
							email
							name
							roles {
								id
								name
								level
								display_name
							}
							department {
								id
								name
							}
							job_title
							is_active
						}
						token
						expires_at
						session_id
						error
					}
				}
			`;

			const variables = {
				email: credentials.email,
				password: credentials.password,
				remember: credentials.remember || false,
				deviceName: credentials.device_name || 'SvelteHR Web App'
			};

			const response = await client.query<{ login: LoginResponse }>(mutation, variables);
			
			if (response.errors?.length > 0) {
				return {
					success: false,
					authenticated: false,
					permissions: [],
					roles: [],
					error: response.errors[0].message
				};
			}

			const loginData = response.data?.login;
			
			if (!loginData?.success || !loginData.user) {
				return {
					success: false,
					authenticated: false,
					permissions: [],
					roles: [],
					error: loginData?.error || 'Login failed'
				};
			}

			// Extract roles and permissions
			const roles = loginData.user.roles?.map(role => role.name) || [];
			const permissions = await this.getUserPermissions(loginData.token!, loginData.user);

			return {
				success: true,
				authenticated: true,
				user: loginData.user,
				permissions,
				roles,
				token: loginData.token,
				expires_at: loginData.expires_at,
				session_id: loginData.session_id
			};

		} catch (error: any) {
			console.error('GraphQL login failed:', error);
			
			return {
				success: false,
				authenticated: false,
				permissions: [],
				roles: [],
				error: error.message || 'Authentication service unavailable'
			};
		}
	}

	/**
	 * Verify Bearer token and get user context via GraphQL
	 */
	async verifyToken(token: string): Promise<GraphQLAuthResult> {
		try {
			const client = this.getClient(token);
			
			const query = `
				query VerifyToken {
					me {
						user {
							id
							email
							name
							roles {
								id
								name
								level
								display_name
							}
							department {
								id
								name
							}
							job_title
							is_active
							created_at
							updated_at
						}
						authenticated
						permissions
						session {
							id
							expires_at
							last_accessed
						}
					}
				}
			`;

			const response = await client.query<{ me: AuthResponse }>(query);
			
			if (response.errors?.length > 0) {
				return {
					success: false,
					authenticated: false,
					permissions: [],
					roles: [],
					error: response.errors[0].message
				};
			}

			const authData = response.data?.me;
			
			if (!authData?.authenticated || !authData.user) {
				return {
					success: false,
					authenticated: false,
					permissions: [],
					roles: [],
					error: 'Token verification failed'
				};
			}

			const roles = authData.user.roles?.map(role => role.name) || [];
			
			return {
				success: true,
				authenticated: true,
				user: authData.user,
				permissions: authData.permissions || [],
				roles,
				token,
				expires_at: authData.session?.expires_at,
				session_id: authData.session?.id
			};

		} catch (error: any) {
			console.error('GraphQL token verification failed:', error);
			
			return {
				success: false,
				authenticated: false,
				permissions: [],
				roles: [],
				error: error.message || 'Token verification failed'
			};
		}
	}

	/**
	 * Get user permissions based on roles
	 */
	private async getUserPermissions(token: string, user: User): Promise<string[]> {
		try {
			const client = this.getClient(token);
			
			const query = `
				query GetUserPermissions($userId: ID!) {
					user(id: $userId) {
						roles {
							permissions {
								name
								resource
								action
							}
						}
					}
				}
			`;

			const response = await client.query<{
				user: {
					roles: Array<{
						permissions: Permission[]
					}>
				}
			}>(query, { userId: user.id });

			if (response.errors?.length > 0 || !response.data?.user) {
				// Fallback to role-based permission mapping
				return this.mapRolePermissions(user.roles || []);
			}

			// Extract permissions from GraphQL response
			const permissions: string[] = [];
			response.data.user.roles.forEach(role => {
				role.permissions.forEach(permission => {
					const permissionStr = `${permission.resource}:${permission.action}`;
					if (!permissions.includes(permissionStr)) {
						permissions.push(permissionStr);
					}
				});
			});

			return permissions;

		} catch (error) {
			console.warn('Failed to fetch permissions via GraphQL, using role-based fallback:', error);
			return this.mapRolePermissions(user.roles || []);
		}
	}

	/**
	 * Map roles to permissions (fallback when GraphQL permission query fails)
	 */
	private mapRolePermissions(roles: Role[]): string[] {
		const permissionMap: Record<string, string[]> = {
			'Admin': ['*'],
			'HR_Manager': [
				'employees:read', 'employees:write', 'employees:delete',
				'departments:read', 'departments:write',
				'payroll:read', 'payroll:write',
				'reports:hr', 'compliance:*', 'recruitment:*'
			],
			'Manager': [
				'employees:read', 'team:manage',
				'reports:team', 'approvals:manage',
				'department_employees:read', 'department_employees:write'
			],
			'Employee': [
				'profile:read', 'profile:update',
				'timesheet:read', 'timesheet:write',
				'leave:create', 'leave:read',
				'documents:own'
			]
		};

		const permissions: string[] = [];
		
		roles.forEach(role => {
			const rolePermissions = permissionMap[role.name] || ['profile:read'];
			rolePermissions.forEach(permission => {
				if (!permissions.includes(permission)) {
					permissions.push(permission);
				}
			});
		});

		return permissions;
	}

	/**
	 * Refresh authentication token
	 */
	async refreshToken(token: string): Promise<GraphQLAuthResult> {
		try {
			const client = this.getClient(token);
			
			const mutation = `
				mutation RefreshToken {
					refreshToken {
						success
						token
						expires_at
						error
					}
				}
			`;

			const response = await client.mutate<{
				refreshToken: {
					success: boolean;
					token: string;
					expires_at: string;
					error?: string;
				}
			}>(mutation);

			if (response.errors?.length > 0 || !response.data?.refreshToken?.success) {
				return {
					success: false,
					authenticated: false,
					permissions: [],
					roles: [],
					error: response.data?.refreshToken?.error || 'Token refresh failed'
				};
			}

			// Get updated user context with new token
			const newToken = response.data.refreshToken.token;
			const userContext = await this.verifyToken(newToken);
			
			return {
				...userContext,
				token: newToken,
				expires_at: response.data.refreshToken.expires_at
			};

		} catch (error: any) {
			console.error('GraphQL token refresh failed:', error);
			
			return {
				success: false,
				authenticated: false,
				permissions: [],
				roles: [],
				error: error.message || 'Token refresh failed'
			};
		}
	}

	/**
	 * Logout user and invalidate session
	 */
	async logout(token: string, allDevices: boolean = false): Promise<{ success: boolean; error?: string }> {
		try {
			const client = this.getClient(token);
			
			const mutation = `
				mutation Logout($allDevices: Boolean) {
					logout(all_devices: $allDevices) {
						success
						message
					}
				}
			`;

			const response = await client.mutate<{
				logout: {
					success: boolean;
					message: string;
				}
			}>(mutation, { allDevices });

			if (response.errors?.length > 0) {
				return {
					success: false,
					error: response.errors[0].message
				};
			}

			return {
				success: response.data?.logout?.success || false
			};

		} catch (error: any) {
			console.error('GraphQL logout failed:', error);
			
			return {
				success: false,
				error: error.message || 'Logout failed'
			};
		}
	}

	/**
	 * Get current user context (same as verifyToken but focused on user data)
	 */
	async getCurrentUser(token: string): Promise<GraphQLAuthResult> {
		return this.verifyToken(token);
	}

	/**
	 * Check if user has specific permission
	 */
	async hasPermission(token: string, permission: string): Promise<boolean> {
		const authResult = await this.verifyToken(token);
		
		if (!authResult.success || !authResult.authenticated) {
			return false;
		}

		// Admin wildcard permission
		if (authResult.permissions.includes('*')) {
			return true;
		}

		// Direct permission match
		if (authResult.permissions.includes(permission)) {
			return true;
		}

		// Wildcard resource match (e.g., employees:* matches employees:read)
		const [resource] = permission.split(':');
		return authResult.permissions.includes(`${resource}:*`);
	}

	/**
	 * Check if user has any of the specified roles
	 */
	async hasRole(token: string, roles: string[]): Promise<boolean> {
		const authResult = await this.verifyToken(token);
		
		if (!authResult.success || !authResult.authenticated) {
			return false;
		}

		return roles.some(role => authResult.roles.includes(role));
	}
}

/**
 * Global GraphQL Authentication Service instance
 */
export const graphqlAuthService = new GraphQLAuthService({
	endpoint: '/api/graphql',
	timeout: 10000,
	enableCache: true,
	fallbackToRest: true
});

/**
 * Export types for TypeScript support
 */
export type {
	GraphQLAuthConfig,
	GraphQLAuthResult,
	GraphQLLoginCredentials
};