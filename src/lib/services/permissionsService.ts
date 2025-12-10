/**
 * Permissions Service for PostGraphile HR Application
 *
 * Provides permission management, role assignment, and access control
 * functionality for the HR system with PostGraphile backend integration.
 */

import type { Permission, RBACManager, Role, UserRoleAssignment } from '$lib/auth/rbac';
import { PERMISSIONS, ROLE_LEVELS } from '$lib/auth/rbac';

// Permission management interfaces
export interface PermissionCheck {
	permission: string;
	granted: boolean;
	reason?: string;
}

export interface RolePermissionSummary {
	roleId: string;
	roleName: string;
	permissions: Permission[];
	level: number;
	isActive: boolean;
}

export interface UserPermissionProfile {
	userId: string;
	roles: UserRoleAssignment[];
	allPermissions: Permission[];
	effectiveLevel: number;
	canAdmin: boolean;
	canManageHR: boolean;
	canManageTeam: boolean;
}

/**
 * Permission Service class for managing user permissions and access control
 */
export class PermissionsService {
	private rbacManager: RBACManager;

	constructor(rbacManager: RBACManager) {
		this.rbacManager = rbacManager;
	}

	/**
	 * Check if user has a specific permission
	 */
	checkPermission(permission: string): PermissionCheck {
		const granted = this.rbacManager.hasPermission(permission);

		return {
			permission,
			granted,
			reason: granted ? 'Permission granted' : 'Insufficient permissions'
		};
	}

	/**
	 * Check multiple permissions at once
	 */
	checkPermissions(permissions: string[]): PermissionCheck[] {
		return permissions.map((permission) => this.checkPermission(permission));
	}

	/**
	 * Check if user has ANY of the provided permissions
	 */
	checkAnyPermission(permissions: string[]): PermissionCheck {
		const granted = this.rbacManager.hasAnyPermission(permissions);

		return {
			permission: permissions.join(' OR '),
			granted,
			reason: granted
				? 'At least one permission granted'
				: 'None of the required permissions granted'
		};
	}

	/**
	 * Check if user has ALL of the provided permissions
	 */
	checkAllPermissions(permissions: string[]): PermissionCheck {
		const granted = this.rbacManager.hasAllPermissions(permissions);

		return {
			permission: permissions.join(' AND '),
			granted,
			reason: granted ? 'All permissions granted' : 'Not all required permissions granted'
		};
	}

	/**
	 * Get user's permission profile
	 */
	getUserPermissionProfile(): UserPermissionProfile {
		return {
			userId: this.rbacManager.userId || '',
			roles: this.rbacManager.roles,
			allPermissions: this.rbacManager.permissions,
			effectiveLevel: this.rbacManager.getHighestRoleLevel(),
			canAdmin: this.rbacManager.isAdmin(),
			canManageHR: this.rbacManager.isHRManager(),
			canManageTeam: this.rbacManager.isManager()
		};
	}

	/**
	 * Get permissions grouped by resource
	 */
	getPermissionsByResource(): Record<string, Permission[]> {
		const permissions = this.rbacManager.permissions;
		const grouped: Record<string, Permission[]> = {};

		permissions.forEach((permission: Permission) => {
			const resource = permission.resource || 'general';
			if (!grouped[resource]) {
				grouped[resource] = [];
			}
			grouped[resource].push(permission);
		});

		return grouped;
	}

	/**
	 * Check resource-specific permissions
	 */
	checkResourceAccess(
		resource: string,
		action: 'read' | 'write' | 'create' | 'update' | 'delete' | 'manage'
	): PermissionCheck {
		let granted = false;
		let reason = '';

		switch (action) {
			case 'read':
				granted = this.rbacManager.canRead(resource);
				reason = granted
					? `Read access to ${resource} granted`
					: `Read access to ${resource} denied`;
				break;
			case 'write':
			case 'create':
			case 'update':
				granted = this.rbacManager.canWrite(resource);
				reason = granted
					? `Write access to ${resource} granted`
					: `Write access to ${resource} denied`;
				break;
			case 'delete':
				granted = this.rbacManager.canDelete(resource);
				reason = granted
					? `Delete access to ${resource} granted`
					: `Delete access to ${resource} denied`;
				break;
			case 'manage':
				granted = this.rbacManager.canManage(resource);
				reason = granted
					? `Management access to ${resource} granted`
					: `Management access to ${resource} denied`;
				break;
		}

		return {
			permission: `${resource}:${action}`,
			granted,
			reason
		};
	}

	/**
	 * Get common HR permissions summary
	 */
	getHRPermissionsSummary(): {
		canViewEmployees: boolean;
		canManageEmployees: boolean;
		canViewReports: boolean;
		canManageDepartments: boolean;
		canManageRoles: boolean;
		canViewPayroll: boolean;
		canApproveLeave: boolean;
	} {
		return {
			canViewEmployees: this.rbacManager.canRead('employees'),
			canManageEmployees: this.rbacManager.canManage('employees'),
			canViewReports: this.rbacManager.hasPermission(PERMISSIONS.REPORTS_READ),
			canManageDepartments: this.rbacManager.canManage('departments'),
			canManageRoles: this.rbacManager.canManage('roles'),
			canViewPayroll: this.rbacManager.canRead('payroll'),
			canApproveLeave: this.rbacManager.hasPermission(PERMISSIONS.LEAVE_APPROVE)
		};
	}

	/**
	 * Get role level information
	 */
	getRoleLevelInfo(): {
		currentLevel: number;
		levelName: string;
		canPromoteTo: string[];
		canDemoteTo: string[];
	} {
		const currentLevel = this.rbacManager.getHighestRoleLevel();

		let levelName = 'Unknown';
		if (currentLevel >= ROLE_LEVELS.ADMIN) levelName = 'Administrator';
		else if (currentLevel >= ROLE_LEVELS.HR_MANAGER) levelName = 'HR Manager';
		else if (currentLevel >= ROLE_LEVELS.MANAGER) levelName = 'Manager';
		else if (currentLevel >= ROLE_LEVELS.EMPLOYEE) levelName = 'Employee';

		// Only admins can typically promote/demote users
		const canPromoteTo: string[] = [];
		const canDemoteTo: string[] = [];

		if (this.rbacManager.isAdmin()) {
			canPromoteTo.push('HR Manager', 'Manager', 'Employee');
			canDemoteTo.push('HR Manager', 'Manager', 'Employee');
		} else if (this.rbacManager.isHRManager()) {
			canPromoteTo.push('Manager', 'Employee');
			canDemoteTo.push('Manager', 'Employee');
		}

		return {
			currentLevel,
			levelName,
			canPromoteTo,
			canDemoteTo
		};
	}

	/**
	 * Debug permission information
	 */
	debugPermissions(): Record<string, any> {
		const profile = this.getUserPermissionProfile();
		const hrSummary = this.getHRPermissionsSummary();
		const roleLevelInfo = this.getRoleLevelInfo();

		return {
			...this.rbacManager.debugInfo(),
			profile,
			hrSummary,
			roleLevelInfo,
			permissionsByResource: this.getPermissionsByResource()
		};
	}

	/**
	 * Validate permission string format
	 */
	static validatePermissionFormat(permission: string): boolean {
		// Permission should be in format "resource:action" or "*" / "*:*" for wildcard
		if (permission === '*' || permission === '*:*') return true;

		const parts = permission.split(':');
		return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
	}

	/**
	 * Get permission suggestions based on role
	 */
	getPermissionSuggestions(roleName: string): string[] {
		const suggestions: string[] = [];

		switch (roleName.toLowerCase()) {
			case 'admin':
			case 'administrator':
				suggestions.push(PERMISSIONS.ADMIN_ALL);
				break;
			case 'hr manager':
			case 'hr_manager':
				suggestions.push(
					PERMISSIONS.EMPLOYEES_MANAGE,
					PERMISSIONS.DEPARTMENTS_MANAGE,
					PERMISSIONS.REPORTS_HR,
					PERMISSIONS.PERFORMANCE_MANAGE,
					PERMISSIONS.LEAVE_APPROVE,
					PERMISSIONS.PAYROLL_READ
				);
				break;
			case 'manager':
				suggestions.push(
					PERMISSIONS.EMPLOYEES_READ,
					PERMISSIONS.DEPARTMENTS_READ,
					PERMISSIONS.REPORTS_TEAM,
					PERMISSIONS.PERFORMANCE_READ,
					PERMISSIONS.LEAVE_APPROVE
				);
				break;
			case 'employee':
				suggestions.push(
					PERMISSIONS.EMPLOYEES_READ,
					PERMISSIONS.DEPARTMENTS_READ,
					PERMISSIONS.LEAVE_CREATE
				);
				break;
			default:
				suggestions.push(PERMISSIONS.EMPLOYEES_READ);
		}

		return suggestions;
	}

	/**
	 * Check if user can access a specific route
	 */
	canAccessRoute(routePath: string): PermissionCheck {
		// Define route-permission mappings
		const routePermissions: Record<string, string[]> = {
			'/admin': [PERMISSIONS.ADMIN_ALL],
			'/hr': [PERMISSIONS.EMPLOYEES_READ],
			'/hr/employees': [PERMISSIONS.EMPLOYEES_READ],
			'/hr/employees/create': [PERMISSIONS.EMPLOYEES_CREATE],
			'/hr/departments': [PERMISSIONS.DEPARTMENTS_READ],
			'/hr/reports': [PERMISSIONS.REPORTS_HR],
			'/dashboard': [], // Generally accessible
			'/profile': [] // User's own profile
		};

		// Find matching route pattern
		let requiredPermissions: string[] = [];
		for (const [pattern, permissions] of Object.entries(routePermissions)) {
			if (routePath.startsWith(pattern)) {
				requiredPermissions = permissions;
				break;
			}
		}

		// If no specific permissions required, allow access
		if (requiredPermissions.length === 0) {
			return {
				permission: 'route:' + routePath,
				granted: true,
				reason: 'No specific permissions required for this route'
			};
		}

		// Check if user has any of the required permissions
		const hasAccess = requiredPermissions.some((permission) =>
			this.rbacManager.hasPermission(permission)
		);

		return {
			permission: 'route:' + routePath,
			granted: hasAccess,
			reason: hasAccess
				? `Access granted to route ${routePath}`
				: `Access denied to route ${routePath} - missing permissions: ${requiredPermissions.join(', ')}`
		};
	}
}

/**
 * Create a permissions service instance from an RBAC manager
 */
export function createPermissionsService(rbacManager: RBACManager): PermissionsService {
	return new PermissionsService(rbacManager);
}

/**
 * Common permission checking utilities
 */
export const PermissionUtils = {
	/**
	 * Format permission for display
	 */
	formatPermission(permission: string): string {
		if (permission === '*' || permission === '*:*') return 'All Permissions';

		const [resource, action] = permission.split(':');
		if (!resource || !action) return permission;

		const formattedResource = resource.charAt(0).toUpperCase() + resource.slice(1);
		const formattedAction = action.charAt(0).toUpperCase() + action.slice(1);

		return `${formattedResource} - ${formattedAction}`;
	},

	/**
	 * Get permission icon based on type
	 */
	getPermissionIcon(permission: string): string {
		if (permission.includes('read')) return '👀';
		if (permission.includes('write') || permission.includes('create')) return '✏️';
		if (permission.includes('delete')) return '🗑️';
		if (permission.includes('manage') || permission === '*' || permission === '*:*') return '⚙️';
		return '🔒';
	},

	/**
	 * Get permission color based on sensitivity
	 */
	getPermissionColor(permission: string): string {
		if (permission === '*' || permission === '*:*' || permission.includes('admin')) return 'red';
		if (permission.includes('delete')) return 'orange';
		if (permission.includes('write') || permission.includes('create')) return 'yellow';
		if (permission.includes('manage')) return 'blue';
		return 'green';
	}
};

// Export common permission constants for easy access
export { PERMISSIONS, ROLE_LEVELS } from '$lib/auth/rbac';
