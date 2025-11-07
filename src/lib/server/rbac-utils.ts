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
 */
export function requireAuth(event: RequestEvent, config: RBACConfig = {}): void {
	const { locals } = event;

	// Check if user is authenticated
	if (!locals.user) {
		const redirectTo =
			event.url.pathname === '/' ? '' : `?redirectTo=${encodeURIComponent(event.url.pathname)}`;
		redirect(303, `/login${redirectTo}`);
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
			error(
            				403,
            				'Access forbidden: You do not have the required permissions to access this resource'
            			);
		}
	}

	// Check required roles if specified
	if (requiredRoles.length > 0) {
		const hasRequiredRoles = hasRole(locals.roles || [], requiredRoles, requireAll);

		if (!hasRequiredRoles) {
			error(
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
			error(403, 'Access forbidden: Your role does not have access to this resource');
		}
	}
}

/**
 * Specific permission checks for common scenarios
 * Updated to use scoped read permissions (read:self, read:team, read:all)
 */
export const PermissionChecks = {
	// Dashboard access - requires at least self-level access
	dashboard: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['dashboard:read:self', 'dashboard:read:team', 'dashboard:read:all', 'dashboard:read']
		}),

	// Employee management - accepts any level of read access
	employeeRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['employees:read:self', 'employees:read:team', 'employees:read:all', 'employees:read']
		}),
	employeeWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['employees:write']
		}),
	employeeManagement: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['employees:read:team', 'employees:read:all', 'employees:read'],
			allowedRoles: ['admin', 'manager', 'hr_admin']
		}),

	// Department management - accepts any level of read access
	departmentRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['departments:read:self', 'departments:read:team', 'departments:read:all', 'departments:read']
		}),
	departmentWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['departments:write']
		}),

	// Team management - requires at least team-level access
	teamRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['teams:read:team', 'teams:read:all', 'teams:read']
		}),
	teamWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['teams:write']
		}),

	// Management pages - requires team or all-level access
	management: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['management:read:team', 'management:read:all', 'management:read']
		}),
	managementWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['management:write']
		}),

	// Leave management - accepts any level of read access
	leaveRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['leave:read:self', 'leave:read:team', 'leave:read:all', 'leave:read']
		}),
	leaveApproval: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['leave:approve']
		}),

	// Performance management - accepts any level of read access
	performanceRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['performance:read:self', 'performance:read:team', 'performance:read:all', 'performance:read']
		}),
	performanceWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['performance:write']
		}),

	// Goals and OKRs - accepts any level of read access
	goalsRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['goals:read:self', 'goals:read:team', 'goals:read:all', 'goals:read']
		}),
	goalsWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['goals:write']
		}),

	// Reports - accepts any level of read access
	reportsRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['reports:read:self', 'reports:read:team', 'reports:read:all', 'reports:read']
		}),
	reportsWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['reports:write']
		}),
	reportsExecute: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['reports:execute']
		}),
	reportsAnalytics: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['reports:analytics']
		}),

	// Admin pages - requires all-level access
	adminRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['admin:read:all', 'admin:read']
		}),
	adminWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['admin:write']
		}),

	// Additional scoped permission checks
	// Tasks
	tasksRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['tasks:read:self', 'tasks:read:team', 'tasks:read:all', 'tasks:read']
		}),
	tasksWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['tasks:write']
		}),
	tasksDelete: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['tasks:delete']
		}),

	// Documents
	documentsRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['documents:read:self', 'documents:read:team', 'documents:read:all', 'documents:read']
		}),
	documentsWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['documents:write']
		}),
	documentsDelete: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['documents:delete']
		}),

	// Events
	eventsRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['events:read:self', 'events:read:team', 'events:read:all', 'events:read']
		}),
	eventsWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['events:write']
		}),

	// Attendance
	attendanceRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['attendance:read:self', 'attendance:read:team', 'attendance:read:all', 'attendance:read']
		}),
	attendanceWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['attendance:write']
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
	// Super admins and admins can edit any department
	if (userRole === 'system_admin' || userRole === 'admin') {
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
	// Super admins and admins can edit anyone
	if (userRole === 'system_admin' || userRole === 'admin') {
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
 * Updated to support scoped read permissions (read:self, read:team, read:all)
 */
export function getUserPermissions(locals: App.Locals) {
	const userPerms = locals.permissions || [];
	const userRoles = locals.roles || [];

	return {
		user: locals.user,
		permissions: userPerms,
		roles: userRoles,

		// Computed permission checks with scoped read support
		// Employee permissions
		canViewEmployees: hasPermission(userPerms, [
			'employees:read:self',
			'employees:read:team',
			'employees:read:all',
			'employees:read'
		]),
		canEditEmployees: hasPermission(userPerms, ['employees:write']),
		canDeleteEmployees: hasPermission(userPerms, ['employees:delete']),
		canCreateEmployees: hasPermission(userPerms, ['employees:write']),
		canManageEmployees: hasPermission(userPerms, ['employees:write']),
		canViewInactiveEmployees: hasRole(userRoles, ['system_admin', 'admin', 'hr_admin', 'manager']),

		// Department permissions
		canViewDepartments: hasPermission(userPerms, [
			'departments:read:self',
			'departments:read:team',
			'departments:read:all',
			'departments:read'
		]),
		canManageDepartments: hasPermission(userPerms, ['departments:write']),
		canDeleteDepartments: hasPermission(userPerms, ['departments:delete']),

		// Team permissions
		canViewTeams: hasPermission(userPerms, [
			'teams:read:self',
			'teams:read:team',
			'teams:read:all',
			'teams:read'
		]),
		canManageTeams: hasPermission(userPerms, ['teams:write']),
		canDeleteTeams: hasPermission(userPerms, ['teams:delete']),

		// Management permissions
		canViewManagement: hasPermission(userPerms, [
			'management:read:team',
			'management:read:all',
			'management:read'
		]),
		canManageManagement: hasPermission(userPerms, ['management:write']),

		// Leave permissions
		canViewLeave: hasPermission(userPerms, [
			'leave:read:self',
			'leave:read:team',
			'leave:read:all',
			'leave:read'
		]),
		canManageLeave: hasPermission(userPerms, ['leave:approve', 'leave:write']),
		canDeleteLeave: hasPermission(userPerms, ['leave:delete']),

		// Performance permissions
		canViewPerformance: hasPermission(userPerms, [
			'performance:read:self',
			'performance:read:team',
			'performance:read:all',
			'performance:read'
		]),
		canManagePerformance: hasPermission(userPerms, ['performance:write']),
		canDeletePerformance: hasPermission(userPerms, ['performance:delete']),

		// Goals permissions
		canViewGoals: hasPermission(userPerms, [
			'goals:read:self',
			'goals:read:team',
			'goals:read:all',
			'goals:read'
		]),
		canManageGoals: hasPermission(userPerms, ['goals:write']),
		canDeleteGoals: hasPermission(userPerms, ['goals:delete']),

		// Reports permissions
		canViewReports: hasPermission(userPerms, [
			'reports:read:self',
			'reports:read:team',
			'reports:read:all',
			'reports:read'
		]),
		canCreateReports: hasPermission(userPerms, ['reports:write']),
		canExecuteReports: hasPermission(userPerms, ['reports:execute']),
		canViewAnalytics: hasPermission(userPerms, ['reports:analytics']),
		canDeleteReports: hasPermission(userPerms, ['reports:delete']),

		// Tasks permissions
		canViewTasks: hasPermission(userPerms, [
			'tasks:read:self',
			'tasks:read:team',
			'tasks:read:all',
			'tasks:read'
		]),
		canManageTasks: hasPermission(userPerms, ['tasks:write']),
		canDeleteTasks: hasPermission(userPerms, ['tasks:delete']),
		canReassignTasks: hasPermission(userPerms, ['tasks:reassign']),

		// Documents permissions
		canViewDocuments: hasPermission(userPerms, [
			'documents:read:self',
			'documents:read:team',
			'documents:read:all',
			'documents:read'
		]),
		canManageDocuments: hasPermission(userPerms, ['documents:write']),
		canDeleteDocuments: hasPermission(userPerms, ['documents:delete']),
		canAuditDocuments: hasPermission(userPerms, ['documents:audit']),

		// Events permissions
		canViewEvents: hasPermission(userPerms, [
			'events:read:self',
			'events:read:team',
			'events:read:all',
			'events:read'
		]),
		canManageEvents: hasPermission(userPerms, ['events:write']),
		canDeleteEvents: hasPermission(userPerms, ['events:delete']),

		// Attendance permissions
		canViewAttendance: hasPermission(userPerms, [
			'attendance:read:self',
			'attendance:read:team',
			'attendance:read:all',
			'attendance:read'
		]),
		canManageAttendance: hasPermission(userPerms, ['attendance:write']),
		canDeleteAttendance: hasPermission(userPerms, ['attendance:delete']),

		// Admin permissions
		canViewAdmin: hasPermission(userPerms, ['admin:read:all', 'admin:read']),
		canManageAdmin: hasPermission(userPerms, ['admin:write']),
		canDeleteAdmin: hasPermission(userPerms, ['admin:delete']),

		// Role checks
		isAdmin: hasRole(userRoles, ['system_admin', 'admin', 'hr_admin']),
		isManager: hasRole(userRoles, ['system_admin', 'admin', 'hr_admin', 'manager']),
		isEmployee: hasRole(userRoles, ['employee'])
	};
}

/**
 * Role hierarchy levels for precedence logic
 * T036: Role precedence implementation
 */
const ROLE_HIERARCHY = {
	system_admin: 120,
	admin: 100,
	manager: 60,
	employee: 20,
	guest: 0
} as const;

/**
 * Get the highest priority role from a roles array
 * Used when a user has multiple roles to determine their effective permissions
 *
 * @param roles - Array of role names
 * @returns The highest priority role name
 *
 * @example
 * getRolePrecedence(['employee', 'admin', 'manager']) // returns 'admin'
 * getRolePrecedence(['manager', 'employee']) // returns 'manager'
 * getRolePrecedence(['employee']) // returns 'employee'
 */
export function getRolePrecedence(roles: string[]): string {
	if (!roles || roles.length === 0) return 'guest';

	let highestRole = 'employee';
	let highestLevel = 0;

	for (const role of roles) {
		const level = ROLE_HIERARCHY[role as keyof typeof ROLE_HIERARCHY] || 0;
		if (level > highestLevel) {
			highestLevel = level;
			highestRole = role;
		}
	}

	return highestRole;
}

/**
 * Check if a user is the manager of a specific department
 * Queries the database to verify the manager assignment
 *
 * @param userId - The user ID to check
 * @param departmentId - The department ID to check against
 * @returns true if the user is the manager of the department, false otherwise
 */
export async function isManagerOfDepartment(
	userId: string,
	departmentId: string
): Promise<boolean> {
	try {
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

		return department?.managerId === userId;
	} catch (error) {
		console.error('[RBAC] Error checking if user is department manager:', error);
		return false;
	}
}

/**
 * Get the effective role for a user based on role precedence
 * Updates getUserPermissions to use the highest priority role
 *
 * @param locals - SvelteKit locals object
 * @returns The effective role string
 */
export function getEffectiveRole(locals: App.Locals): string {
	const roles = locals.roles || [];
	const userRole = locals.user?.role;

	// Combine explicit roles with user.role if present
	const allRoles = [...roles];
	if (userRole && !allRoles.includes(userRole)) {
		allRoles.push(userRole);
	}

	return getRolePrecedence(allRoles);
}
