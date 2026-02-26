import { hasPermission, hasRole, getAccessTier, AccessTier } from './rbac-core';

/**
 * Role hierarchy levels for precedence logic
 * T036: Role precedence implementation
 */
export const ROLE_HIERARCHY = {
	admin: 100,
	'hr manager': 75,
	hr_manager: 75,
	manager: 50,
	employee: 25,
	guest: 0
} as const;

export function getRolePrecedence(roles: string[]): string {
	if (!roles || roles.length === 0) return 'guest';

	let highestRole = 'guest';
	let highestLevel = 0;

	for (const role of roles) {
		const normalizedRole = role.toLowerCase().replace(/[\s_-]+/g, '_');
		const level = ROLE_HIERARCHY[normalizedRole as keyof typeof ROLE_HIERARCHY] || 0;
		if (level >= highestLevel) {
			highestLevel = level;
			highestRole = role;
		}
	}

	return highestRole;
}

/**
 * Get the effective role for a user based on role precedence
 */
export function getEffectiveRole(locals: App.Locals): string {
	const roles = locals.roles || [];
	const userRole = locals.user?.role;

	const allRoles = [...roles];
	if (userRole && !allRoles.includes(userRole)) {
		allRoles.push(userRole);
	}

	return getRolePrecedence(allRoles);
}

/**
 * Get user permissions for client-side components.
 * Includes computed boolean checks AND the user's access tier.
 */
export function getUserPermissions(locals: App.Locals) {
	const userPerms = locals.permissions || [];
	const userRoles = locals.roles || [];
	const tier = getAccessTier(userRoles);

	return {
		user: locals.user,
		permissions: userPerms,
		roles: userRoles,

		// Access tier
		accessTier: tier,
		isTierAll:  tier >= AccessTier.ALL,
		isTierTeam: tier >= AccessTier.TEAM,
		isTierSelf: tier >= AccessTier.SELF,

		// Computed permission checks (flat perms for actions)
		// Employee permissions
		canViewEmployees: tier >= AccessTier.SELF,
		canEditEmployees: hasPermission(userPerms, ['employees:write']),
		canDeleteEmployees: hasPermission(userPerms, ['employees:delete']),
		canCreateEmployees: hasPermission(userPerms, ['employees:write']),
		canManageEmployees: hasPermission(userPerms, ['employees:write']),
		canViewInactiveEmployees: tier >= AccessTier.TEAM,

		// Department permissions
		canViewDepartments: tier >= AccessTier.SELF,
		canManageDepartments: hasPermission(userPerms, ['departments:write']),
		canDeleteDepartments: hasPermission(userPerms, ['departments:delete']),

		// Team permissions
		canViewTeams: tier >= AccessTier.TEAM,
		canManageTeams: hasPermission(userPerms, ['teams:write']),
		canDeleteTeams: hasPermission(userPerms, ['teams:delete']),

		// Management permissions
		canViewManagement: tier >= AccessTier.TEAM,
		canManageManagement: hasPermission(userPerms, ['management:write']),

		// Leave permissions
		canViewLeave: tier >= AccessTier.SELF,
		canManageLeave: hasPermission(userPerms, ['leave:approve', 'leave:write']),
		canDeleteLeave: hasPermission(userPerms, ['leave:delete']),

		// Performance permissions
		canViewPerformance: tier >= AccessTier.SELF,
		canManagePerformance: hasPermission(userPerms, ['performance:write']),
		canDeletePerformance: hasPermission(userPerms, ['performance:delete']),

		// Goals permissions
		canViewGoals: tier >= AccessTier.SELF,
		canManageGoals: hasPermission(userPerms, ['goals:write']),
		canDeleteGoals: hasPermission(userPerms, ['goals:delete']),

		// Reports permissions
		canViewReports: tier >= AccessTier.SELF,
		canCreateReports: hasPermission(userPerms, ['reports:write']),
		canExecuteReports: hasPermission(userPerms, ['reports:execute']),
		canViewAnalytics: tier >= AccessTier.TEAM,
		canDeleteReports: hasPermission(userPerms, ['reports:delete']),

		// Tasks permissions
		canViewTasks: tier >= AccessTier.SELF,
		canManageTasks: hasPermission(userPerms, ['tasks:write']),
		canDeleteTasks: hasPermission(userPerms, ['tasks:delete']),
		canReassignTasks: hasPermission(userPerms, ['tasks:reassign']),

		// Documents permissions
		canViewDocuments: tier >= AccessTier.SELF,
		canManageDocuments: hasPermission(userPerms, ['documents:write']),
		canDeleteDocuments: hasPermission(userPerms, ['documents:delete']),
		canAuditDocuments: tier >= AccessTier.ALL,

		// Events permissions
		canViewEvents: tier >= AccessTier.SELF,
		canManageEvents: hasPermission(userPerms, ['events:write']),
		canDeleteEvents: hasPermission(userPerms, ['events:delete']),

		// Attendance permissions
		canViewAttendance: tier >= AccessTier.SELF,
		canManageAttendance: hasPermission(userPerms, ['attendance:write']),
		canDeleteAttendance: hasPermission(userPerms, ['attendance:delete']),

		// Admin permissions
		canViewAdmin: tier >= AccessTier.ALL,
		canManageAdmin: hasPermission(userPerms, ['admin:write']),
		canDeleteAdmin: hasPermission(userPerms, ['admin:delete']),

		// Role checks (backward compat)
		isAdmin: tier >= AccessTier.ALL,
		isHRManager: hasRole(userRoles, ['HR Manager']),
		isManager: tier >= AccessTier.TEAM,
		isEmployee: tier >= AccessTier.SELF
	};
}
