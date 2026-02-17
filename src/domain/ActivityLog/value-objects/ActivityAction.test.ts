// src/domain/ActivityLog/value-objects/ActivityAction.test.ts
import { describe, it, expect } from 'vitest';
import { ActivityAction } from './ActivityAction';

describe('ActivityAction', () => {
	describe('create()', () => {
		it('should create ActivityAction with valid value "create"', () => {
			const result = ActivityAction.create('create');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('create');
		});

		it('should create ActivityAction with valid value "update"', () => {
			const result = ActivityAction.create('update');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('update');
		});

		it('should create ActivityAction with valid value "delete"', () => {
			const result = ActivityAction.create('delete');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('delete');
		});

		it('should create ActivityAction with valid value "view"', () => {
			const result = ActivityAction.create('view');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('view');
		});

		it('should create ActivityAction with valid value "login"', () => {
			const result = ActivityAction.create('login');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('login');
		});

		it('should create ActivityAction with valid value "logout"', () => {
			const result = ActivityAction.create('logout');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('logout');
		});

		it('should return error for invalid action value', () => {
			const result = ActivityAction.create('invalid');
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Invalid activity action');
			expect(result.error.message).toContain('"invalid"');
		});

		it('should return error for empty string', () => {
			const result = ActivityAction.create('');
			expect(result.isError).toBe(true);
		});

		it('should return error for uppercase action', () => {
			const result = ActivityAction.create('CREATE');
			expect(result.isError).toBe(true);
		});

		it('should include valid options in error message', () => {
			const result = ActivityAction.create('unknown');
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('create');
			expect(result.error.message).toContain('update');
			expect(result.error.message).toContain('delete');
		});
	});

	describe('isWriteAction()', () => {
		it('should return true for "create"', () => {
			const result = ActivityAction.create('create');
			expect(result.value.isWriteAction()).toBe(true);
		});

		it('should return true for "update"', () => {
			const result = ActivityAction.create('update');
			expect(result.value.isWriteAction()).toBe(true);
		});

		it('should return true for "delete"', () => {
			const result = ActivityAction.create('delete');
			expect(result.value.isWriteAction()).toBe(true);
		});

		it('should return false for "view"', () => {
			const result = ActivityAction.create('view');
			expect(result.value.isWriteAction()).toBe(false);
		});

		it('should return false for "login"', () => {
			const result = ActivityAction.create('login');
			expect(result.value.isWriteAction()).toBe(false);
		});

		it('should return false for "logout"', () => {
			const result = ActivityAction.create('logout');
			expect(result.value.isWriteAction()).toBe(false);
		});
	});

	describe('isAuthAction()', () => {
		it('should return true for "login"', () => {
			const result = ActivityAction.create('login');
			expect(result.value.isAuthAction()).toBe(true);
		});

		it('should return true for "logout"', () => {
			const result = ActivityAction.create('logout');
			expect(result.value.isAuthAction()).toBe(true);
		});

		it('should return false for "create"', () => {
			const result = ActivityAction.create('create');
			expect(result.value.isAuthAction()).toBe(false);
		});

		it('should return false for "update"', () => {
			const result = ActivityAction.create('update');
			expect(result.value.isAuthAction()).toBe(false);
		});

		it('should return false for "delete"', () => {
			const result = ActivityAction.create('delete');
			expect(result.value.isAuthAction()).toBe(false);
		});

		it('should return false for "view"', () => {
			const result = ActivityAction.create('view');
			expect(result.value.isAuthAction()).toBe(false);
		});
	});

	describe('equals()', () => {
		it('should return true for same action values', () => {
			const a1 = ActivityAction.create('create').value;
			const a2 = ActivityAction.create('create').value;
			expect(a1.equals(a2)).toBe(true);
		});

		it('should return false for different action values', () => {
			const a1 = ActivityAction.create('create').value;
			const a2 = ActivityAction.create('update').value;
			expect(a1.equals(a2)).toBe(false);
		});
	});

	describe('toString()', () => {
		it('should return the string value', () => {
			const action = ActivityAction.create('create').value;
			expect(action.toString()).toBe('create');
		});
	});
});
