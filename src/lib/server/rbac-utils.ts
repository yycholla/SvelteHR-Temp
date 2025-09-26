/**
 * Server-side RBAC utilities for SvelteKit load functions
 * Provides consistent permission checking across all pages
 */

import { redirect, error } from '@sveltejs/kit';
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
export function hasPermission(userPermissions: string[], requiredPermissions: string[], requireAll: boolean = false): boolean {
	if (!requiredPermissions || requiredPermissions.length === 0) return true;
	if (!userPermissions || userPermissions.length === 0) return false;

	// Admin users with '*' permission have access to everything
	if (userPermissions.includes('*')) return true;

	if (requireAll) {
		// User must have ALL required permissions
		return requiredPermissions.every(permission => userPermissions.includes(permission));
	} else {
		// User needs ANY of the required permissions
		return requiredPermissions.some(permission => userPermissions.includes(permission));
	}
}

/**
 * Check if user has required roles
 */
export function hasRole(userRoles: string[], requiredRoles: string[], requireAll: boolean = false): boolean {
	if (!requiredRoles || requiredRoles.length === 0) return true;
	if (!userRoles || userRoles.length === 0) return false;

	if (requireAll) {
		// User must have ALL required roles
		return requiredRoles.every(role => userRoles.includes(role));
	} else {
		// User needs ANY of the required roles
		return requiredRoles.some(role => userRoles.includes(role));
	}
}

/**
 * Main RBAC guard function for server-side load functions
 */
export function requireAuth(event: RequestEvent, config: RBACConfig = {}): void {
	const { locals } = event;

	// Check if user is authenticated
	if (!locals.user) {
		const redirectTo = event.url.pathname === '/' ? '' : `?redirectTo=${encodeURIComponent(event.url.pathname)}`;
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
			throw error(403, 'Access forbidden: You do not have the required permissions to access this resource');
		}
	}

	// Check required roles if specified
	if (requiredRoles.length > 0) {
		const hasRequiredRoles = hasRole(
			locals.roles || [],
			requiredRoles,
			requireAll
		);

		if (!hasRequiredRoles) {
			throw error(403, 'Access forbidden: You do not have the required role to access this resource');
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
 * Specific permission checks for common scenarios
 */
export const PermissionChecks = {
	// Dashboard access
	dashboard: (event: RequestEvent) => requireAuth(event, {
		requiredPermissions: ['dashboard:read']
	}),

	// Employee management
	employeeRead: (event: RequestEvent) => requireAuth(event, {
		requiredPermissions: ['employees:read']
	}),
	employeeWrite: (event: RequestEvent) => requireAuth(event, {
		requiredPermissions: ['employees:write']
	}),
	employeeManagement: (event: RequestEvent) => requireAuth(event, {
		requiredPermissions: ['employees:read'],
		allowedRoles: ['hr_admin', 'hr_manager', 'manager']
	}),

	// Department management
	departmentRead: (event: RequestEvent) => requireAuth(event, {
		requiredPermissions: ['departments:read']
	}),
	departmentWrite: (event: RequestEvent) => requireAuth(event, {
		requiredPermissions: ['departments:write']
	}),

	// Team management
	teamRead: (event: RequestEvent) => requireAuth(event, {
		requiredPermissions: ['teams:read']
	}),
	teamWrite: (event: RequestEvent) => requireAuth(event, {
		requiredPermissions: ['teams:write']
	}),

	// Management pages (requires manager level or above)
	management: (event: RequestEvent) => requireAuth(event, {
		requiredPermissions: ['management:read'],
		allowedRoles: ['hr_admin', 'hr_manager', 'manager']
	}),
	managementWrite: (event: RequestEvent) => requireAuth(event, {
		requiredPermissions: ['management:write'],
		allowedRoles: ['hr_admin', 'hr_manager', 'manager']
	}),

	// Leave management
	leaveRead: (event: RequestEvent) => requireAuth(event, {
		requiredPermissions: ['leave:read']
	}),
	leaveApproval: (event: RequestEvent) => requireAuth(event, {
		requiredPermissions: ['leave:approve'],
		allowedRoles: ['hr_admin', 'hr_manager', 'manager']
	}),

	// Performance management
	performanceRead: (event: RequestEvent) => requireAuth(event, {
		requiredPermissions: ['performance:read']
	}),
	performanceWrite: (event: RequestEvent) => requireAuth(event, {
		requiredPermissions: ['performance:write'],
		allowedRoles: ['hr_admin', 'hr_manager', 'manager']
	}),

	// Goals and OKRs
	goalsRead: (event: RequestEvent) => requireAuth(event, {
		requiredPermissions: ['goals:read']
	}),
	goalsWrite: (event: RequestEvent) => requireAuth(event, {
		requiredPermissions: ['goals:write'],
		allowedRoles: ['hr_admin', 'hr_manager', 'manager']
	}),

	// Reports
	reportsRead: (event: RequestEvent) => requireAuth(event, {
		requiredPermissions: ['reports:read']
	}),
	reportsWrite: (event: RequestEvent) => requireAuth(event, {
		requiredPermissions: ['reports:write'],
		allowedRoles: ['hr_admin', 'hr_manager', 'manager']
	}),
	reportsExecute: (event: RequestEvent) => requireAuth(event, {
		requiredPermissions: ['reports:execute'],
		allowedRoles: ['hr_admin', 'hr_manager', 'manager']
	}),
	reportsAnalytics: (event: RequestEvent) => requireAuth(event, {
		requiredPermissions: ['reports:analytics'],
		allowedRoles: ['hr_admin', 'hr_manager']
	}),

	// Admin pages
	adminRead: (event: RequestEvent) => requireAuth(event, {
		requiredPermissions: ['admin:read'],
		allowedRoles: ['hr_admin']
	}),
	adminWrite: (event: RequestEvent) => requireAuth(event, {
		requiredPermissions: ['admin:write'],
		allowedRoles: ['hr_admin']
	})
};

/**
 * Get user permissions for client-side components
 */
export function getUserPermissions(locals: App.Locals) {
	return {
		user: locals.user,
		permissions: locals.permissions || [],
		roles: locals.roles || [],

		// Computed permission checks
		canViewEmployees: hasPermission(locals.permissions || [], ['employees:read']),
		canManageEmployees: hasPermission(locals.permissions || [], ['employees:write']),
		canViewDepartments: hasPermission(locals.permissions || [], ['departments:read']),
		canManageDepartments: hasPermission(locals.permissions || [], ['departments:write']),
		canViewTeams: hasPermission(locals.permissions || [], ['teams:read']),
		canManageTeams: hasPermission(locals.permissions || [], ['teams:write']),
		canViewManagement: hasPermission(locals.permissions || [], ['management:read']) || hasRole(locals.roles || [], ['hr_admin', 'hr_manager', 'manager']),
		canManageLeave: hasPermission(locals.permissions || [], ['leave:approve']) || hasRole(locals.roles || [], ['hr_admin', 'hr_manager', 'manager']),
		canManagePerformance: hasPermission(locals.permissions || [], ['performance:write']) || hasRole(locals.roles || [], ['hr_admin', 'hr_manager', 'manager']),
		canManageGoals: hasPermission(locals.permissions || [], ['goals:write']) || hasRole(locals.roles || [], ['hr_admin', 'hr_manager', 'manager']),
		canViewReports: hasPermission(locals.permissions || [], ['reports:read']),
		canCreateReports: hasPermission(locals.permissions || [], ['reports:write']) || hasRole(locals.roles || [], ['hr_admin', 'hr_manager', 'manager']),
		canExecuteReports: hasPermission(locals.permissions || [], ['reports:execute']) || hasRole(locals.roles || [], ['hr_admin', 'hr_manager', 'manager']),
		canViewAnalytics: hasPermission(locals.permissions || [], ['reports:analytics']) || hasRole(locals.roles || [], ['hr_admin', 'hr_manager']),
		canViewAdmin: hasPermission(locals.permissions || [], ['admin:read']) || hasRole(locals.roles || [], ['hr_admin']),
		canManageAdmin: hasPermission(locals.permissions || [], ['admin:write']) || hasRole(locals.roles || [], ['hr_admin']),

		// Role checks
		isAdmin: hasRole(locals.roles || [], ['hr_admin']),
		isManager: hasRole(locals.roles || [], ['hr_admin', 'hr_manager', 'manager']),
		isEmployee: hasRole(locals.roles || [], ['employee'])
	};
}