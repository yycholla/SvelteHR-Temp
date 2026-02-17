// src/domain/ActivityLog/value-objects/ResourceType.test.ts
import { describe, it, expect } from 'vitest';
import { ResourceType } from './ResourceType';

describe('ResourceType', () => {
	describe('create()', () => {
		const validTypes = [
			'event',
			'task',
			'leave_request',
			'profile',
			'document',
			'employee',
			'department',
			'performance_review',
			'notification',
			'system'
		];

		validTypes.forEach((type) => {
			it(`should create ResourceType with valid value "${type}"`, () => {
				const result = ResourceType.create(type);
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe(type);
			});
		});

		it('should return error for invalid resource type', () => {
			const result = ResourceType.create('invalid_type');
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Invalid resource type');
			expect(result.error.message).toContain('"invalid_type"');
		});

		it('should return error for empty string', () => {
			const result = ResourceType.create('');
			expect(result.isError).toBe(true);
		});

		it('should return error for uppercase type', () => {
			const result = ResourceType.create('EMPLOYEE');
			expect(result.isError).toBe(true);
		});

		it('should include valid options in error message', () => {
			const result = ResourceType.create('unknown');
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('employee');
			expect(result.error.message).toContain('department');
		});
	});

	describe('isSystemResource()', () => {
		it('should return true for "system"', () => {
			const result = ResourceType.create('system');
			expect(result.value.isSystemResource()).toBe(true);
		});

		it('should return false for "employee"', () => {
			const result = ResourceType.create('employee');
			expect(result.value.isSystemResource()).toBe(false);
		});

		it('should return false for "event"', () => {
			const result = ResourceType.create('event');
			expect(result.value.isSystemResource()).toBe(false);
		});

		it('should return false for "task"', () => {
			const result = ResourceType.create('task');
			expect(result.value.isSystemResource()).toBe(false);
		});

		it('should return false for "leave_request"', () => {
			const result = ResourceType.create('leave_request');
			expect(result.value.isSystemResource()).toBe(false);
		});

		it('should return false for "document"', () => {
			const result = ResourceType.create('document');
			expect(result.value.isSystemResource()).toBe(false);
		});
	});

	describe('equals()', () => {
		it('should return true for same resource type values', () => {
			const r1 = ResourceType.create('employee').value;
			const r2 = ResourceType.create('employee').value;
			expect(r1.equals(r2)).toBe(true);
		});

		it('should return false for different resource type values', () => {
			const r1 = ResourceType.create('employee').value;
			const r2 = ResourceType.create('department').value;
			expect(r1.equals(r2)).toBe(false);
		});
	});

	describe('toString()', () => {
		it('should return the string value', () => {
			const type = ResourceType.create('employee').value;
			expect(type.toString()).toBe('employee');
		});
	});
});
