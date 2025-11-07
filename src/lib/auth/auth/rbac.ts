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
	canRead(resource: string): boolean;
	canWrite(resource: string): boolean;
	canDelete(resource: string): boolean;
	canManage(resource: string): boolean;

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
		assignment.role?.permissions?.forEach((permission) => {
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
		canRead(resource: string): boolean {
			return this.hasPermission(`${resource}:read`) || this.hasPermission(`${resource}:*`);
		},

		canWrite(resource: string): boolean {
			return (
				this.hasPermission(`${resource}:write`) ||
				this.hasPermission(`${resource}:create`) ||
				this.hasPermission(`${resource}:update`) ||
				this.hasPermission(`${resource}:*`)
			);
		},

		canDelete(resource: string): boolean {
			return this.hasPermission(`${resource}:delete`) || this.hasPermission(`${resource}:*`);
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
 */
export const PERMISSIONS = {
	// User management
	USERS_READ: 'users:read',
	USERS_WRITE: 'users:write',
	USERS_CREATE: 'users:create',
	USERS_UPDATE: 'users:update',
	USERS_DELETE: 'users:delete',
	USERS_MANAGE: 'users:*',

	// Employee management
	EMPLOYEES_READ: 'employees:read',
	EMPLOYEES_WRITE: 'employees:write',
	EMPLOYEES_CREATE: 'employees:create',
	EMPLOYEES_UPDATE: 'employees:update',
	EMPLOYEES_DELETE: 'employees:delete',
	EMPLOYEES_MANAGE: 'employees:*',

	// Department management
	DEPARTMENTS_READ: 'departments:read',
	DEPARTMENTS_WRITE: 'departments:write',
	DEPARTMENTS_CREATE: 'departments:create',
	DEPARTMENTS_UPDATE: 'departments:update',
	DEPARTMENTS_DELETE: 'departments:delete',
	DEPARTMENTS_MANAGE: 'departments:*',

	// Role and permission management
	ROLES_READ: 'roles:read',
	ROLES_WRITE: 'roles:write',
	ROLES_CREATE: 'roles:create',
	ROLES_UPDATE: 'roles:update',
	ROLES_DELETE: 'roles:delete',
	ROLES_MANAGE: 'roles:*',

	// Reports and analytics
	REPORTS_READ: 'reports:read',
	REPORTS_CREATE: 'reports:create',
	REPORTS_HR: 'reports:hr',
	REPORTS_TEAM: 'reports:team',
	REPORTS_MANAGE: 'reports:*',

	// Performance management
	PERFORMANCE_READ: 'performance:read',
	PERFORMANCE_WRITE: 'performance:write',
	PERFORMANCE_MANAGE: 'performance:*',

	// Leave management
	LEAVE_READ: 'leave:read',
	LEAVE_CREATE: 'leave:create',
	LEAVE_APPROVE: 'leave:approve',
	LEAVE_MANAGE: 'leave:*',

	// Payroll
	PAYROLL_READ: 'payroll:read',
	PAYROLL_WRITE: 'payroll:write',
	PAYROLL_MANAGE: 'payroll:*',

	// Admin permissions
	ADMIN_ALL: '*',
	ADMIN_SYSTEM: 'admin:*'
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
