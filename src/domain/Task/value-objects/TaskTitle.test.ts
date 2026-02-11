// src/domain/Task/value-objects/TaskTitle.test.ts
import { describe, it, expect } from 'vitest';
import { TaskTitle } from './TaskTitle';
import { TaskValidationError } from '../errors/TaskErrors';

describe('TaskTitle', () => {
	describe('create', () => {
		it('should create valid title', () => {
			const result = TaskTitle.create('Fix login bug');

			expect(result.isOk).toBe(true);
			expect(result.value.toString()).toBe('Fix login bug');
		});

		it('should trim whitespace', () => {
			const result = TaskTitle.create('  Task with spaces  ');

			expect(result.isOk).toBe(true);
			expect(result.value.toString()).toBe('Task with spaces');
		});

		it('should reject empty title', () => {
			const result = TaskTitle.create('');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(TaskValidationError);
			expect(result.error.message).toContain('Title cannot be empty');
		});

		it('should reject whitespace-only title', () => {
			const result = TaskTitle.create('   ');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(TaskValidationError);
		});

		it('should reject title exceeding 255 characters', () => {
			const longTitle = 'a'.repeat(256);
			const result = TaskTitle.create(longTitle);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('255 characters');
		});

		it('should accept title with exactly 255 characters', () => {
			const maxTitle = 'a'.repeat(255);
			const result = TaskTitle.create(maxTitle);

			expect(result.isOk).toBe(true);
			expect(result.value.toString()).toHaveLength(255);
		});
	});

	describe('equals', () => {
		it('should return true for identical titles', () => {
			const title1 = TaskTitle.create('Task A').value;
			const title2 = TaskTitle.create('Task A').value;

			expect(title1.equals(title2)).toBe(true);
		});

		it('should return false for different titles', () => {
			const title1 = TaskTitle.create('Task A').value;
			const title2 = TaskTitle.create('Task B').value;

			expect(title1.equals(title2)).toBe(false);
		});

		it('should handle case sensitivity', () => {
			const title1 = TaskTitle.create('Task A').value;
			const title2 = TaskTitle.create('task a').value;

			expect(title1.equals(title2)).toBe(false);
		});
	});

	describe('value property', () => {
		it('should expose trimmed value', () => {
			const title = TaskTitle.create('  Test  ').value;

			expect(title.value).toBe('Test');
		});
	});
});
