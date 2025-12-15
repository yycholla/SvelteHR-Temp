import { hasPermission, hasRole } from './rbac-core';

/**
 * Role hierarchy levels for precedence logic
 * T036: Role precedence implementation
 */
export const ROLE_HIERARCHY = {
	admin: 100,
	'hr manager': 75,
	manager: 50,
	employee: 25,
	guest: 0
} as const;

export function getRolePrecedence(roles: string[]): string {
	if (!roles || roles.length === 0) return 'guest';

	let highestRole = 'guest';
	let highestLevel = 0;

	for (const role of roles) {
		const normalizedRole = role.toLowerCase();
		const level = ROLE_HIERARCHY[normalizedRole as keyof typeof ROLE_HIERARCHY] || 0;
		if (level >= highestLevel) {
			// >= to ensure we pick up at least one valid role if multiple have same level or if first one is found
			highestLevel = level;
			highestRole = role; // Return the original role string, or normalized? Tests expect 'admin'.
		}
	}

	// If the highest role found is 'guest' but roles were provided, and none matched hierarchy, return the first one or 'guest'?
	// Test expects 'employee' if only 'employee' is passed.
	// If 'employee' is in hierarchy, it works.

	return highestRole;
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
		canViewInactiveEmployees: hasRole(userRoles, ['Admin', 'HR Manager', 'Manager']),

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
		isAdmin: hasRole(userRoles, ['Admin']),
		isHRManager: hasRole(userRoles, ['HR Manager']),
		isManager: hasRole(userRoles, ['Manager', 'HR Manager', 'Admin']),
		isEmployee: hasRole(userRoles, ['Employee'])
	};
}
