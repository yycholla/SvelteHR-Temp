/**
 * Base class for server-side route loaders with RBAC and session handling
 *
 * Eliminates ~50-70 lines of boilerplate from each +page.server.ts file by:
 * - Handling authentication via requireAuth()
 * - Managing user session data
 * - Computing permission checks via getUserPermissions()
 * - Providing standardized error handling
 * - Ensuring consistent return structure across all routes
 *
 * @example
 * ```typescript
 * class TasksLoader extends BaseRouteLoader {
 *   protected async load() {
 *     const client = createGraphQLClient(this.event);
 *     const tasks = await client.query(GET_TASKS, { limit: 20 });
 *     return { tasks };
 *   }
 * }
 *
 * export const load: PageServerLoad = async (event) => {
 *   const loader = new TasksLoader(event, ['tasks:read', 'tasks:read:self']);
 *   return loader.execute();
 * };
 * ```
 */

import type { RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { requireAuth, getUserPermissions } from '$lib/server/rbac-utils';
import { logger } from '$lib/utils/logger';

/**
 * Base route loader with authentication and permission management
 *
 * Provides a consistent foundation for all server-side load functions:
 * - Automatic authentication enforcement
 * - User session and permission extraction
 * - Standardized error handling
 * - Consistent return data structure
 */
export abstract class BaseRouteLoader {
	/** SvelteKit request event */
	protected event: RequestEvent;

	/** Server-side locals (guaranteed to have user after constructor) */
	protected locals: App.Locals & { user: NonNullable<App.Locals['user']> };

	/** User permissions and computed boolean flags */
	protected permissions: ReturnType<typeof getUserPermissions>;

	/**
	 * Create a new route loader with authentication
	 *
	 * @param event - SvelteKit request event
	 * @param requiredPermissions - Permissions required to access this route (ANY match)
	 * @throws {redirect} 303 to /login if user is not authenticated
	 * @throws {error} 403 if user lacks required permissions
	 */
	constructor(event: RequestEvent, requiredPermissions: string[] = []) {
		this.event = event;

		// Enforce authentication and permissions
		// After this call, TypeScript knows event.locals.user is defined
		requireAuth(event, { requiredPermissions });

		// Re-destructure locals after auth check
		// TypeScript assertion ensures user is non-null
		this.locals = event.locals as App.Locals & { user: NonNullable<App.Locals['user']> };

		// Compute user permissions (includes boolean flags like canViewEmployees)
		this.permissions = getUserPermissions(this.locals);
	}

	/**
	 * Execute the load function with error handling
	 *
	 * Calls the abstract load() method and wraps the result with:
	 * - User session data (user, roles, permissions)
	 * - Permission boolean flags (canViewEmployees, canEditTasks, etc.)
	 * - Timestamp of when data was loaded
	 *
	 * @returns Standardized page data with user session and permissions
	 * @throws {error} SvelteKit error with appropriate status code
	 */
	async execute(): Promise<Record<string, any>> {
		try {
			// Call subclass implementation
			const data = await this.load();

			// Return standardized structure
			return {
				// Spread all permission booleans and user data
				...this.permissions,

				// Add route-specific data
				...data,

				// Add metadata
				loadedAt: new Date().toISOString()
			};
		} catch (err) {
			// Log the error for debugging
			logger.error('[Route Load Error]', err as Error, {
				route: this.event.url.pathname,
				userId: this.locals.user.id,
				userRole: this.locals.user.role
			});

			// If it's already a SvelteKit error (with status code), re-throw it
			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			// Otherwise, wrap it in a generic 500 error
			const message = err instanceof Error ? err.message : 'Failed to load page data';
			throw error(
				500,
				`Unable to load data: ${message}. Please refresh the page or try again later.`
			);
		}
	}

	/**
	 * Load route-specific data
	 *
	 * Subclasses implement this method to provide their specific data loading logic.
	 * Common operations:
	 * - Create GraphQL client: `createGraphQLClient(this.event)`
	 * - Query data: `await client.query(QUERY, variables)`
	 * - Extract URL params: `new QueryParamExtractor(this.event.url)`
	 * - Check permissions: `if (!this.permissions.canViewEmployees) { ... }`
	 *
	 * @returns Object with route-specific data to be merged into page data
	 * @throws {Error} Any error will be caught and handled by execute()
	 *
	 * @example
	 * ```typescript
	 * protected async load() {
	 *   const client = createGraphQLClient(this.event);
	 *   const params = new QueryParamExtractor(this.event.url);
	 *
	 *   const tasks = await client.query(GET_TASKS, {
	 *     limit: params.getInt('limit', 20),
	 *     status: params.getString('status')
	 *   });
	 *
	 *   return { tasks, totalTasks: tasks.length };
	 * }
	 * ```
	 */
	protected abstract load(): Promise<Record<string, any>>;

	/**
	 * Helper: Check if user has a specific permission
	 *
	 * @param permission - Permission string to check (e.g., 'employees:write')
	 * @returns True if user has the permission or is admin
	 *
	 * @example
	 * ```typescript
	 * if (loader.hasPermission('employees:write')) {
	 *   // Show edit button
	 * }
	 * ```
	 */
	public hasPermission(permission: string): boolean {
		const userPermissions = this.permissions.permissions;
		return (
			userPermissions.includes('*') ||
			userPermissions.includes('*:*') ||
			userPermissions.includes(permission)
		);
	}

	/**
	 * Helper: Check if user has a specific role
	 *
	 * @param role - Role name to check (e.g., 'Admin', 'Manager')
	 * @returns True if user has the role
	 *
	 * @example
	 * ```typescript
	 * if (loader.hasRole('Admin')) {
	 *   // Show admin panel
	 * }
	 * ```
	 */
	public hasRole(role: string): boolean {
		return this.permissions.roles.includes(role);
	}

	/**
	 * Helper: Get current user ID
	 *
	 * @returns Current authenticated user ID
	 */
	public getUserId(): string {
		return this.locals.user.id;
	}

	/**
	 * Helper: Get current user's role
	 *
	 * @returns Current user's primary role
	 */
	public getUserRole(): string {
		return this.locals.user.role || 'employee';
	}
}
