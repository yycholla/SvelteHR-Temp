import { describe, it, expect } from 'vitest';
import { Permission } from './Permission';
import { PermissionValidationError } from '../errors/RBACErrors';

describe('Permission', () => {
	describe('create', () => {
		it('should create valid permission with resource:action:scope format', () => {
			const result = Permission.create('employees:read:all');

			expect(result.isOk).toBe(true);
			expect(result.value.resource).toBe('employees');
			expect(result.value.action).toBe('read');
			expect(result.value.scope).toBe('all');
		});

		it('should create permission with resource:action format (no scope)', () => {
			const result = Permission.create('employees:write');

			expect(result.isOk).toBe(true);
			expect(result.value.resource).toBe('employees');
			expect(result.value.action).toBe('write');
			expect(result.value.scope).toBeUndefined();
		});

		it('should create wildcard permission', () => {
			const result = Permission.create('*');

			expect(result.isOk).toBe(true);
			expect(result.value.isWildcard()).toBe(true);
		});

		it('should reject invalid format', () => {
			const result = Permission.create('invalid');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(PermissionValidationError);
		});

		it('should reject empty string', () => {
			const result = Permission.create('');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(PermissionValidationError);
		});

		it('should reject invalid resource', () => {
			const result = Permission.create('invalid_resource:read:all');

			expect(result.isError).toBe(true);
		});

		it('should reject invalid action', () => {
			const result = Permission.create('employees:invalid_action:all');

			expect(result.isError).toBe(true);
		});

		it('should reject invalid scope', () => {
			const result = Permission.create('employees:read:invalid_scope');

			expect(result.isError).toBe(true);
		});
	});

	describe('matches', () => {
		it('should match exact permission', () => {
			const perm1 = Permission.create('employees:read:all').value;
			const perm2 = Permission.create('employees:read:all').value;

			expect(perm1.matches(perm2)).toBe(true);
		});

		it('should match wildcard resource', () => {
			const wildcard = Permission.create('*:read:all').value;
			const specific = Permission.create('employees:read:all').value;

			expect(wildcard.matches(specific)).toBe(true);
		});

		it('should match wildcard action', () => {
			const wildcard = Permission.create('employees:*:all').value;
			const specific = Permission.create('employees:read:all').value;

			expect(wildcard.matches(specific)).toBe(true);
		});

		it('should match wildcard scope', () => {
			const wildcard = Permission.create('employees:read:*').value;
			const specific = Permission.create('employees:read:all').value;

			expect(wildcard.matches(specific)).toBe(true);
		});

		it('should match full wildcard', () => {
			const wildcard = Permission.create('*').value;
			const specific = Permission.create('employees:read:all').value;

			expect(wildcard.matches(specific)).toBe(true);
		});

		it('should not match different permissions', () => {
			const perm1 = Permission.create('employees:read:all').value;
			const perm2 = Permission.create('departments:read:all').value;

			expect(perm1.matches(perm2)).toBe(false);
		});
	});

	describe('scopeLevel', () => {
		it('should return correct level for self scope', () => {
			const perm = Permission.create('employees:read:self').value;
			expect(perm.scopeLevel()).toBe(1);
		});

		it('should return correct level for team scope', () => {
			const perm = Permission.create('employees:read:team').value;
			expect(perm.scopeLevel()).toBe(2);
		});

		it('should return correct level for all scope', () => {
			const perm = Permission.create('employees:read:all').value;
			expect(perm.scopeLevel()).toBe(3);
		});

		it('should return 0 for no scope', () => {
			const perm = Permission.create('employees:read').value;
			expect(perm.scopeLevel()).toBe(0);
		});
	});

	describe('toString', () => {
		it('should return original permission string', () => {
			const permString = 'employees:read:all';
			const perm = Permission.create(permString).value;

			expect(perm.toString()).toBe(permString);
		});
	});

	describe('equals', () => {
		it('should return true for identical permissions', () => {
			const perm1 = Permission.create('employees:read:all').value;
			const perm2 = Permission.create('employees:read:all').value;

			expect(perm1.equals(perm2)).toBe(true);
		});

		it('should return false for different permissions', () => {
			const perm1 = Permission.create('employees:read:all').value;
			const perm2 = Permission.create('employees:write:all').value;

			expect(perm1.equals(perm2)).toBe(false);
		});
	});
});
