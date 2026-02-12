import { describe, it, expect, beforeEach } from 'vitest';
import { RBACService } from './RBACService';
import { RoleRepository } from './ports/RoleRepository';
import { Role, Permission, RoleHierarchy, RoleNotFoundError } from '$domain/RBAC';
import { Result } from '$domain/Result';

// Mock repository
class MockRoleRepository implements RoleRepository {
	private roles: Map<string, Role> = new Map();
	private userRoles: Map<string, string[]> = new Map();

	async findById(id: string) {
		const role = this.roles.get(id);
		if (!role) {
			return Result.error(new RoleNotFoundError(id));
		}
		return Result.ok(role);
	}

	async findAll() {
		return Result.ok(Array.from(this.roles.values()));
	}

	async create(data: any) {
		const hierarchy = RoleHierarchy.create('Manager').value;
		const permissions = data.permissions.map((p: string) => Permission.create(p).value);

		const role = Role.create({
			id: `role-${Date.now()}`,
			name: data.name,
			hierarchy,
			permissions,
			description: data.description,
			createdAt: new Date(),
			updatedAt: new Date()
		}).value;

		this.roles.set(role.id, role);
		return Result.ok(role);
	}

	async update(id: string, data: any) {
		const existingResult = await this.findById(id);
		if (existingResult.isError) {
			return existingResult;
		}

		const existing = existingResult.value;
		const updatedRole = Role.create({
			id: existing.id,
			name: data.name ?? existing.name,
			hierarchy: existing.hierarchy,
			permissions: existing.permissions,
			description: data.description ?? existing.description,
			createdAt: existing.createdAt,
			updatedAt: new Date()
		}).value;

		this.roles.set(id, updatedRole);
		return Result.ok(updatedRole);
	}

	async delete(id: string) {
		if (!this.roles.has(id)) {
			return Result.error(new RoleNotFoundError(id));
		}
		this.roles.delete(id);
		return Result.ok(undefined);
	}

	async addPermissionToRole(roleId: string, permission: string) {
		const roleResult = await this.findById(roleId);
		if (roleResult.isError) {
			return roleResult;
		}

		const perm = Permission.create(permission).value;
		const updated = roleResult.value.addPermission(perm);
		this.roles.set(roleId, updated);
		return Result.ok(updated);
	}

	async removePermissionFromRole(roleId: string, permission: string) {
		const roleResult = await this.findById(roleId);
		if (roleResult.isError) {
			return roleResult;
		}

		const perm = Permission.create(permission).value;
		const updated = roleResult.value.removePermission(perm);
		this.roles.set(roleId, updated);
		return Result.ok(updated);
	}

	async getRolesForUser(userId: string) {
		const roleIds = this.userRoles.get(userId) ?? [];
		const roles = roleIds.map((id) => this.roles.get(id)).filter((r): r is Role => r !== undefined);
		return Result.ok(roles);
	}

	// Test helper
	setUserRoles(userId: string, roleIds: string[]) {
		this.userRoles.set(userId, roleIds);
	}
}

describe('RBACService', () => {
	let service: RBACService;
	let repository: MockRoleRepository;

	beforeEach(() => {
		repository = new MockRoleRepository();
		service = new RBACService(repository);
	});

	describe('getRoleById', () => {
		it('should return role when found', async () => {
			const createResult = await repository.create({
				name: 'Test Role',
				hierarchyLevel: 50,
				permissions: ['employees:read:team']
			});
			const roleId = createResult.value.id;

			const result = await service.getRoleById(roleId);

			expect(result.isOk).toBe(true);
			expect(result.value.name).toBe('Test Role');
		});

		it('should return error when role not found', async () => {
			const result = await service.getRoleById('nonexistent');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(RoleNotFoundError);
		});
	});

	describe('checkPermission', () => {
		it('should return true when user has permission', async () => {
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

			repository['roles'].set('role-123', role);
			repository.setUserRoles('user-123', ['role-123']);

			const result = await service.checkPermission('user-123', 'employees:read:team');

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(true);
		});

		it('should return false when user lacks permission', async () => {
			const hierarchy = RoleHierarchy.create('Employee').value;
			const role = Role.create({
				id: 'role-123',
				name: 'Employee',
				hierarchy,
				permissions: [],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			repository['roles'].set('role-123', role);
			repository.setUserRoles('user-123', ['role-123']);

			const result = await service.checkPermission('user-123', 'employees:write:all');

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(false);
		});

		it('should match wildcard permissions', async () => {
			const hierarchy = RoleHierarchy.create('Admin').value;
			const wildcardPerm = Permission.create('*').value;
			const role = Role.create({
				id: 'role-123',
				name: 'Admin',
				hierarchy,
				permissions: [wildcardPerm],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			repository['roles'].set('role-123', role);
			repository.setUserRoles('user-123', ['role-123']);

			const result = await service.checkPermission('user-123', 'employees:write:all');

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(true);
		});
	});

	describe('getHighestRole', () => {
		it('should return highest role among user roles', async () => {
			const managerHierarchy = RoleHierarchy.create('Manager').value;
			const employeeHierarchy = RoleHierarchy.create('Employee').value;

			const managerRole = Role.create({
				id: 'role-manager',
				name: 'Manager',
				hierarchy: managerHierarchy,
				permissions: [],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			const employeeRole = Role.create({
				id: 'role-employee',
				name: 'Employee',
				hierarchy: employeeHierarchy,
				permissions: [],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			repository['roles'].set('role-manager', managerRole);
			repository['roles'].set('role-employee', employeeRole);
			repository.setUserRoles('user-123', ['role-manager', 'role-employee']);

			const result = await service.getHighestRole('user-123');

			expect(result.isOk).toBe(true);
			expect(result.value?.name).toBe('Manager');
		});

		it('should return undefined when user has no roles', async () => {
			repository.setUserRoles('user-123', []);

			const result = await service.getHighestRole('user-123');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeUndefined();
		});
	});

	describe('checkAnyPermission', () => {
		it('should return true when user has at least one permission', async () => {
			const hierarchy = RoleHierarchy.create('Employee').value;
			const permission = Permission.create('employees:read:self').value;
			const role = Role.create({
				id: 'role-123',
				name: 'Employee',
				hierarchy,
				permissions: [permission],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			repository['roles'].set('role-123', role);
			repository.setUserRoles('user-123', ['role-123']);

			const result = await service.checkAnyPermission('user-123', [
				'employees:read:self',
				'employees:write:all'
			]);

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(true);
		});

		it('should return false when user has none of the permissions', async () => {
			const hierarchy = RoleHierarchy.create('Employee').value;
			const role = Role.create({
				id: 'role-123',
				name: 'Employee',
				hierarchy,
				permissions: [],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			repository['roles'].set('role-123', role);
			repository.setUserRoles('user-123', ['role-123']);

			const result = await service.checkAnyPermission('user-123', [
				'employees:write:all',
				'departments:delete:all'
			]);

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(false);
		});
	});

	describe('checkAllPermissions', () => {
		it('should return true when user has all permissions', async () => {
			const hierarchy = RoleHierarchy.create('Manager').value;
			const perm1 = Permission.create('employees:read:team').value;
			const perm2 = Permission.create('employees:write:team').value;
			const role = Role.create({
				id: 'role-123',
				name: 'Manager',
				hierarchy,
				permissions: [perm1, perm2],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			repository['roles'].set('role-123', role);
			repository.setUserRoles('user-123', ['role-123']);

			const result = await service.checkAllPermissions('user-123', [
				'employees:read:team',
				'employees:write:team'
			]);

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(true);
		});

		it('should return false when user lacks any permission', async () => {
			const hierarchy = RoleHierarchy.create('Manager').value;
			const perm = Permission.create('employees:read:team').value;
			const role = Role.create({
				id: 'role-123',
				name: 'Manager',
				hierarchy,
				permissions: [perm],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			repository['roles'].set('role-123', role);
			repository.setUserRoles('user-123', ['role-123']);

			const result = await service.checkAllPermissions('user-123', [
				'employees:read:team',
				'employees:write:team'
			]);

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(false);
		});
	});

	describe('addPermissionToRole', () => {
		it('should add permission to role', async () => {
			const hierarchy = RoleHierarchy.create('Manager').value;
			const role = Role.create({
				id: 'role-123',
				name: 'Manager',
				hierarchy,
				permissions: [],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			repository['roles'].set('role-123', role);

			const result = await service.addPermissionToRole('role-123', 'employees:read:team');

			expect(result.isOk).toBe(true);
			expect(result.value.permissions.length).toBe(1);
		});

		it('should return error for invalid permission format', async () => {
			const result = await service.addPermissionToRole('role-123', 'invalid');

			expect(result.isError).toBe(true);
		});
	});

	describe('removePermissionFromRole', () => {
		it('should remove permission from role', async () => {
			const hierarchy = RoleHierarchy.create('Manager').value;
			const perm = Permission.create('employees:read:team').value;
			const role = Role.create({
				id: 'role-123',
				name: 'Manager',
				hierarchy,
				permissions: [perm],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			repository['roles'].set('role-123', role);

			const result = await service.removePermissionFromRole('role-123', 'employees:read:team');

			expect(result.isOk).toBe(true);
			expect(result.value.permissions.length).toBe(0);
		});
	});

	describe('getAllRoles', () => {
		it('should return all roles', async () => {
			const hierarchy = RoleHierarchy.create('Manager').value;
			const role = Role.create({
				id: 'role-123',
				name: 'Manager',
				hierarchy,
				permissions: [],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			repository['roles'].set('role-123', role);

			const result = await service.getAllRoles();

			expect(result.isOk).toBe(true);
			expect(result.value.length).toBe(1);
		});
	});
});
