import { error, redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export interface RBACConfig {
	requiredPermissions?: string[];
	requiredRoles?: string[];
	allowedRoles?: string[];
	requireAll?: boolean; // If true, user must have ALL permissions/roles, if false, ANY will do
}

/**
 * Check if user has required permissions
 */
export function hasPermission(
	userPermissions: string[],
	requiredPermissions: string[],
	requireAll: boolean = false
): boolean {
	if (!requiredPermissions || requiredPermissions.length === 0) return true;
	if (!userPermissions || userPermissions.length === 0) return false;

	// Admin users with '*' or '*:*' permission have access to everything
	if (userPermissions.includes('*') || userPermissions.includes('*:*')) return true;

	if (requireAll) {
		// User must have ALL required permissions
		return requiredPermissions.every((permission) => userPermissions.includes(permission));
	} else {
		// User needs ANY of the required permissions
		return requiredPermissions.some((permission) => userPermissions.includes(permission));
	}
}

/**
 * Check if user has required roles
 */
export function hasRole(
	userRoles: string[],
	requiredRoles: string[],
	requireAll: boolean = false
): boolean {
	if (!requiredRoles || requiredRoles.length === 0) return true;
	if (!userRoles || userRoles.length === 0) return false;

	if (requireAll) {
		// User must have ALL required roles
		return requiredRoles.every((role) => userRoles.includes(role));
	} else {
		// User needs ANY of the required roles
		return requiredRoles.some((role) => userRoles.includes(role));
	}
}

/**
 * Main RBAC guard function for server-side load functions
 * Uses TypeScript assertion to guarantee locals.user is defined after this call
 */
export function requireAuth(
	event: RequestEvent,
	config: RBACConfig = {}
): asserts event is RequestEvent & {
	locals: { user: NonNullable<RequestEvent['locals']['user']> };
} {
	const { locals } = event;

	// Check if user is authenticated
	if (!locals.user) {
		const redirectTo =
			event.url.pathname === '/' ? '' : `?redirectTo=${encodeURIComponent(event.url.pathname)}`;
		throw redirect(303, `/login${redirectTo}`);
	}

	const {
		requiredPermissions = [],
		requiredRoles = [],
		allowedRoles = [],
		requireAll = false
	} = config;

	// Check permissions if specified
	if (requiredPermissions.length > 0) {
		const hasRequiredPermissions = hasPermission(
			locals.permissions || [],
			requiredPermissions,
			requireAll
		);

		if (!hasRequiredPermissions) {
			throw error(
				403,
				'Access forbidden: You do not have the required permissions to access this resource'
			);
		}
	}

	// Check required roles if specified
	if (requiredRoles.length > 0) {
		const hasRequiredRoles = hasRole(locals.roles || [], requiredRoles, requireAll);

		if (!hasRequiredRoles) {
			throw error(
				403,
				'Access forbidden: You do not have the required role to access this resource'
			);
		}
	}

	// Check allowed roles if specified (alternative to required roles)
	if (allowedRoles.length > 0 && requiredRoles.length === 0) {
		const hasAllowedRole = hasRole(
			locals.roles || [],
			allowedRoles,
			false // ANY of the allowed roles is sufficient
		);

		if (!hasAllowedRole) {
			throw error(403, 'Access forbidden: Your role does not have access to this resource');
		}
	}
}

/**
 * Assert that user is authenticated (for API handlers)
 * This is a simpler version of requireAuth for use in API routes that don't have full RequestEvent
 * Uses TypeScript assertion to guarantee locals.user is defined after this call
 */
export function assertUser(
	locals: App.Locals
): asserts locals is App.Locals & { user: NonNullable<App.Locals['user']> } {
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}
}
