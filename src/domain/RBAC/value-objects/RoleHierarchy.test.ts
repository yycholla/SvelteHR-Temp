import { describe, it, expect } from 'vitest';
import { RoleHierarchy } from './RoleHierarchy';
import { InvalidRoleHierarchyError } from '../errors/RBACErrors';

describe('RoleHierarchy', () => {
	describe('create', () => {
		it('should create Admin role hierarchy', () => {
			const result = RoleHierarchy.create('Admin');

			expect(result.isOk).toBe(true);
			expect(result.value.roleName).toBe('Admin');
			expect(result.value.level).toBe(100);
		});

		it('should create HR Manager role hierarchy', () => {
			const result = RoleHierarchy.create('HR Manager');

			expect(result.isOk).toBe(true);
			expect(result.value.level).toBe(75);
		});

		it('should create Manager role hierarchy', () => {
			const result = RoleHierarchy.create('Manager');

			expect(result.isOk).toBe(true);
			expect(result.value.level).toBe(50);
		});

		it('should create Employee role hierarchy', () => {
			const result = RoleHierarchy.create('Employee');

			expect(result.isOk).toBe(true);
			expect(result.value.level).toBe(25);
		});

		it('should create guest role hierarchy', () => {
			const result = RoleHierarchy.create('guest');

			expect(result.isOk).toBe(true);
			expect(result.value.level).toBe(0);
		});

		it('should reject invalid role name', () => {
			const result = RoleHierarchy.create('InvalidRole');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidRoleHierarchyError);
		});
	});

	describe('isHigherThan', () => {
		it('should return true when level is higher', () => {
			const admin = RoleHierarchy.create('Admin').value;
			const manager = RoleHierarchy.create('Manager').value;

			expect(admin.isHigherThan(manager)).toBe(true);
		});

		it('should return false when level is lower', () => {
			const employee = RoleHierarchy.create('Employee').value;
			const manager = RoleHierarchy.create('Manager').value;

			expect(employee.isHigherThan(manager)).toBe(false);
		});

		it('should return false when level is equal', () => {
			const manager1 = RoleHierarchy.create('Manager').value;
			const manager2 = RoleHierarchy.create('Manager').value;

			expect(manager1.isHigherThan(manager2)).toBe(false);
		});
	});

	describe('isHigherThanOrEqual', () => {
		it('should return true when level is higher', () => {
			const admin = RoleHierarchy.create('Admin').value;
			const manager = RoleHierarchy.create('Manager').value;

			expect(admin.isHigherThanOrEqual(manager)).toBe(true);
		});

		it('should return true when level is equal', () => {
			const manager1 = RoleHierarchy.create('Manager').value;
			const manager2 = RoleHierarchy.create('Manager').value;

			expect(manager1.isHigherThanOrEqual(manager2)).toBe(true);
		});

		it('should return false when level is lower', () => {
			const employee = RoleHierarchy.create('Employee').value;
			const manager = RoleHierarchy.create('Manager').value;

			expect(employee.isHigherThanOrEqual(manager)).toBe(false);
		});
	});

	describe('canPromoteTo', () => {
		it('should allow promotion to next level', () => {
			const manager = RoleHierarchy.create('Manager').value;
			const hrManager = RoleHierarchy.create('HR Manager').value;

			expect(manager.canPromoteTo(hrManager)).toBe(true);
		});

		it('should not allow promotion to same level', () => {
			const manager1 = RoleHierarchy.create('Manager').value;
			const manager2 = RoleHierarchy.create('Manager').value;

			expect(manager1.canPromoteTo(manager2)).toBe(false);
		});

		it('should not allow demotion', () => {
			const manager = RoleHierarchy.create('Manager').value;
			const employee = RoleHierarchy.create('Employee').value;

			expect(manager.canPromoteTo(employee)).toBe(false);
		});
	});

	describe('equals', () => {
		it('should return true for same role', () => {
			const role1 = RoleHierarchy.create('Manager').value;
			const role2 = RoleHierarchy.create('Manager').value;

			expect(role1.equals(role2)).toBe(true);
		});

		it('should return false for different roles', () => {
			const admin = RoleHierarchy.create('Admin').value;
			const manager = RoleHierarchy.create('Manager').value;

			expect(admin.equals(manager)).toBe(false);
		});
	});
});
