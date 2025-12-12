/**
 * RBAC-aware data loader with integrated GraphQL client
 *
 * Extends BaseRouteLoader to provide built-in GraphQL client access,
 * eliminating the need to manually create a client in every route.
 *
 * @example
 * ```typescript
 * export const load: PageServerLoad = async (event) => {
 *   const loader = new RBACDataLoader(event, ['tasks:read']);
 *
 *   return loader.loadWithClient(async (client) => {
 *     const tasks = await client.query(GET_TASKS, { limit: 20 }, {
 *       operationName: 'GetTasks',
 *       dataPath: 'tasks'
 *     });
 *
 *     return { tasks };
 *   });
 * };
 * ```
 */

import type { RequestEvent } from '@sveltejs/kit';
import { BaseRouteLoader } from './base-loader';
import { createGraphQLClient, type UnifiedGraphQLClient } from '$lib/server/graphql/unified-client';

/**
 * Route loader with built-in GraphQL client
 *
 * Combines RBAC authentication, permission management, and GraphQL client
 * into a single convenient base class for data-fetching routes.
 */
export class RBACDataLoader extends BaseRouteLoader {
	/** Configured GraphQL client with session cookies */
	protected client: UnifiedGraphQLClient;

	/**
	 * Create a new data loader with GraphQL client
	 *
	 * @param event - SvelteKit request event
	 * @param requiredPermissions - Permissions required to access this route
	 * @throws {redirect} 303 to /login if user is not authenticated
	 * @throws {error} 403 if user lacks required permissions
	 */
	constructor(event: RequestEvent, requiredPermissions: string[] = []) {
		super(event, requiredPermissions);

		// Create GraphQL client with session cookies
		this.client = createGraphQLClient(event);
	}

	/**
	 * Load data using the GraphQL client
	 *
	 * Convenience method that provides the GraphQL client as a parameter
	 * to a callback function, eliminating boilerplate.
	 *
	 * @param loadFn - Async function that receives the GraphQL client
	 * @returns Standardized page data with user session and loaded data
	 *
	 * @example
	 * ```typescript
	 * return loader.loadWithClient(async (client) => {
	 *   const [tasks, users] = await Promise.all([
	 *     client.query(GET_TASKS, { limit: 20 }),
	 *     client.query(GET_USERS, { limit: 100 })
	 *   ]);
	 *
	 *   return { tasks, users };
	 * });
	 * ```
	 */
	async loadWithClient(
		loadFn: (client: UnifiedGraphQLClient) => Promise<Record<string, any>>
	): Promise<Record<string, any>> {
		// Override the load method with the provided callback
		this['load'] = () => loadFn(this.client);
		return this.execute();
	}

	/**
	 * Default load implementation delegates to loadWithClient callback
	 *
	 * This is overridden by subclasses or replaced by loadWithClient usage.
	 */
	protected async load(): Promise<Record<string, any>> {
		// Default implementation - subclasses override or use loadWithClient
		return {};
	}
}

/**
 * Create a quick data loader for simple routes
 *
 * Factory function for routes that don't need custom loader classes.
 * Provides the most concise syntax for basic data loading scenarios.
 *
 * @param event - SvelteKit request event
 * @param requiredPermissions - Permissions required to access this route
 * @param loadFn - Async function that receives the GraphQL client
 * @returns Standardized page data with user session and loaded data
 *
 * @example
 * ```typescript
 * export const load: PageServerLoad = async (event) => {
 *   return quickLoad(event, ['tasks:read'], async (client) => {
 *     const tasks = await client.query(GET_TASKS, { limit: 20 });
 *     return { tasks };
 *   });
 * };
 * ```
 */
export async function quickLoad(
	event: RequestEvent,
	requiredPermissions: string[],
	loadFn: (client: UnifiedGraphQLClient) => Promise<Record<string, any>>
): Promise<Record<string, any>> {
	const loader = new RBACDataLoader(event, requiredPermissions);

	// Override the load method with the provided function
	loader['load'] = () => loadFn(loader['client']);

	return loader.execute();
}
