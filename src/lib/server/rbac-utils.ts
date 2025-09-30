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
export function hasPermission(
	userPermissions: string[],
	requiredPermissions: string[],
	requireAll: boolean = false
): boolean {
	if (!requiredPermissions || requiredPermissions.length === 0) return true;
	if (!userPermissions || userPermissions.length === 0) return false;

	// Admin users with '*' permission have access to everything
	if (userPermissions.includes('*')) return true;

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
 */
export function requireAuth(event: RequestEvent, config: RBACConfig = {}): void {
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
 * Specific permission checks for common scenarios
 */
export const PermissionChecks = {
	// Dashboard access
	dashboard: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['dashboard:read']
		}),

	// Employee management
	employeeRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['employees:read']
		}),
	employeeWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['employees:write'],
			allowedRoles: ['super_admin', 'admin'] // Admin+ only for create/edit
		}),
	employeeManagement: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['employees:read'],
			allowedRoles: ['admin', 'manager']
		}),

	// Department management
	departmentRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['departments:read']
		}),
	departmentWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['departments:write'],
			allowedRoles: ['super_admin', 'admin'] // Admin+ only for create/edit
		}),

	// Team management
	teamRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['teams:read']
		}),
	teamWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['teams:write']
		}),

	// Management pages (requires manager level or above)
	management: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['management:read'],
			allowedRoles: ['admin', 'manager']
		}),
	managementWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['management:write'],
			allowedRoles: ['admin', 'manager']
		}),

	// Leave management
	leaveRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['leave:read']
		}),
	leaveApproval: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['leave:approve'],
			allowedRoles: ['admin', 'manager']
		}),

	// Performance management
	performanceRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['performance:read']
		}),
	performanceWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['performance:write'],
			allowedRoles: ['admin', 'manager']
		}),

	// Goals and OKRs
	goalsRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['goals:read']
		}),
	goalsWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['goals:write'],
			allowedRoles: ['admin', 'manager']
		}),

	// Reports
	reportsRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['reports:read']
		}),
	reportsWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['reports:write'],
			allowedRoles: ['admin', 'manager']
		}),
	reportsExecute: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['reports:execute'],
			allowedRoles: ['admin', 'manager']
		}),
	reportsAnalytics: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['reports:analytics'],
			allowedRoles: ['admin', 'manager']
		}),

	// Admin pages
	adminRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['admin:read'],
			allowedRoles: ['admin']
		}),
	adminWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['admin:write'],
			allowedRoles: ['admin']
		})
};

/**
 * Check if a manager has edit access to a specific department/team
 * Admins have full access to all departments
 * Managers only have edit access to their own department
 */
export async function canEditDepartment(
	userId: string,
	departmentId: string,
	userRole: string
): Promise<boolean> {
	// Admins can edit any department
	if (userRole === 'admin') {
		return true;
	}

	// For managers, check if they manage this department
	if (userRole === 'manager') {
		try {
			// Import here to avoid circular dependencies
			const { getGraphQLEndpoint } = await import('$lib/server/api-url');
			const graphqlEndpoint = getGraphQLEndpoint();

			const response = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: `
						query CheckDepartmentManager($departmentId: UUID!) {
							departmentById(id: $departmentId) {
								id
								managerId
							}
						}
					`,
					variables: { departmentId }
				})
			});

			const data = await response.json();
			const department = data?.data?.departmentById;

			// Manager can edit if they are the department manager
			return department?.managerId === userId;
		} catch (error) {
			console.error('[RBAC] Error checking department manager:', error);
			return false;
		}
	}

	// Employees cannot edit departments
	return false;
}

/**
 * Check if a user can edit a specific employee's data
 * Admins can edit anyone
 * Managers can edit employees in their department
 * Employees can only edit their own data
 */
export async function canEditEmployee(
	userId: string,
	targetEmployeeId: string,
	userRole: string
): Promise<boolean> {
	// Admins can edit anyone
	if (userRole === 'admin') {
		return true;
	}

	// Employees can only edit themselves
	if (userRole === 'employee') {
		return userId === targetEmployeeId;
	}

	// For managers, check if target employee is in their department
	if (userRole === 'manager') {
		try {
			const { getGraphQLEndpoint } = await import('$lib/server/api-url');
			const graphqlEndpoint = getGraphQLEndpoint();

			const response = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: `
						query CheckEmployeeDepartment($managerId: UUID!, $employeeId: UUID!) {
							managerUser: userById(id: $managerId) {
								id
								departmentByDepartmentId {
									id
									managerId
								}
							}
							targetUser: userById(id: $employeeId) {
								id
								departmentId
							}
						}
					`,
					variables: { managerId: userId, employeeId: targetEmployeeId }
				})
			});

			const data = await response.json();
			const managerDept = data?.data?.managerUser?.departmentByDepartmentId;
			const targetUserDeptId = data?.data?.targetUser?.departmentId;

			// Manager can edit if they manage the employee's department
			return managerDept?.id === targetUserDeptId && managerDept?.managerId === userId;
		} catch (error) {
			console.error('[RBAC] Error checking employee department:', error);
			return false;
		}
	}

	return false;
}

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
		canManageEmployees:
			hasPermission(locals.permissions || [], ['employees:write']) &&
			hasRole(locals.roles || [], ['super_admin', 'admin']), // Restrict to admin+ only
		canViewDepartments: hasPermission(locals.permissions || [], ['departments:read']),
		canManageDepartments:
			hasPermission(locals.permissions || [], ['departments:write']) &&
			hasRole(locals.roles || [], ['super_admin', 'admin']), // Restrict to admin+ only
		canViewTeams: hasPermission(locals.permissions || [], ['teams:read']),
		canManageTeams: hasPermission(locals.permissions || [], ['teams:write']),
		canViewManagement:
			hasPermission(locals.permissions || [], ['management:read']) ||
			hasRole(locals.roles || [], ['admin', 'manager']),
		canManageLeave:
			hasPermission(locals.permissions || [], ['leave:approve']) ||
			hasRole(locals.roles || [], ['admin', 'manager']),
		canManagePerformance:
			hasPermission(locals.permissions || [], ['performance:write']) ||
			hasRole(locals.roles || [], ['admin', 'manager']),
		canManageGoals:
			hasPermission(locals.permissions || [], ['goals:write']) ||
			hasRole(locals.roles || [], ['admin', 'manager']),
		canViewReports: hasPermission(locals.permissions || [], ['reports:read']),
		canCreateReports:
			hasPermission(locals.permissions || [], ['reports:write']) ||
			hasRole(locals.roles || [], ['admin', 'manager']),
		canExecuteReports:
			hasPermission(locals.permissions || [], ['reports:execute']) ||
			hasRole(locals.roles || [], ['admin', 'manager']),
		canViewAnalytics:
			hasPermission(locals.permissions || [], ['reports:analytics']) ||
			hasRole(locals.roles || [], ['admin', 'manager']),
		canViewAdmin:
			hasPermission(locals.permissions || [], ['admin:read']) ||
			hasRole(locals.roles || [], ['admin']),
		canManageAdmin:
			hasPermission(locals.permissions || [], ['admin:write']) ||
			hasRole(locals.roles || [], ['admin']),

		// Role checks
		isAdmin: hasRole(locals.roles || [], ['admin']),
		isManager: hasRole(locals.roles || [], ['admin', 'manager']),
		isEmployee: hasRole(locals.roles || [], ['employee'])
	};
}
