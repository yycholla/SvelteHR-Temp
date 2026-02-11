import { describe, it, expect } from 'vitest';
import { Role } from './Role';
import { Permission } from '../value-objects/Permission';
import { RoleHierarchy } from '../value-objects/RoleHierarchy';
import { RoleValidationError } from '../errors/RBACErrors';

describe('Role', () => {
	describe('create', () => {
		it('should create valid role with permissions', () => {
			const hierarchy = RoleHierarchy.create('Manager').value;
			const permissions = [
				Permission.create('employees:read:team').value,
				Permission.create('tasks:write:team').value
			];

			const result = Role.create({
				id: 'role-123',
				name: 'Manager',
				hierarchy,
				permissions,
				description: 'Team manager role',
				createdAt: new Date(),
				updatedAt: new Date()
			});

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe('role-123');
			expect(result.value.name).toBe('Manager');
			expect(result.value.permissions).toHaveLength(2);
		});

		it('should create role without description', () => {
			const hierarchy = RoleHierarchy.create('Employee').value;

			const result = Role.create({
				id: 'role-123',
				name: 'Employee',
				hierarchy,
				permissions: [],
				createdAt: new Date(),
				updatedAt: new Date()
			});

			expect(result.isOk).toBe(true);
			expect(result.value.description).toBeUndefined();
		});

		it('should reject empty name', () => {
			const hierarchy = RoleHierarchy.create('Manager').value;

			const result = Role.create({
				id: 'role-123',
				name: '',
				hierarchy,
				permissions: [],
				createdAt: new Date(),
				updatedAt: new Date()
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(RoleValidationError);
		});
	});

	describe('hasPermission', () => {
		it('should return true when permission exists', () => {
			const hierarchy = RoleHierarchy.create('Manager').value;
			const permission = Permission.create('employees:read:team').value;
			const role = Role.create({
				id: 'role-123',
				name: 'Manager',
				hierarchy,
				permissions: [permission],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			expect(role.hasPermission(permission)).toBe(true);
		});

		it('should return false when permission does not exist', () => {
			const hierarchy = RoleHierarchy.create('Manager').value;
			const permission = Permission.create('employees:read:team').value;
			const checkPermission = Permission.create('employees:write:all').value;

			const role = Role.create({
				id: 'role-123',
				name: 'Manager',
				hierarchy,
				permissions: [permission],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			expect(role.hasPermission(checkPermission)).toBe(false);
		});

		it('should match wildcard permissions', () => {
			const hierarchy = RoleHierarchy.create('Admin').value;
			const wildcardPerm = Permission.create('*').value;
			const specificPerm = Permission.create('employees:read:all').value;

			const role = Role.create({
				id: 'role-123',
				name: 'Admin',
				hierarchy,
				permissions: [wildcardPerm],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			expect(role.hasPermission(specificPerm)).toBe(true);
		});
	});

	describe('addPermission', () => {
		it('should add new permission', () => {
			const hierarchy = RoleHierarchy.create('Manager').value;
			const newPermission = Permission.create('tasks:write:team').value;

			const role = Role.create({
				id: 'role-123',
				name: 'Manager',
				hierarchy,
				permissions: [],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			const updated = role.addPermission(newPermission);

			expect(updated.permissions).toHaveLength(1);
			expect(updated.hasPermission(newPermission)).toBe(true);
		});

		it('should not duplicate existing permission', () => {
			const hierarchy = RoleHierarchy.create('Manager').value;
			const permission = Permission.create('employees:read:team').value;

			const role = Role.create({
				id: 'role-123',
				name: 'Manager',
				hierarchy,
				permissions: [permission],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			const updated = role.addPermission(permission);

			expect(updated.permissions).toHaveLength(1);
		});
	});

	describe('removePermission', () => {
		it('should remove existing permission', () => {
			const hierarchy = RoleHierarchy.create('Manager').value;
			const permission = Permission.create('employees:read:team').value;

			const role = Role.create({
				id: 'role-123',
				name: 'Manager',
				hierarchy,
				permissions: [permission],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			const updated = role.removePermission(permission);

			expect(updated.permissions).toHaveLength(0);
			expect(updated.hasPermission(permission)).toBe(false);
		});

		it('should handle removing non-existent permission', () => {
			const hierarchy = RoleHierarchy.create('Manager').value;
			const permission = Permission.create('employees:read:team').value;
			const removePermission = Permission.create('employees:write:all').value;

			const role = Role.create({
				id: 'role-123',
				name: 'Manager',
				hierarchy,
				permissions: [permission],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			const updated = role.removePermission(removePermission);

			expect(updated.permissions).toHaveLength(1);
		});
	});

	describe('equals', () => {
		it('should return true for same role ID', () => {
			const hierarchy = RoleHierarchy.create('Manager').value;
			const role1 = Role.create({
				id: 'role-123',
				name: 'Manager',
				hierarchy,
				permissions: [],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			const role2 = Role.create({
				id: 'role-123',
				name: 'Manager',
				hierarchy,
				permissions: [],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			expect(role1.equals(role2)).toBe(true);
		});

		it('should return false for different role IDs', () => {
			const hierarchy = RoleHierarchy.create('Manager').value;
			const role1 = Role.create({
				id: 'role-123',
				name: 'Manager',
				hierarchy,
				permissions: [],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			const role2 = Role.create({
				id: 'role-456',
				name: 'Manager',
				hierarchy,
				permissions: [],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			expect(role1.equals(role2)).toBe(false);
		});
	});
});
