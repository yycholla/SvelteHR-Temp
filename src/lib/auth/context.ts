/**
 * Session-Based User Context Extraction
 *
 * This module provides utilities for extracting and managing user context
 * from session-based authentication. Replaces JWT token-based context extraction.
 */

import type { RequestEvent } from '@sveltejs/kit';

/**
 * User context interface extracted from session
 */
export interface UserContext {
	user_id: string;
	email: string;
	role: string;
	display_name?: string;
	full_name?: string;
	department_id?: string;
	permissions?: string[];
	session_id?: string;
	authenticated_at?: Date;
}

/**
 * Extract user context from SvelteKit request event locals
 *
 * This function retrieves user information from the session data
 * that was populated by the server hooks during authentication.
 *
 * @param event - SvelteKit RequestEvent with locals populated by hooks
 * @returns UserContext if authenticated, null otherwise
 *
 * @example
 * ```typescript
 * // In +page.server.ts
 * export const load: PageServerLoad = async ({ event }) => {
 *   const userContext = extractUserContext(event);
 *   if (!userContext) {
 *     throw redirect(303, '/login');
 *   }
 *   return { user: userContext };
 * };
 * ```
 */
export function extractUserContext(event: RequestEvent): UserContext | null {
	// User data is populated by hooks.server.ts after session validation
	const user = event.locals.user;

	if (!user) {
		return null;
	}

	// Transform to standardized context format
	return {
		user_id: user.id,
		email: user.email,
		role: user.role || 'employee',
		display_name: user.display_name,
		full_name: (user as any).full_name,
		department_id: (user as any).department_id,
		permissions: event.locals.permissions || [],
		authenticated_at: new Date()
	};
}

/**
 * Check if user has specific permission
 *
 * @param event - SvelteKit RequestEvent
 * @param permission - Permission string to check
 * @returns true if user has permission
 */
export function hasPermission(event: RequestEvent, permission: string): boolean {
	const permissions = event.locals.permissions || [];
	return permissions.includes('*') || permissions.includes(permission);
}

/**
 * Check if user has specific role
 *
 * @param event - SvelteKit RequestEvent
 * @param role - Role string to check
 * @returns true if user has role
 */
export function hasRole(event: RequestEvent, role: string): boolean {
	const user = event.locals.user;
	if (!user) return false;
	return user.role === role;
}

/**
 * Check if user has minimum role level
 * Role hierarchy: super_admin > admin > hr_manager > manager > employee
 *
 * @param event - SvelteKit RequestEvent
 * @param minimumRole - Minimum required role
 * @returns true if user meets minimum role requirement
 */
export function hasMinimumRole(event: RequestEvent, minimumRole: string): boolean {
	const roleHierarchy: Record<string, number> = {
		'super_admin': 100,
		'admin': 75,
		'hr_manager': 50,
		'manager': 25,
		'employee': 10
	};

	const user = event.locals.user;
	if (!user) return false;

	const userLevel = roleHierarchy[user.role || 'employee'] || 0;
	const requiredLevel = roleHierarchy[minimumRole] || 0;

	return userLevel >= requiredLevel;
}

/**
 * Require authentication for a route
 * Throws redirect to login if user is not authenticated
 *
 * @param event - SvelteKit RequestEvent
 * @param redirectPath - Optional custom redirect path (default: /login)
 * @throws {redirect} 303 redirect to login page
 *
 * @example
 * ```typescript
 * export const load: PageServerLoad = async (event) => {
 *   requireAuth(event);
 *   // User is guaranteed to be authenticated after this point
 *   return { user: event.locals.user };
 * };
 * ```
 */
export async function requireAuth(event: RequestEvent, redirectPath: string = '/login'): Promise<void> {
	if (!event.locals.user) {
		const { redirect } = await import('@sveltejs/kit');
		const returnUrl = encodeURIComponent(event.url.pathname + event.url.search);
		throw redirect(303, `${redirectPath}?redirectTo=${returnUrl}`);
	}
}

/**
 * Require specific permission for a route
 * Throws error if user doesn't have permission
 *
 * @param event - SvelteKit RequestEvent
 * @param permission - Required permission
 * @throws {error} 403 Forbidden if user lacks permission
 */
export async function requirePermission(event: RequestEvent, permission: string): Promise<void> {
	await requireAuth(event);

	if (!hasPermission(event, permission)) {
		const { error } = await import('@sveltejs/kit');
		throw error(403, {
			message: 'Insufficient permissions',
			required: permission
		});
	}
}

/**
 * Require specific role for a route
 * Throws error if user doesn't have role
 *
 * @param event - SvelteKit RequestEvent
 * @param requiredRole - Required role
 * @throws {error} 403 Forbidden if user lacks role
 */
export async function requireRole(event: RequestEvent, requiredRole: string): Promise<void> {
	await requireAuth(event);

	if (!hasRole(event, requiredRole)) {
		const { error } = await import('@sveltejs/kit');
		throw error(403, {
			message: 'Insufficient role level',
			required: requiredRole,
			current: event.locals.user?.role
		});
	}
}

/**
 * Get user's session duration
 *
 * @param event - SvelteKit RequestEvent
 * @returns Session duration in milliseconds, or null if not authenticated
 */
export function getSessionDuration(event: RequestEvent): number | null {
	const userContext = extractUserContext(event);
	if (!userContext || !userContext.authenticated_at) {
		return null;
	}

	return Date.now() - userContext.authenticated_at.getTime();
}

/**
 * Create audit log entry for user action
 *
 * @param event - SvelteKit RequestEvent
 * @param action - Action being performed
 * @param resource - Resource being acted upon
 * @returns Audit log object
 */
export function createAuditLogEntry(
	event: RequestEvent,
	action: string,
	resource: string
): {
	user_id: string | null;
	action: string;
	resource: string;
	ip_address: string;
	user_agent: string;
	timestamp: Date;
} {
	const userContext = extractUserContext(event);

	return {
		user_id: userContext?.user_id || null,
		action,
		resource,
		ip_address: event.getClientAddress(),
		user_agent: event.request.headers.get('user-agent') || 'unknown',
		timestamp: new Date()
	};
}
