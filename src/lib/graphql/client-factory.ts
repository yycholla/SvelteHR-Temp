/**
 * GraphQL Client Factory
 * 
 * Provides standardized factory functions for creating GraphQL clients
 * with appropriate configuration for different contexts (server vs browser).
 * Handles token management, endpoint configuration, and performance optimization.
 */

import { browser } from '$app/environment';
import { GRAPHQL_CONFIG } from '$lib/env';
import type { ClientConfig } from './types';
import { ServerGraphQLClient, BrowserGraphQLClient, createServerGraphQLClient, createBrowserGraphQLClient } from './client';

/**
 * Configuration options for client factory
 */
export interface ClientFactoryConfig {
	endpoint?: string;
	token?: string;
	headers?: Record<string, string>;
	timeout?: number;
	enableCache?: boolean;
	retryAttempts?: number;
}

/**
 * Default configuration based on environment
 */
const getDefaultConfig = (): ClientConfig => ({
	endpoint: '/api/graphql',
	timeout: GRAPHQL_CONFIG?.queryTimeout || 30000,
	enableCache: GRAPHQL_CONFIG?.enableCaching || true,
	retryAttempts: 3,
	headers: {
		'Content-Type': 'application/json',
		'Accept': 'application/json'
	}
});

/**
 * Create GraphQL client appropriate for current environment
 * 
 * @param config - Client configuration options
 * @returns GraphQL client instance (ServerGraphQLClient or BrowserGraphQLClient)
 * 
 * @example
 * ```typescript
 * // In +page.server.ts
 * const client = createGraphQLClient({ 
 *   token: cookies.get('hr_token') 
 * });
 * 
 * // In component
 * const client = createGraphQLClient();
 * ```
 */
export function createGraphQLClient(config: ClientFactoryConfig = {}): ServerGraphQLClient | BrowserGraphQLClient {
	const clientConfig: ClientConfig = {
		...getDefaultConfig(),
		...config
	};

	if (browser) {
		return createBrowserGraphQLClient(clientConfig);
	} else {
		return createServerGraphQLClient(config.token, clientConfig);
	}
}

/**
 * Create server-side GraphQL client with Bearer token authentication
 * 
 * @param token - JWT Bearer token from cookies
 * @param config - Additional client configuration
 * @returns ServerGraphQLClient instance
 * 
 * @example
 * ```typescript
 * // In +page.server.ts
 * export const load: PageServerLoad = async ({ cookies }) => {
 *   const token = cookies.get('hr_token') || cookies.get('auth-token');
 *   const client = createServerClient(token);
 *   
 *   const result = await client.query(`
 *     query GetEmployees($first: Int) {
 *       employees(first: $first) {
 *         nodes { id full_name email }
 *       }
 *     }
 *   `, { first: 20 });
 *   
 *   return { employees: result.data?.employees };
 * };
 * ```
 */
export function createServerClient(
	token?: string,
	config: Omit<ClientFactoryConfig, 'token'> = {}
): ServerGraphQLClient {
	const clientConfig: ClientConfig = {
		...getDefaultConfig(),
		...config
	};

	const client = createServerGraphQLClient(token, clientConfig);
	
	// Set token if provided
	if (token) {
		client.setToken(token);
	}

	return client;
}

/**
 * Create browser-side GraphQL client with caching and deduplication
 * 
 * @param config - Client configuration options
 * @returns BrowserGraphQLClient instance
 * 
 * @example
 * ```typescript
 * // In Svelte component (client-side)
 * import { createBrowserClient } from '$lib/graphql/client-factory';
 * 
 * const client = createBrowserClient({ 
 *   enableCache: true,
 *   timeout: 10000
 * });
 * 
 * const result = await client.query(`
 *   query GetDashboard {
 *     dashboardData { widgets { title data } }
 *   }
 * `);
 * ```
 */
export function createBrowserClient(
	config: ClientFactoryConfig = {}
): BrowserGraphQLClient {
	const clientConfig: ClientConfig = {
		...getDefaultConfig(),
		enableCache: true, // Always enable caching for browser clients
		cacheTtl: GRAPHQL_CONFIG?.cacheTTL || 300000, // 5 minutes default
		...config
	};

	return createBrowserGraphQLClient(clientConfig);
}

/**
 * Create authenticated GraphQL client from SvelteKit cookies
 * 
 * @param cookies - SvelteKit cookies object
 * @param config - Additional configuration
 * @returns GraphQL client with authentication token
 * 
 * @example
 * ```typescript
 * // In +page.server.ts or +layout.server.ts
 * export const load: PageServerLoad = async ({ cookies }) => {
 *   const client = createAuthenticatedClient(cookies);
 *   
 *   try {
 *     const user = await client.query(`query { me { user { id name email } } }`);
 *     return { user: user.data?.me?.user };
 *   } catch (error) {
 *     // Handle authentication error
 *     throw redirect(303, '/login');
 *   }
 * };
 * ```
 */
export function createAuthenticatedClient(
	cookies: { get(name: string): string | undefined },
	config: Omit<ClientFactoryConfig, 'token'> = {}
): ServerGraphQLClient {
	// Try primary token first, fallback to secondary
	const token = cookies.get('hr_token') || cookies.get('auth-token');
	
	if (!token) {
		throw new Error('No authentication token found in cookies');
	}

	return createServerClient(token, config);
}

/**
 * Create GraphQL client for API routes
 * 
 * @param request - SvelteKit Request object
 * @param config - Additional configuration
 * @returns GraphQL client with Bearer token from Authorization header
 * 
 * @example
 * ```typescript
 * // In API route (+server.ts)
 * export const POST: RequestHandler = async ({ request }) => {
 *   const client = createApiClient(request);
 *   
 *   const result = await client.mutate(`
 *     mutation CreateEmployee($input: CreateEmployeeInput!) {
 *       createEmployee(input: $input) { id full_name }
 *     }
 *   `, { input: await request.json() });
 *   
 *   return json(result);
 * };
 * ```
 */
export function createApiClient(
	request: Request,
	config: Omit<ClientFactoryConfig, 'token'> = {}
): ServerGraphQLClient {
	// Extract Bearer token from Authorization header
	const authHeader = request.headers.get('Authorization');
	const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
	
	if (!token) {
		throw new Error('No Bearer token found in Authorization header');
	}

	return createServerClient(token, config);
}

/**
 * Create GraphQL client with role-based configuration
 * 
 * @param token - Authentication token
 * @param userRole - User role for performance configuration
 * @param config - Additional configuration
 * @returns GraphQL client optimized for user role
 * 
 * @example
 * ```typescript
 * // Configure client based on user role
 * const client = createRoleBasedClient(token, 'Admin', {
 *   timeout: 60000, // Longer timeout for admin complex queries
 *   retryAttempts: 5
 * });
 * ```
 */
export function createRoleBasedClient(
	token: string,
	userRole: string,
	config: Omit<ClientFactoryConfig, 'token'> = {}
): ServerGraphQLClient {
	// Role-based performance configuration
	const roleConfig: Record<string, Partial<ClientConfig>> = {
		'Admin': {
			timeout: 60000, // 60 seconds for complex admin queries
			retryAttempts: 5
		},
		'HR_Manager': {
			timeout: 30000, // 30 seconds for HR operations
			retryAttempts: 4
		},
		'Manager': {
			timeout: 20000, // 20 seconds for manager queries
			retryAttempts: 3
		},
		'Employee': {
			timeout: 15000, // 15 seconds for employee queries
			retryAttempts: 2
		}
	};

	const clientConfig: ClientConfig = {
		...getDefaultConfig(),
		...roleConfig[userRole],
		...config
	};

	return createServerClient(token, clientConfig);
}

/**
 * Utility function to test GraphQL client connectivity
 * 
 * @param client - GraphQL client instance
 * @returns Promise resolving to connection status
 * 
 * @example
 * ```typescript
 * const client = createGraphQLClient();
 * const isConnected = await testConnection(client);
 * 
 * if (!isConnected) {
 *   console.error('GraphQL server unavailable');
 * }
 * ```
 */
export async function testConnection(
	client: ServerGraphQLClient | BrowserGraphQLClient
): Promise<boolean> {
	try {
		const result = await client.query(`
			query TestConnection {
				__schema {
					queryType {
						name
					}
				}
			}
		`);
		
		return result.data?.__schema?.queryType?.name === 'Query';
	} catch (error) {
		console.warn('GraphQL connection test failed:', error);
		return false;
	}
}

/**
 * Create GraphQL client with development tools enabled
 * Only available in development environment
 * 
 * @param config - Client configuration
 * @returns GraphQL client with debugging features
 */
export function createDevClient(
	config: ClientFactoryConfig = {}
): ServerGraphQLClient | BrowserGraphQLClient {
	if (process.env.NODE_ENV === 'production') {
		console.warn('Development client requested in production - using standard client');
		return createGraphQLClient(config);
	}

	const devConfig: ClientConfig = {
		...getDefaultConfig(),
		...config,
		headers: {
			...getDefaultConfig().headers,
			...config.headers,
			'X-GraphQL-Debug': 'true'
		}
	};

	return browser 
		? createBrowserGraphQLClient(devConfig)
		: createServerGraphQLClient(config.token, devConfig);
}

// Export client classes for direct usage if needed
export { ServerGraphQLClient, BrowserGraphQLClient } from './client';

// Export types for TypeScript support
export type { ClientConfig, GraphQLRequest, GraphQLResponse, GraphQLError } from './types';