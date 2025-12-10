/**
 * Role-Based Access Control (RBAC) System for PostGraphile HR Application
 *
 * Provides role-based permission checking and access control management.
 * Integrates with PostGraphile's permission system and JWT authentication.
 */

// Role and Permission interfaces
export interface Permission {
	id: string;
	name: string;
	resource: string;
	action: string;
	description?: string;
	isActive: boolean;
}

export interface Role {
	id: string;
	name: string;
	description?: string;
	level: number; // Higher level = more privileges
	isActive: boolean;
	permissions: Permission[];
}

export interface UserRoleAssignment {
	id: string;
	userId: string;
	roleId: string;
	role: Role;
	assignedAt: string;
	assignedBy?: string;
	isActive?: boolean;
}

// RBAC Manager interface
export interface RBACManager {
	userId: string | null;
	roles: UserRoleAssignment[];
	permissions: Permission[];

	// Permission checking methods
	hasPermission(permission: string): boolean;
	hasAnyPermission(permissions: string[]): boolean;
	hasAllPermissions(permissions: string[]): boolean;
	hasRole(roleName: string): boolean;
	hasAnyRole(roleNames: string[]): boolean;

	// Resource-specific permission checking
	canRead(resource: string, scope?: 'self' | 'team' | 'all'): boolean;
	canWrite(resource: string): boolean;
	canDelete(resource: string): boolean;
	canManage(resource: string): boolean;
	getReadScope(resource: string): 'none' | 'self' | 'team' | 'all';

	// Administrative functions
	isAdmin(): boolean;
	isHRManager(): boolean;
	isManager(): boolean;

	// Role level checking
	hasMinimumRoleLevel(level: number): boolean;
	getHighestRoleLevel(): number;

	// Utility methods
	getAllPermissions(): string[];
	getRoleNames(): string[];
	debugInfo(): Record<string, any>;
}

/**
 * Creates an RBAC manager instance for the given user role assignments
 */
export function createRBACManager(
	roleAssignments: UserRoleAssignment[] = [],
	userId: string | null = null
): RBACManager {
	// Filter to active role assignments only
	const activeRoles = roleAssignments.filter(
		(ra) => ra.isActive !== false && ra.role?.isActive !== false
	);

	// Extract all permissions from active roles
	const allPermissions: Permission[] = [];
	const uniquePermissions = new Set<string>();

	activeRoles.forEach((assignment) => {
		assignment.role?.permissions?.forEach((permission: Permission) => {
			if (permission.isActive && !uniquePermissions.has(permission.id)) {
				uniquePermissions.add(permission.id);
				allPermissions.push(permission);
			}
		});
	});

	return {
		userId,
		roles: activeRoles,
		permissions: allPermissions,

		// Permission checking methods
		hasPermission(permission: string): boolean {
			// Check for wildcard admin permission (full system access)
			if (allPermissions.some((p) => p.name === '*' || p.name === '*:*' || p.name === 'admin:*')) {
				return true;
			}

			// Check for exact permission match
			if (allPermissions.some((p) => p.name === permission)) {
				return true;
			}

			// Check for wildcard resource permissions (e.g., 'users:*' matches 'users:read')
			const [resource] = permission.split(':');
			const wildcardPermission = `${resource}:*`;
			return allPermissions.some((p) => p.name === wildcardPermission);
		},

		hasAnyPermission(permissions: string[]): boolean {
			return permissions.some((permission) => this.hasPermission(permission));
		},

		hasAllPermissions(permissions: string[]): boolean {
			return permissions.every((permission) => this.hasPermission(permission));
		},

		hasRole(roleName: string): boolean {
			return activeRoles.some(
				(assignment) => assignment.role?.name?.toLowerCase() === roleName.toLowerCase()
			);
		},

		hasAnyRole(roleNames: string[]): boolean {
			return roleNames.some((roleName) => this.hasRole(roleName));
		},

		// Resource-specific permission checking
		canRead(resource: string, scope?: 'self' | 'team' | 'all'): boolean {
			// Check for wildcard permission
			if (this.hasPermission(`${resource}:*`)) {
				return true;
			}

			// If scope is specified, check for that specific scope
			if (scope) {
				return this.hasPermission(`${resource}:read:${scope}`);
			}

			// If no scope specified, check if user has any read permission
			return (
				this.hasPermission(`${resource}:read:self`) ||
				this.hasPermission(`${resource}:read:team`) ||
				this.hasPermission(`${resource}:read:all`) ||
				// Legacy support for old read permission
				this.hasPermission(`${resource}:read`)
			);
		},

		canWrite(resource: string): boolean {
			return (
				this.hasPermission(`${resource}:write`) ||
				// Legacy support for old create/update permissions
				this.hasPermission(`${resource}:create`) ||
				this.hasPermission(`${resource}:update`) ||
				this.hasPermission(`${resource}:*`)
			);
		},

		canDelete(resource: string): boolean {
			return this.hasPermission(`${resource}:delete`) || this.hasPermission(`${resource}:*`);
		},

		// Get the highest read scope the user has for a resource
		getReadScope(resource: string): 'none' | 'self' | 'team' | 'all' {
			if (
				this.hasPermission(`${resource}:read:all`) ||
				this.hasPermission(`${resource}:*`) ||
				this.hasPermission('*') ||
				this.hasPermission('*:*')
			) {
				return 'all';
			}
			if (this.hasPermission(`${resource}:read:team`)) {
				return 'team';
			}
			if (this.hasPermission(`${resource}:read:self`) || this.hasPermission(`${resource}:read`)) {
				return 'self';
			}
			return 'none';
		},

		canManage(resource: string): boolean {
			return (
				this.hasPermission(`${resource}:*`) ||
				this.hasPermission('*') ||
				this.hasPermission('*:*') ||
				this.hasPermission('admin:*')
			);
		},

		// Administrative functions
		isAdmin(): boolean {
			return (
				this.hasRole('Admin') ||
				this.hasRole('Administrator') ||
				this.hasPermission('*') ||
				this.hasPermission('*:*') ||
				this.hasPermission('admin:*')
			);
		},

		isHRManager(): boolean {
			return (
				this.hasRole('HR Manager') ||
				this.hasRole('HR_Manager') ||
				this.hasRole('Human Resources Manager') ||
				this.isAdmin()
			);
		},

		isManager(): boolean {
			return (
				this.hasRole('Manager') ||
				this.hasRole('Team Lead') ||
				this.hasRole('Supervisor') ||
				this.isHRManager() ||
				this.isAdmin()
			);
		},

		// Role level checking
		hasMinimumRoleLevel(level: number): boolean {
			const highestLevel = this.getHighestRoleLevel();
			return highestLevel >= level;
		},

		getHighestRoleLevel(): number {
			return Math.max(0, ...activeRoles.map((assignment) => assignment.role?.level || 0));
		},

		// Utility methods
		getAllPermissions(): string[] {
			return allPermissions.map((p) => p.name);
		},

		getRoleNames(): string[] {
			return activeRoles.map((assignment) => assignment.role?.name).filter(Boolean) as string[];
		},

		debugInfo(): Record<string, any> {
			return {
				userId: this.userId,
				roleCount: activeRoles.length,
				roles: this.getRoleNames(),
				permissionCount: allPermissions.length,
				permissions: this.getAllPermissions(),
				highestRoleLevel: this.getHighestRoleLevel(),
				isAdmin: this.isAdmin(),
				isHRManager: this.isHRManager(),
				isManager: this.isManager()
			};
		}
	};
}

/**
 * Common RBAC permission constants for the HR system
 *
 * Permission Structure:
 * - read:self - View only own records
 * - read:team - View team/subordinate records
 * - read:all - View all records
 * - write - Create and update records
 * - delete - Delete records
 * - Special permissions - approve, execute, etc. (resource-specific)
 */
export const PERMISSIONS = {
	// Dashboard
	DASHBOARD_READ_SELF: 'dashboard:read:self',
	DASHBOARD_READ_TEAM: 'dashboard:read:team',
	DASHBOARD_READ_ALL: 'dashboard:read:all',
	DASHBOARD_WRITE: 'dashboard:write',
	DASHBOARD_DELETE: 'dashboard:delete',
	DASHBOARD_MANAGE: 'dashboard:*',

	// User management
	USERS_READ_SELF: 'users:read:self',
	USERS_READ_TEAM: 'users:read:team',
	USERS_READ_ALL: 'users:read:all',
	USERS_WRITE: 'users:write',
	USERS_DELETE: 'users:delete',
	USERS_MANAGE: 'users:*',

	// Employee management
	EMPLOYEES_READ_SELF: 'employees:read:self',
	EMPLOYEES_READ_TEAM: 'employees:read:team',
	EMPLOYEES_READ_ALL: 'employees:read:all',
	EMPLOYEES_WRITE: 'employees:write',
	EMPLOYEES_DELETE: 'employees:delete',
	EMPLOYEES_MANAGE: 'employees:*',

	// Department management
	DEPARTMENTS_READ_SELF: 'departments:read:self',
	DEPARTMENTS_READ_TEAM: 'departments:read:team',
	DEPARTMENTS_READ_ALL: 'departments:read:all',
	DEPARTMENTS_WRITE: 'departments:write',
	DEPARTMENTS_DELETE: 'departments:delete',
	DEPARTMENTS_MANAGE: 'departments:*',

	// Events
	EVENTS_READ_SELF: 'events:read:self',
	EVENTS_READ_TEAM: 'events:read:team',
	EVENTS_READ_ALL: 'events:read:all',
	EVENTS_WRITE: 'events:write',
	EVENTS_DELETE: 'events:delete',
	EVENTS_MANAGE: 'events:*',

	// Tasks
	TASKS_READ_SELF: 'tasks:read:self',
	TASKS_READ_TEAM: 'tasks:read:team',
	TASKS_READ_ALL: 'tasks:read:all',
	TASKS_WRITE: 'tasks:write',
	TASKS_DELETE: 'tasks:delete',
	TASKS_REASSIGN: 'tasks:reassign',
	TASKS_MANAGE: 'tasks:*',

	// Activities
	ACTIVITIES_READ_SELF: 'activities:read:self',
	ACTIVITIES_READ_TEAM: 'activities:read:team',
	ACTIVITIES_READ_ALL: 'activities:read:all',
	ACTIVITIES_WRITE: 'activities:write',
	ACTIVITIES_DELETE: 'activities:delete',
	ACTIVITIES_MANAGE: 'activities:*',

	// Notifications
	NOTIFICATIONS_READ_SELF: 'notifications:read:self',
	NOTIFICATIONS_READ_TEAM: 'notifications:read:team',
	NOTIFICATIONS_READ_ALL: 'notifications:read:all',
	NOTIFICATIONS_WRITE: 'notifications:write',
	NOTIFICATIONS_DELETE: 'notifications:delete',
	NOTIFICATIONS_MANAGE: 'notifications:*',

	// Attendance
	ATTENDANCE_READ_SELF: 'attendance:read:self',
	ATTENDANCE_READ_TEAM: 'attendance:read:team',
	ATTENDANCE_READ_ALL: 'attendance:read:all',
	ATTENDANCE_WRITE: 'attendance:write',
	ATTENDANCE_DELETE: 'attendance:delete',
	ATTENDANCE_MANAGE: 'attendance:*',

	// Leave management
	LEAVE_READ_SELF: 'leave:read:self',
	LEAVE_READ_TEAM: 'leave:read:team',
	LEAVE_READ_ALL: 'leave:read:all',
	LEAVE_WRITE: 'leave:write',
	LEAVE_DELETE: 'leave:delete',
	LEAVE_APPROVE: 'leave:approve',
	LEAVE_MANAGE: 'leave:*',

	// Performance management
	PERFORMANCE_READ_SELF: 'performance:read:self',
	PERFORMANCE_READ_TEAM: 'performance:read:team',
	PERFORMANCE_READ_ALL: 'performance:read:all',
	PERFORMANCE_WRITE: 'performance:write',
	PERFORMANCE_DELETE: 'performance:delete',
	PERFORMANCE_MANAGE: 'performance:*',

	// Reviews
	REVIEWS_READ_SELF: 'reviews:read:self',
	REVIEWS_READ_TEAM: 'reviews:read:team',
	REVIEWS_READ_ALL: 'reviews:read:all',
	REVIEWS_WRITE: 'reviews:write',
	REVIEWS_DELETE: 'reviews:delete',
	REVIEWS_MANAGE: 'reviews:*',

	// Goals & OKRs
	GOALS_READ_SELF: 'goals:read:self',
	GOALS_READ_TEAM: 'goals:read:team',
	GOALS_READ_ALL: 'goals:read:all',
	GOALS_WRITE: 'goals:write',
	GOALS_DELETE: 'goals:delete',
	GOALS_MANAGE: 'goals:*',

	// Reports and analytics
	REPORTS_READ_SELF: 'reports:read:self',
	REPORTS_READ_TEAM: 'reports:read:team',
	REPORTS_READ_ALL: 'reports:read:all',
	REPORTS_WRITE: 'reports:write',
	REPORTS_DELETE: 'reports:delete',
	REPORTS_EXECUTE: 'reports:execute',
	REPORTS_ANALYTICS: 'reports:analytics',
	REPORTS_MANAGE: 'reports:*',

	// Documents
	DOCUMENTS_READ_SELF: 'documents:read:self',
	DOCUMENTS_READ_TEAM: 'documents:read:team',
	DOCUMENTS_READ_ALL: 'documents:read:all',
	DOCUMENTS_WRITE: 'documents:write',
	DOCUMENTS_DELETE: 'documents:delete',
	DOCUMENTS_AUDIT: 'documents:audit',
	DOCUMENTS_MANAGE: 'documents:*',

	// Management
	MANAGEMENT_READ_SELF: 'management:read:self',
	MANAGEMENT_READ_TEAM: 'management:read:team',
	MANAGEMENT_READ_ALL: 'management:read:all',
	MANAGEMENT_WRITE: 'management:write',
	MANAGEMENT_DELETE: 'management:delete',
	MANAGEMENT_MANAGE: 'management:*',

	// Teams
	TEAMS_READ_SELF: 'teams:read:self',
	TEAMS_READ_TEAM: 'teams:read:team',
	TEAMS_READ_ALL: 'teams:read:all',
	TEAMS_WRITE: 'teams:write',
	TEAMS_DELETE: 'teams:delete',
	TEAMS_MANAGE: 'teams:*',

	// Role and permission management
	ROLES_READ_SELF: 'roles:read:self',
	ROLES_READ_TEAM: 'roles:read:team',
	ROLES_READ_ALL: 'roles:read:all',
	ROLES_WRITE: 'roles:write',
	ROLES_DELETE: 'roles:delete',
	ROLES_MANAGE: 'roles:*',

	// Permissions
	PERMISSIONS_READ_SELF: 'permissions:read:self',
	PERMISSIONS_READ_TEAM: 'permissions:read:team',
	PERMISSIONS_READ_ALL: 'permissions:read:all',
	PERMISSIONS_WRITE: 'permissions:write',
	PERMISSIONS_DELETE: 'permissions:delete',
	PERMISSIONS_MANAGE: 'permissions:*',

	// Payroll
	PAYROLL_READ_SELF: 'payroll:read:self',
	PAYROLL_READ_TEAM: 'payroll:read:team',
	PAYROLL_READ_ALL: 'payroll:read:all',
	PAYROLL_WRITE: 'payroll:write',
	PAYROLL_DELETE: 'payroll:delete',
	PAYROLL_MANAGE: 'payroll:*',

	// Admin permissions
	ADMIN_READ_SELF: 'admin:read:self',
	ADMIN_READ_TEAM: 'admin:read:team',
	ADMIN_READ_ALL: 'admin:read:all',
	ADMIN_WRITE: 'admin:write',
	ADMIN_DELETE: 'admin:delete',
	ADMIN_SYSTEM: 'admin:*',
	ADMIN_ALL: '*'
} as const;

/**
 * Common role level constants
 */
export const ROLE_LEVELS = {
	EMPLOYEE: 25,
	MANAGER: 50,
	HR_MANAGER: 75,
	ADMIN: 100
} as const;

/**
 * Helper function to check if user has permission for specific action on resource
 */
export function checkPermission(
	rbacManager: RBACManager,
	resource: string,
	action: 'read' | 'write' | 'create' | 'update' | 'delete' | 'manage'
): boolean {
	switch (action) {
		case 'read':
			return rbacManager.canRead(resource);
		case 'write':
		case 'create':
		case 'update':
			return rbacManager.canWrite(resource);
		case 'delete':
			return rbacManager.canDelete(resource);
		case 'manage':
			return rbacManager.canManage(resource);
		default:
			return false;
	}
}

/**
 * Helper function to create a permission checker function
 */
export function createPermissionChecker(rbacManager: RBACManager) {
	return {
		can: (permission: string) => rbacManager.hasPermission(permission),
		canAny: (permissions: string[]) => rbacManager.hasAnyPermission(permissions),
		canAll: (permissions: string[]) => rbacManager.hasAllPermissions(permissions),
		hasRole: (roleName: string) => rbacManager.hasRole(roleName),
		isAdmin: () => rbacManager.isAdmin(),
		isHR: () => rbacManager.isHRManager(),
		isManager: () => rbacManager.isManager(),
		check: (resource: string, action: string) =>
			checkPermission(rbacManager, resource, action as any)
	};
}
