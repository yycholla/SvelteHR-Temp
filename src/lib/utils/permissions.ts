// T002: Client-side permission utilities for frontend components
// NOTE: These are UX-only checks. Server-side enforcement is MANDATORY for security.
// NEVER rely on client-side permission checks for security - always validate server-side.

import type {
	ActionType,
	PermissionCheckResult,
	PermissionContext,
	PermissionString,
	ResourceType,
	RoleName,
	ScopeType
} from '$lib/types/permissions';
import { RoleHierarchy } from '$lib/types/permissions';

/**
 * Check if user has a specific permission (UX-only, NOT security enforcement)
 * Server-side checks are MANDATORY for security.
 *
 * @param userPermissions - Array of permission strings from backend
 * @param requiredPermission - Permission to check for
 * @returns true if user has the permission or wildcard access
 *
 * @example
 * ```ts
 * auth.hasPermission(user.permissions, 'employees:read') // true/false
 * auth.hasPermission(['*'], 'employees:write') // true (wildcard)
 * auth.hasPermission(['employees:read:team'], 'employees:read') // true (scope matches)
 * ```
 */
export function hasPermission(
	userPermissions: PermissionString[],
	requiredPermission: PermissionString
): boolean {
	// Check for admin wildcard
	if (userPermissions.includes('*') || userPermissions.includes('*:*')) {
		return true;
	}

	// Exact match
	if (userPermissions.includes(requiredPermission)) {
		return true;
	}

	// Check for scoped permission match
	// If required is "employees:read", user with "employees:read:team" should match
	const [resource, action] = requiredPermission.split(':');
	const scopedMatches = userPermissions.filter((perm) => {
		const [r, a, s] = perm.split(':');
		return r === resource && a === action && s !== undefined;
	});

	return scopedMatches.length > 0;
}

/**
 * Check if user has ANY of the required permissions (UX-only)
 *
 * @param userPermissions - Array of permission strings from backend
 * @param requiredPermissions - Array of permissions to check for
 * @returns true if user has at least one of the permissions
 *
 * @example
 * ```ts
 * hasAnyPermission(['employees:read'], ['employees:read', 'employees:write']) // true
 * hasAnyPermission(['employees:read'], ['departments:read', 'teams:read']) // false
 * ```
 */
export function hasAnyPermission(
	userPermissions: PermissionString[],
	requiredPermissions: PermissionString[]
): boolean {
	return requiredPermissions.some((perm) => hasPermission(userPermissions, perm));
}

/**
 * Check if user has ALL of the required permissions (UX-only)
 *
 * @param userPermissions - Array of permission strings from backend
 * @param requiredPermissions - Array of permissions to check for
 * @returns true if user has all of the permissions
 *
 * @example
 * ```ts
 * hasAllPermissions(['employees:read', 'employees:write'], ['employees:read', 'employees:write']) // true
 * hasAllPermissions(['employees:read'], ['employees:read', 'employees:write']) // false
 * ```
 */
export function hasAllPermissions(
	userPermissions: PermissionString[],
	requiredPermissions: PermissionString[]
): boolean {
	return requiredPermissions.every((perm) => hasPermission(userPermissions, perm));
}

/**
 * Check if user has a specific role
 *
 * @param userRoles - Array of role objects from backend
 * @param requiredRole - Role name to check for
 * @returns true if user has the role
 *
 * @example
 * ```ts
 * auth.hasRole(user.roles, 'Admin') // true/false
 * auth.hasRole(user.roles, 'HR Manager') // true/false
 * ```
 */
export function hasRole(
	userRoles: Array<{ name: RoleName; level: number }>,
	requiredRole: RoleName
): boolean {
	return userRoles.some((role) => role.name === requiredRole);
}

/**
 * Check if user's highest role meets or exceeds required level
 *
 * @param userRoles - Array of role objects from backend
 * @param requiredLevel - Minimum role level required
 * @returns true if user's highest role level >= required level
 *
 * @example
 * ```ts
 * hasRoleLevel(user.roles, RoleHierarchy.Manager) // true if Manager or above
 * hasRoleLevel(user.roles, RoleHierarchy.Admin) // true only if Admin
 * ```
 */
export function hasRoleLevel(
	userRoles: Array<{ name: RoleName; level: number }>,
	requiredLevel: number
): boolean {
	const highestLevel = Math.max(...userRoles.map((role) => role.level), 0);
	return highestLevel >= requiredLevel;
}

/**
 * Get user's highest role level
 *
 * @param userRoles - Array of role objects from backend
 * @returns Highest role level (0 if no roles)
 */
export function getHighestRoleLevel(userRoles: Array<{ name: RoleName; level: number }>): number {
	return Math.max(...userRoles.map((role) => role.level), 0);
}

/**
 * Check permission with detailed result (UX-only)
 *
 * @param userPermissions - Array of permission strings from backend
 * @param requiredPermission - Permission to check for
 * @returns PermissionCheckResult with allowed flag, reason, and matched permission
 *
 * @example
 * ```ts
 * const result = checkPermissionDetailed(user.permissions, 'employees:read');
 * if (!result.allowed) {
 *   console.log(`Access denied: ${result.reason}`);
 * }
 * ```
 */
export function checkPermissionDetailed(
	userPermissions: PermissionString[],
	requiredPermission: PermissionString
): PermissionCheckResult {
	// Check for admin wildcard
	if (userPermissions.includes('*') || userPermissions.includes('*:*')) {
		return {
			allowed: true,
			reason: 'User has admin wildcard permission',
			matchedPermission: '*'
		};
	}

	// Exact match
	if (userPermissions.includes(requiredPermission)) {
		return {
			allowed: true,
			reason: 'User has exact permission match',
			matchedPermission: requiredPermission
		};
	}

	// Check for scoped permission match
	const [resource, action] = requiredPermission.split(':');
	const scopedMatch = userPermissions.find((perm) => {
		const [r, a, s] = perm.split(':');
		return r === resource && a === action && s !== undefined;
	});

	if (scopedMatch) {
		return {
			allowed: true,
			reason: `User has scoped permission: ${scopedMatch}`,
			matchedPermission: scopedMatch as PermissionString
		};
	}

	return {
		allowed: false,
		reason: `User lacks required permission: ${requiredPermission}`
	};
}

/**
 * Build permission context with computed flags for common checks
 *
 * @param permissions - Array of permission strings from backend
 * @param roles - Array of role objects from backend
 * @param userId - User ID for scope checks
 * @returns PermissionContext with permissions, roles, userId, and computed flags
 *
 * @example
 * ```ts
 * const ctx = buildPermissionContext(user.permissions, user.roles, user.id);
 * if (ctx.flags.canReadEmployees) {
 *   // Show employees page
 * }
 * ```
 */
export function buildPermissionContext(
	permissions: PermissionString[],
	roles: Array<{ id: string; name: RoleName; level?: number }>,
	userId: string
): PermissionContext {
	// Ensure roles have level property
	const rolesWithLevel = roles.map((role) => ({
		...role,
		level: role.level ?? RoleHierarchy[role.name] ?? 0
	}));

	return {
		permissions,
		roles: rolesWithLevel,
		userId,
		flags: {
			isAdmin: hasRole(rolesWithLevel, 'Admin'),
			isHRManager: hasRole(rolesWithLevel, 'HR Manager'),
			isManager: hasRole(rolesWithLevel, 'Manager'),
			canReadEmployees: hasPermission(permissions, 'employees:read'),
			canWriteEmployees: hasPermission(permissions, 'employees:write'),
			canDeleteEmployees: hasPermission(permissions, 'employees:delete'),
			canReadDepartments: hasPermission(permissions, 'departments:read'),
			canWriteDepartments: hasPermission(permissions, 'departments:write'),
			canDeleteDepartments: hasPermission(permissions, 'departments:delete'),
			canAccessAdmin: hasPermission(permissions, 'admin:read'),
			canAccessHR: hasAnyPermission(permissions, [
				'employees:read',
				'employees:write',
				'performance:read',
				'leave:read'
			])
		}
	};
}

/**
 * Parse permission string into components
 *
 * @param permissionString - Permission string to parse
 * @returns Object with resource, action, and optional scope
 *
 * @example
 * ```ts
 * parsePermission('employees:read:team') // { resource: 'employees', action: 'read', scope: 'team' }
 * parsePermission('departments:write') // { resource: 'departments', action: 'write', scope: undefined }
 * ```
 */
export function parsePermission(permissionString: PermissionString): {
	resource?: ResourceType;
	action?: ActionType;
	scope?: ScopeType;
} {
	if (permissionString === '*' || permissionString === '*:*') {
		return {};
	}

	const [resource, action, scope] = permissionString.split(':');
	return {
		resource: resource as ResourceType,
		action: action as ActionType,
		scope: scope as ScopeType | undefined
	};
}

/**
 * Build permission string from components
 *
 * @param resource - Resource type
 * @param action - Action type
 * @param scope - Optional scope type
 * @returns Permission string
 *
 * @example
 * ```ts
 * buildPermissionString('employees', 'read', 'team') // 'employees:read:team'
 * buildPermissionString('departments', 'write') // 'departments:write'
 * ```
 */
export function buildPermissionString(
	resource: ResourceType,
	action: ActionType,
	scope?: ScopeType
): PermissionString {
	if (scope) {
		return `${resource}:${action}:${scope}` as PermissionString;
	}
	return `${resource}:${action}` as PermissionString;
}

/**
 * Filter array of items based on permission check
 *
 * @param items - Array of items to filter
 * @param userPermissions - User's permission strings
 * @param getRequiredPermission - Function to get required permission for each item
 * @returns Filtered array containing only items user has permission for
 *
 * @example
 * ```ts
 * const visibleRoutes = filterByPermission(
 *   routes,
 *   user.permissions,
 *   route => route.requiredPermission
 * );
 * ```
 */
export function filterByPermission<T>(
	items: T[],
	userPermissions: PermissionString[],
	getRequiredPermission: (item: T) => PermissionString | PermissionString[]
): T[] {
	return items.filter((item) => {
		const required = getRequiredPermission(item);
		if (Array.isArray(required)) {
			return hasAnyPermission(userPermissions, required);
		}
		return hasPermission(userPermissions, required);
	});
}
