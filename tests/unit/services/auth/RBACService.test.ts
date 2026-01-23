import { describe, it, expect } from 'vitest';
import { RBACService } from '$services/auth/RBACService';

describe('RBACService', () => {
	const rbac = new RBACService();

	describe('hasPermission', () => {
		it('returns true for exact permission match', () => {
			const user = { permissions: ['users:read'] };
			expect(rbac.hasPermission(user, 'users:read')).toBe(true);
		});

		it('returns false when permission missing', () => {
			const user = { permissions: ['users:read'] };
			expect(rbac.hasPermission(user, 'users:write')).toBe(false);
		});

		it('returns true for admin wildcard', () => {
			const user = { permissions: ['*'] };
			expect(rbac.hasPermission(user, 'users:write')).toBe(true);
		});

		it('returns true for admin wildcard *:*', () => {
			const user = { permissions: ['*:*'] };
			expect(rbac.hasPermission(user, 'users:write')).toBe(true);
		});

		it('returns false for empty permissions array', () => {
			const user = { permissions: [] };
			expect(rbac.hasPermission(user, 'users:read')).toBe(false);
		});

		it('returns false for user with no permissions property', () => {
			const user = {} as { permissions: string[] };
			expect(rbac.hasPermission(user, 'users:read')).toBe(false);
		});

		it('returns true for scoped permission matching', () => {
			const user = { permissions: ['users:write:all'] };
			expect(rbac.hasPermission(user, 'users:write')).toBe(true);
		});

		it('returns false for different resource in scoped permission', () => {
			const user = { permissions: ['posts:write:all'] };
			expect(rbac.hasPermission(user, 'users:write')).toBe(false);
		});

		it('returns false for different action in scoped permission', () => {
			const user = { permissions: ['users:read:all'] };
			expect(rbac.hasPermission(user, 'users:write')).toBe(false);
		});
	});

	describe('hasAnyPermission', () => {
		it('returns true if user has any required permission', () => {
			const user = { permissions: ['users:read'] };
			expect(rbac.hasAnyPermission(user, ['users:read', 'users:write'])).toBe(true);
		});

		it('returns false if user has none', () => {
			const user = { permissions: ['posts:read'] };
			expect(rbac.hasAnyPermission(user, ['users:read', 'users:write'])).toBe(false);
		});

		it('returns true if user has multiple matching permissions', () => {
			const user = { permissions: ['users:read', 'users:write'] };
			expect(rbac.hasAnyPermission(user, ['users:read', 'users:write'])).toBe(true);
		});

		it('returns false for empty required permissions', () => {
			const user = { permissions: ['users:read'] };
			expect(rbac.hasAnyPermission(user, [])).toBe(false);
		});

		it('returns true if user has wildcard', () => {
			const user = { permissions: ['*'] };
			expect(rbac.hasAnyPermission(user, ['users:read', 'posts:write'])).toBe(true);
		});
	});

	describe('hasAllPermissions', () => {
		it('returns true if user has all required permissions', () => {
			const user = { permissions: ['users:read', 'users:write'] };
			expect(rbac.hasAllPermissions(user, ['users:read', 'users:write'])).toBe(true);
		});

		it('returns false if missing any permission', () => {
			const user = { permissions: ['users:read'] };
			expect(rbac.hasAllPermissions(user, ['users:read', 'users:write'])).toBe(false);
		});

		it('returns true for empty required permissions', () => {
			const user = { permissions: ['users:read'] };
			expect(rbac.hasAllPermissions(user, [])).toBe(true);
		});

		it('returns true if user has wildcard', () => {
			const user = { permissions: ['*'] };
			expect(rbac.hasAllPermissions(user, ['users:read', 'posts:write'])).toBe(true);
		});
	});

	describe('canAccessResource', () => {
		it('returns true for read access', () => {
			const user = { permissions: ['users:read'] };
			expect(rbac.canAccessResource(user, 'users', 'read')).toBe(true);
		});

		it('returns true for write access', () => {
			const user = { permissions: ['users:write'] };
			expect(rbac.canAccessResource(user, 'users', 'write')).toBe(true);
		});

		it('returns true for delete access', () => {
			const user = { permissions: ['users:delete'] };
			expect(rbac.canAccessResource(user, 'users', 'delete')).toBe(true);
		});

		it('returns false for missing resource access', () => {
			const user = { permissions: ['posts:read'] };
			expect(rbac.canAccessResource(user, 'users', 'read')).toBe(false);
		});

		it('returns false for missing action access', () => {
			const user = { permissions: ['users:read'] };
			expect(rbac.canAccessResource(user, 'users', 'write')).toBe(false);
		});

		it('returns true for wildcard admin', () => {
			const user = { permissions: ['*'] };
			expect(rbac.canAccessResource(user, 'users', 'delete')).toBe(true);
		});

		it('returns true for scoped permission', () => {
			const user = { permissions: ['users:write:all'] };
			expect(rbac.canAccessResource(user, 'users', 'write')).toBe(true);
		});
	});
});
