/**
 * Role-Based Access Control (RBAC) System
 * Handles permission checking and role validation for the HR system
 */

// Role hierarchy levels (matching database)
export const ROLE_LEVELS = {
	GUEST: 0,
	EMPLOYEE: 20,
	MANAGER: 60,
	HR_ADMIN: 80,
	SUPER_ADMIN: 100
} as const;

// Role names (matching database)
export const ROLE_NAMES = {
	GUEST: 'hr_guest',
	EMPLOYEE: 'hr_employee',
	MANAGER: 'hr_manager',
	HR_ADMIN: 'hr_admin',
	SUPER_ADMIN: 'hr_super_admin'
} as const;

// Permission definitions
export const PERMISSIONS = {
	// User management
	VIEW_USERS: 'view_users',
	VIEW_USER_DETAILS: 'view_user_details',
	CREATE_USERS: 'create_users',
	UPDATE_USERS: 'update_users',
	DELETE_USERS: 'delete_users',
	VIEW_SENSITIVE_DATA: 'view_sensitive_data',

	// Role management
	VIEW_ROLES: 'view_roles',
	ASSIGN_ROLES: 'assign_roles',
	REVOKE_ROLES: 'revoke_roles',
	MANAGE_ROLE_ASSIGNMENTS: 'manage_role_assignments',

	// Department management
	VIEW_DEPARTMENTS: 'view_departments',
	CREATE_DEPARTMENTS: 'create_departments',
	UPDATE_DEPARTMENTS: 'update_departments',
	DELETE_DEPARTMENTS: 'delete_departments',

	// Leave management
	VIEW_LEAVE_REQUESTS: 'view_leave_requests',
	CREATE_LEAVE_REQUESTS: 'create_leave_requests',
	APPROVE_LEAVE_REQUESTS: 'approve_leave_requests',
	VIEW_ALL_LEAVE_REQUESTS: 'view_all_leave_requests',

	// Performance management
	VIEW_PERFORMANCE_REVIEWS: 'view_performance_reviews',
	CREATE_PERFORMANCE_REVIEWS: 'create_performance_reviews',
	UPDATE_PERFORMANCE_REVIEWS: 'update_performance_reviews',

	// Analytics and reporting
	VIEW_ANALYTICS: 'view_analytics',
	EXPORT_DATA: 'export_data',
	VIEW_SYSTEM_LOGS: 'view_system_logs',

	// System administration
	MANAGE_SYSTEM_SETTINGS: 'manage_system_settings',
	MANAGE_WORKFLOWS: 'manage_workflows',
	MANAGE_COMPLIANCE: 'manage_compliance'
} as const;

// Base permission sets
const GUEST_PERMISSIONS = [
	// Very limited access for guests
];

const EMPLOYEE_PERMISSIONS = [
	PERMISSIONS.VIEW_USERS,
	PERMISSIONS.VIEW_DEPARTMENTS,
	PERMISSIONS.CREATE_LEAVE_REQUESTS,
	PERMISSIONS.VIEW_LEAVE_REQUESTS, // Own leave requests only
	PERMISSIONS.VIEW_PERFORMANCE_REVIEWS // Own reviews only
];

const MANAGER_PERMISSIONS = [
	// All employee permissions plus manager-specific ones
	...EMPLOYEE_PERMISSIONS,
	PERMISSIONS.VIEW_USER_DETAILS, // For direct reports
	PERMISSIONS.UPDATE_USERS, // Limited to direct reports
	PERMISSIONS.APPROVE_LEAVE_REQUESTS, // For team members
	PERMISSIONS.CREATE_PERFORMANCE_REVIEWS,
	PERMISSIONS.UPDATE_PERFORMANCE_REVIEWS,
	PERMISSIONS.VIEW_ANALYTICS // Department analytics
];

const HR_ADMIN_PERMISSIONS = [
	// Most permissions for HR operations
	PERMISSIONS.VIEW_USERS,
	PERMISSIONS.VIEW_USER_DETAILS,
	PERMISSIONS.CREATE_USERS,
	PERMISSIONS.UPDATE_USERS,
	PERMISSIONS.VIEW_SENSITIVE_DATA,
	PERMISSIONS.VIEW_ROLES,
	PERMISSIONS.ASSIGN_ROLES,
	PERMISSIONS.REVOKE_ROLES,
	PERMISSIONS.MANAGE_ROLE_ASSIGNMENTS,
	PERMISSIONS.VIEW_DEPARTMENTS,
	PERMISSIONS.CREATE_DEPARTMENTS,
	PERMISSIONS.UPDATE_DEPARTMENTS,
	PERMISSIONS.VIEW_ALL_LEAVE_REQUESTS,
	PERMISSIONS.APPROVE_LEAVE_REQUESTS,
	PERMISSIONS.VIEW_PERFORMANCE_REVIEWS,
	PERMISSIONS.CREATE_PERFORMANCE_REVIEWS,
	PERMISSIONS.UPDATE_PERFORMANCE_REVIEWS,
	PERMISSIONS.VIEW_ANALYTICS,
	PERMISSIONS.EXPORT_DATA,
	PERMISSIONS.MANAGE_WORKFLOWS,
	PERMISSIONS.MANAGE_COMPLIANCE
];

const SUPER_ADMIN_PERMISSIONS = [
	// All permissions
	...Object.values(PERMISSIONS)
];

// Role permission mappings
export const ROLE_PERMISSIONS = {
	[ROLE_NAMES.GUEST]: GUEST_PERMISSIONS,
	[ROLE_NAMES.EMPLOYEE]: EMPLOYEE_PERMISSIONS,
	[ROLE_NAMES.MANAGER]: MANAGER_PERMISSIONS,
	[ROLE_NAMES.HR_ADMIN]: HR_ADMIN_PERMISSIONS,
	[ROLE_NAMES.SUPER_ADMIN]: SUPER_ADMIN_PERMISSIONS
} as const;

// User role interface
export interface UserRole {
	id: number;
	name: string;
	description: string;
	level: number;
}

export interface UserRoleAssignment {
	id: string;
	userId: string;
	roleId: number;
	assignedBy: string;
	isActive: boolean;
	validFrom: string;
	validUntil?: string;
	userRoleByRoleId: UserRole;
}

// RBAC utility class
export class RBACManager {
	private userRoles: UserRoleAssignment[] = [];
	private currentUserId: string | null = null;

	constructor(userRoles: UserRoleAssignment[] = [], currentUserId: string | null = null) {
		this.userRoles = userRoles;
		this.currentUserId = currentUserId;
	}

	/**
	 * Get the highest role level for the user
	 */
	getHighestRoleLevel(): number {
		if (this.userRoles.length === 0) return ROLE_LEVELS.GUEST;

		const activeRoles = this.userRoles.filter(
			(assignment) =>
				assignment.isActive &&
				(!assignment.validUntil || new Date(assignment.validUntil) > new Date())
		);

		if (activeRoles.length === 0) return ROLE_LEVELS.GUEST;

		return Math.max(...activeRoles.map((assignment) => assignment.userRoleByRoleId.level));
	}

	/**
	 * Get the highest role name for the user
	 */
	getHighestRoleName(): string {
		const highestLevel = this.getHighestRoleLevel();
		const roleAssignment = this.userRoles.find(
			(assignment) =>
				assignment.isActive &&
				assignment.userRoleByRoleId.level === highestLevel &&
				(!assignment.validUntil || new Date(assignment.validUntil) > new Date())
		);

		return roleAssignment?.userRoleByRoleId.name || ROLE_NAMES.GUEST;
	}

	/**
	 * Check if user has a specific permission
	 */
	hasPermission(permission: string): boolean {
		const roleName = this.getHighestRoleName();
		const rolePermissions = ROLE_PERMISSIONS[roleName as keyof typeof ROLE_PERMISSIONS] || [];
		return rolePermissions.includes(permission as any);
	}

	/**
	 * Check if user has any of the specified permissions
	 */
	hasAnyPermission(permissions: string[]): boolean {
		return permissions.some((permission) => this.hasPermission(permission));
	}

	/**
	 * Check if user has all of the specified permissions
	 */
	hasAllPermissions(permissions: string[]): boolean {
		return permissions.every((permission) => this.hasPermission(permission));
	}

	/**
	 * Check if user has a minimum role level
	 */
	hasMinimumRoleLevel(minimumLevel: number): boolean {
		return this.getHighestRoleLevel() >= minimumLevel;
	}

	/**
	 * Check if user can perform action on target user (e.g., manager managing direct reports)
	 */
	canManageUser(targetUserId: string, requiredPermission: string): boolean {
		if (!this.hasPermission(requiredPermission)) return false;

		// Super admin can manage anyone
		if (this.hasMinimumRoleLevel(ROLE_LEVELS.SUPER_ADMIN)) return true;

		// HR admin can manage most users (could add additional restrictions here)
		if (this.hasMinimumRoleLevel(ROLE_LEVELS.HR_ADMIN)) return true;

		// Managers can manage their direct reports (this would need additional data about reporting structure)
		// For now, managers can manage users with lower role levels
		if (this.hasMinimumRoleLevel(ROLE_LEVELS.MANAGER)) {
			// This is a simplified check - in practice, you'd verify the reporting relationship
			return true;
		}

		// Users can only manage themselves for certain operations
		return this.currentUserId === targetUserId;
	}

	/**
	 * Get user's active roles
	 */
	getActiveRoles(): UserRoleAssignment[] {
		return this.userRoles.filter(
			(assignment) =>
				assignment.isActive &&
				(!assignment.validUntil || new Date(assignment.validUntil) > new Date())
		);
	}

	/**
	 * Check if user has a specific role
	 */
	hasRole(roleName: string): boolean {
		return this.getActiveRoles().some(
			(assignment) => assignment.userRoleByRoleId.name === roleName
		);
	}

	/**
	 * Get permissions for display purposes
	 */
	getUserPermissions(): string[] {
		const roleName = this.getHighestRoleName();
		return ROLE_PERMISSIONS[roleName as keyof typeof ROLE_PERMISSIONS] || [];
	}
}

// Utility functions for common permission checks
export const createRBACManager = (
	userRoles: UserRoleAssignment[],
	currentUserId: string | null = null
): RBACManager => {
	return new RBACManager(userRoles, currentUserId);
};

// Permission check functions for common scenarios
export const canViewUsers = (rbac: RBACManager): boolean =>
	rbac.hasPermission(PERMISSIONS.VIEW_USERS);
export const canManageUsers = (rbac: RBACManager): boolean =>
	rbac.hasPermission(PERMISSIONS.UPDATE_USERS);
export const canViewSensitiveData = (rbac: RBACManager): boolean =>
	rbac.hasPermission(PERMISSIONS.VIEW_SENSITIVE_DATA);
export const canManageRoles = (rbac: RBACManager): boolean =>
	rbac.hasPermission(PERMISSIONS.ASSIGN_ROLES);
export const canApproveLeave = (rbac: RBACManager): boolean =>
	rbac.hasPermission(PERMISSIONS.APPROVE_LEAVE_REQUESTS);
export const canManageWorkflows = (rbac: RBACManager): boolean =>
	rbac.hasPermission(PERMISSIONS.MANAGE_WORKFLOWS);
export const canManageCompliance = (rbac: RBACManager): boolean =>
	rbac.hasPermission(PERMISSIONS.MANAGE_COMPLIANCE);

// Role-based route protection helpers
export const requireMinimumRole =
	(minimumLevel: number) =>
	(rbac: RBACManager): boolean => {
		return rbac.hasMinimumRoleLevel(minimumLevel);
	};

export const requirePermission =
	(permission: string) =>
	(rbac: RBACManager): boolean => {
		return rbac.hasPermission(permission);
	};

export const requireAnyPermission =
	(permissions: string[]) =>
	(rbac: RBACManager): boolean => {
		return rbac.hasAnyPermission(permissions);
	};
