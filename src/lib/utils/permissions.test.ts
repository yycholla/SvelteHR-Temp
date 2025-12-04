// T003: Unit tests for client-side permission utilities
import { describe, it, expect } from 'vitest';
import {
	hasPermission,
	hasAnyPermission,
	hasAllPermissions,
	hasRole,
	hasRoleLevel,
	getHighestRoleLevel,
	checkPermissionDetailed,
	buildPermissionContext,
	parsePermission,
	buildPermissionString,
	filterByPermission
} from './permissions';
import { RoleHierarchy } from '$lib/types/permissions';
import type { PermissionString, RoleName } from '$lib/types/permissions';

describe('hasPermission', () => {
	it('should return true for exact permission match', () => {
		const userPermissions: PermissionString[] = ['employees:read', 'departments:write'];
		expect(auth.hasPermission(userPermissions, 'employees:read')).toBe(true);
		expect(auth.hasPermission(userPermissions, 'departments:write')).toBe(true);
	});

	it('should return false when permission is missing', () => {
		const userPermissions: PermissionString[] = ['employees:read'];
		expect(auth.hasPermission(userPermissions, 'employees:write')).toBe(false);
		expect(auth.hasPermission(userPermissions, 'departments:read')).toBe(false);
	});

	it('should return true for admin wildcard "*"', () => {
		const userPermissions: PermissionString[] = ['*'];
		expect(auth.hasPermission(userPermissions, 'employees:read')).toBe(true);
		expect(auth.hasPermission(userPermissions, 'employees:write')).toBe(true);
		expect(auth.hasPermission(userPermissions, 'departments:delete')).toBe(true);
	});

	it('should return true for admin wildcard "*:*"', () => {
		const userPermissions: PermissionString[] = ['*:*'];
		expect(auth.hasPermission(userPermissions, 'employees:read')).toBe(true);
		expect(auth.hasPermission(userPermissions, 'admin:write')).toBe(true);
	});

	it('should match scoped permissions to unscoped checks', () => {
		const userPermissions: PermissionString[] = ['employees:read:team', 'departments:write:all'];
		expect(auth.hasPermission(userPermissions, 'employees:read')).toBe(true);
		expect(auth.hasPermission(userPermissions, 'departments:write')).toBe(true);
	});

	it('should NOT match different actions even with same resource', () => {
		const userPermissions: PermissionString[] = ['employees:read:team'];
		expect(auth.hasPermission(userPermissions, 'employees:write')).toBe(false);
		expect(auth.hasPermission(userPermissions, 'employees:delete')).toBe(false);
	});

	it('should handle empty permission arrays', () => {
		const userPermissions: PermissionString[] = [];
		expect(auth.hasPermission(userPermissions, 'employees:read')).toBe(false);
	});
});

describe('hasAnyPermission', () => {
	it('should return true if user has any of the required permissions', () => {
		const userPermissions: PermissionString[] = ['employees:read', 'departments:write'];
		expect(
			hasAnyPermission(userPermissions, ['employees:read', 'employees:write', 'teams:read'])
		).toBe(true);
	});

	it('should return false if user has none of the required permissions', () => {
		const userPermissions: PermissionString[] = ['employees:read'];
		expect(hasAnyPermission(userPermissions, ['departments:read', 'teams:read'])).toBe(false);
	});

	it('should return true with admin wildcard', () => {
		const userPermissions: PermissionString[] = ['*'];
		expect(hasAnyPermission(userPermissions, ['employees:write', 'departments:delete'])).toBe(true);
	});

	it('should handle empty arrays', () => {
		expect(hasAnyPermission([], ['employees:read'])).toBe(false);
		expect(hasAnyPermission(['employees:read'], [])).toBe(false);
	});
});

describe('hasAllPermissions', () => {
	it('should return true if user has all required permissions', () => {
		const userPermissions: PermissionString[] = [
			'employees:read',
			'employees:write',
			'departments:read'
		];
		expect(hasAllPermissions(userPermissions, ['employees:read', 'employees:write'])).toBe(true);
	});

	it('should return false if user is missing any required permission', () => {
		const userPermissions: PermissionString[] = ['employees:read'];
		expect(hasAllPermissions(userPermissions, ['employees:read', 'employees:write'])).toBe(false);
	});

	it('should return true with admin wildcard', () => {
		const userPermissions: PermissionString[] = ['*'];
		expect(
			hasAllPermissions(userPermissions, [
				'employees:read',
				'employees:write',
				'departments:delete'
			])
		).toBe(true);
	});

	it('should handle empty arrays', () => {
		expect(hasAllPermissions(['employees:read'], [])).toBe(true); // Vacuous truth
		expect(hasAllPermissions([], ['employees:read'])).toBe(false);
	});
});

describe('hasRole', () => {
	it('should return true if user has the specified role', () => {
		const userRoles = [
			{ id: '1', name: 'Manager' as RoleName, level: RoleHierarchy.Manager },
			{ id: '2', name: 'Employee' as RoleName, level: RoleHierarchy.Employee }
		];
		expect(auth.hasRole(userRoles, 'Manager')).toBe(true);
		expect(auth.hasRole(userRoles, 'Employee')).toBe(true);
	});

	it('should return false if user does not have the specified role', () => {
		const userRoles = [{ id: '1', name: 'Employee' as RoleName, level: RoleHierarchy.Employee }];
		expect(auth.hasRole(userRoles, 'Admin')).toBe(false);
		expect(auth.hasRole(userRoles, 'HR Manager')).toBe(false);
	});

	it('should handle empty role arrays', () => {
		expect(auth.hasRole([], 'Admin')).toBe(false);
	});
});

describe('hasRoleLevel', () => {
	it('should return true if user has role level >= required', () => {
		const userRoles = [{ id: '1', name: 'Manager' as RoleName, level: RoleHierarchy.Manager }];
		expect(hasRoleLevel(userRoles, RoleHierarchy.Employee)).toBe(true); // 50 >= 25
		expect(hasRoleLevel(userRoles, RoleHierarchy.Manager)).toBe(true); // 50 >= 50
	});

	it('should return false if user has role level < required', () => {
		const userRoles = [{ id: '1', name: 'Employee' as RoleName, level: RoleHierarchy.Employee }];
		expect(hasRoleLevel(userRoles, RoleHierarchy.Manager)).toBe(false); // 25 < 50
		expect(hasRoleLevel(userRoles, RoleHierarchy.Admin)).toBe(false); // 25 < 100
	});

	it('should use highest role level if user has multiple roles', () => {
		const userRoles = [
			{ id: '1', name: 'Employee' as RoleName, level: RoleHierarchy.Employee },
			{ id: '2', name: 'Manager' as RoleName, level: RoleHierarchy.Manager }
		];
		expect(hasRoleLevel(userRoles, RoleHierarchy.Manager)).toBe(true); // Max(25, 50) >= 50
	});

	it('should handle empty role arrays', () => {
		expect(hasRoleLevel([], RoleHierarchy.Employee)).toBe(false);
	});
});

describe('getHighestRoleLevel', () => {
	it('should return highest level when user has multiple roles', () => {
		const userRoles = [
			{ id: '1', name: 'Employee' as RoleName, level: RoleHierarchy.Employee },
			{ id: '2', name: 'Manager' as RoleName, level: RoleHierarchy.Manager },
			{ id: '3', name: 'HR Manager' as RoleName, level: RoleHierarchy['HR Manager'] }
		];
		expect(getHighestRoleLevel(userRoles)).toBe(RoleHierarchy['HR Manager']); // 75
	});

	it('should return 0 for empty role arrays', () => {
		expect(getHighestRoleLevel([])).toBe(0);
	});

	it('should return single role level', () => {
		const userRoles = [{ id: '1', name: 'Manager' as RoleName, level: RoleHierarchy.Manager }];
		expect(getHighestRoleLevel(userRoles)).toBe(RoleHierarchy.Manager);
	});
});

describe('checkPermissionDetailed', () => {
	it('should return allowed with admin wildcard reason', () => {
		const result = checkPermissionDetailed(['*'], 'employees:write');
		expect(result.allowed).toBe(true);
		expect(result.reason).toContain('admin wildcard');
		expect(result.matchedPermission).toBe('*');
	});

	it('should return allowed with exact match reason', () => {
		const result = checkPermissionDetailed(['employees:read'], 'employees:read');
		expect(result.allowed).toBe(true);
		expect(result.reason).toContain('exact permission match');
		expect(result.matchedPermission).toBe('employees:read');
	});

	it('should return allowed with scoped permission reason', () => {
		const result = checkPermissionDetailed(['employees:read:team'], 'employees:read');
		expect(result.allowed).toBe(true);
		expect(result.reason).toContain('scoped permission');
		expect(result.matchedPermission).toBe('employees:read:team');
	});

	it('should return denied with reason when permission is missing', () => {
		const result = checkPermissionDetailed(['employees:read'], 'employees:write');
		expect(result.allowed).toBe(false);
		expect(result.reason).toContain('lacks required permission');
		expect(result.matchedPermission).toBeUndefined();
	});
});

describe('buildPermissionContext', () => {
	it('should build context with all properties', () => {
		const permissions: PermissionString[] = ['employees:read', 'departments:write'];
		const roles = [
			{ id: '1', name: 'Manager' as RoleName, level: RoleHierarchy.Manager },
			{ id: '2', name: 'Employee' as RoleName, level: RoleHierarchy.Employee }
		];
		const userId = 'user123';

		const ctx = buildPermissionContext(permissions, roles, userId);

		expect(ctx.permissions).toEqual(permissions);
		expect(ctx.roles).toEqual(roles);
		expect(ctx.userId).toBe(userId);
		expect(ctx.flags).toBeDefined();
		expect(ctx.flags?.isManager).toBe(true);
		expect(ctx.flags?.isAdmin).toBe(false);
		expect(ctx.flags?.canReadEmployees).toBe(true);
		expect(ctx.flags?.canWriteEmployees).toBe(false);
		expect(ctx.flags?.canWriteDepartments).toBe(true);
	});

	it('should add level property to roles if missing', () => {
		const permissions: PermissionString[] = [];
		const rolesWithoutLevel = [{ id: '1', name: 'Manager' as RoleName }];
		const userId = 'user123';

		const ctx = buildPermissionContext(permissions, rolesWithoutLevel, userId);

		expect(ctx.roles[0].level).toBe(RoleHierarchy.Manager);
	});

	it('should set admin flags correctly', () => {
		const permissions: PermissionString[] = ['*'];
		const roles = [{ id: '1', name: 'Admin' as RoleName, level: RoleHierarchy.Admin }];
		const userId = 'admin123';

		const ctx = buildPermissionContext(permissions, roles, userId);

		expect(ctx.flags?.isAdmin).toBe(true);
		expect(ctx.flags?.canReadEmployees).toBe(true);
		expect(ctx.flags?.canWriteEmployees).toBe(true);
		expect(ctx.flags?.canAccessAdmin).toBe(true);
	});
});

describe('parsePermission', () => {
	it('should parse permission with scope', () => {
		const result = parsePermission('employees:read:team');
		expect(result.resource).toBe('employees');
		expect(result.action).toBe('read');
		expect(result.scope).toBe('team');
	});

	it('should parse permission without scope', () => {
		const result = parsePermission('departments:write');
		expect(result.resource).toBe('departments');
		expect(result.action).toBe('write');
		expect(result.scope).toBeUndefined();
	});

	it('should handle wildcard permissions', () => {
		const result1 = parsePermission('*');
		expect(result1.resource).toBeUndefined();
		expect(result1.action).toBeUndefined();
		expect(result1.scope).toBeUndefined();

		const result2 = parsePermission('*:*');
		expect(result2.resource).toBeUndefined();
		expect(result2.action).toBeUndefined();
		expect(result2.scope).toBeUndefined();
	});
});

describe('buildPermissionString', () => {
	it('should build permission with scope', () => {
		const result = buildPermissionString('employees', 'read', 'team');
		expect(result).toBe('employees:read:team');
	});

	it('should build permission without scope', () => {
		const result = buildPermissionString('departments', 'write');
		expect(result).toBe('departments:write');
	});

	it('should handle all resource and action types', () => {
		expect(buildPermissionString('tasks', 'delete', 'all')).toBe('tasks:delete:all');
		expect(buildPermissionString('reports', 'execute')).toBe('reports:execute');
		expect(buildPermissionString('leave', 'approve')).toBe('leave:approve');
	});
});

describe('filterByPermission', () => {
	interface TestRoute {
		path: string;
		requiredPermission: PermissionString;
	}

	it('should filter items based on permission check', () => {
		const routes: TestRoute[] = [
			{ path: '/employees', requiredPermission: 'employees:read' },
			{ path: '/employees/new', requiredPermission: 'employees:write' },
			{ path: '/departments', requiredPermission: 'departments:read' }
		];
		const userPermissions: PermissionString[] = ['employees:read', 'departments:read'];

		const visible = filterByPermission(routes, userPermissions, (r) => r.requiredPermission);

		expect(visible).toHaveLength(2);
		expect(visible[0].path).toBe('/employees');
		expect(visible[1].path).toBe('/departments');
	});

	it('should support array of required permissions (OR logic)', () => {
		interface TestItem {
			name: string;
			requiredPermissions: PermissionString[];
		}

		const items: TestItem[] = [
			{ name: 'HR Dashboard', requiredPermissions: ['employees:read', 'departments:read'] },
			{ name: 'Admin Panel', requiredPermissions: ['admin:read', 'admin:write'] }
		];
		const userPermissions: PermissionString[] = ['employees:read'];

		const visible = filterByPermission(items, userPermissions, (i) => i.requiredPermissions);

		expect(visible).toHaveLength(1);
		expect(visible[0].name).toBe('HR Dashboard');
	});

	it('should return all items for admin wildcard', () => {
		const routes: TestRoute[] = [
			{ path: '/employees', requiredPermission: 'employees:read' },
			{ path: '/admin', requiredPermission: 'admin:write' }
		];
		const userPermissions: PermissionString[] = ['*'];

		const visible = filterByPermission(routes, userPermissions, (r) => r.requiredPermission);

		expect(visible).toHaveLength(2);
	});

	it('should return empty array when no permissions match', () => {
		const routes: TestRoute[] = [
			{ path: '/employees', requiredPermission: 'employees:read' },
			{ path: '/departments', requiredPermission: 'departments:read' }
		];
		const userPermissions: PermissionString[] = ['teams:read'];

		const visible = filterByPermission(routes, userPermissions, (r) => r.requiredPermission);

		expect(visible).toHaveLength(0);
	});
});
