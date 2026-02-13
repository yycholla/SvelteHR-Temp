import { describe, it, expect } from 'vitest';
import { NotificationCategory } from './NotificationCategory';
import { NotificationCategoryValidationError } from '../errors/NotificationErrors';

describe('NotificationCategory', () => {
	describe('create()', () => {
		describe('valid categories', () => {
			it('should create category "general"', () => {
				const result = NotificationCategory.create('general');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('general');
			});

			it('should create category "task"', () => {
				const result = NotificationCategory.create('task');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('task');
			});

			it('should create category "leave"', () => {
				const result = NotificationCategory.create('leave');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('leave');
			});

			it('should create category "performance"', () => {
				const result = NotificationCategory.create('performance');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('performance');
			});
		});

		describe('normalization', () => {
			it('should normalize uppercase input', () => {
				const result = NotificationCategory.create('GENERAL');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('general');
			});

			it('should normalize mixed case input', () => {
				const result = NotificationCategory.create('TaSk');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('task');
			});

			it('should trim leading whitespace', () => {
				const result = NotificationCategory.create('  leave');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('leave');
			});

			it('should trim trailing whitespace', () => {
				const result = NotificationCategory.create('performance  ');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('performance');
			});

			it('should trim both leading and trailing whitespace', () => {
				const result = NotificationCategory.create('  task  ');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('task');
			});
		});

		describe('validation', () => {
			it('should reject empty string', () => {
				const result = NotificationCategory.create('');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationCategoryValidationError);
				expect(result.error.message).toContain('Invalid notification category');
			});

			it('should reject whitespace-only string', () => {
				const result = NotificationCategory.create('   ');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationCategoryValidationError);
			});

			it('should reject invalid category', () => {
				const result = NotificationCategory.create('invalid_category');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationCategoryValidationError);
				expect(result.error.message).toContain('invalid_category');
			});
		});
	});

	describe('equals()', () => {
		it('should return true for same category value', () => {
			const category1 = NotificationCategory.create('general').value;
			const category2 = NotificationCategory.create('general').value;
			expect(category1.equals(category2)).toBe(true);
		});

		it('should return false for different category values', () => {
			const category1 = NotificationCategory.create('general').value;
			const category2 = NotificationCategory.create('task').value;
			expect(category1.equals(category2)).toBe(false);
		});

		it('should be case-insensitive in comparison', () => {
			const category1 = NotificationCategory.create('general').value;
			const category2 = NotificationCategory.create('GENERAL').value;
			expect(category1.equals(category2)).toBe(true);
		});
	});

	describe('toString()', () => {
		it('should return the category value as string', () => {
			const category = NotificationCategory.create('task').value;
			expect(category.toString()).toBe('task');
		});
	});
});
