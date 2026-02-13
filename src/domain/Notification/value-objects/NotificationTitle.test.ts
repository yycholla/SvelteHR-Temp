import { describe, it, expect } from 'vitest';
import { NotificationTitle } from './NotificationTitle';
import { NotificationTitleValidationError } from '../errors/NotificationErrors';

describe('NotificationTitle', () => {
	describe('create()', () => {
		describe('valid titles', () => {
			it('should create title with minimum length (1 character)', () => {
				const result = NotificationTitle.create('A');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('A');
			});

			it('should create title with typical length', () => {
				const result = NotificationTitle.create('New task assigned');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('New task assigned');
			});

			it('should create title at maximum length (200 characters)', () => {
				const longTitle = 'A'.repeat(200);
				const result = NotificationTitle.create(longTitle);
				expect(result.isOk).toBe(true);
				expect(result.value.length).toBe(200);
			});
		});

		describe('trimming', () => {
			it('should trim leading whitespace', () => {
				const result = NotificationTitle.create('  Task assigned');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('Task assigned');
			});

			it('should trim trailing whitespace', () => {
				const result = NotificationTitle.create('Task assigned  ');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('Task assigned');
			});

			it('should trim both leading and trailing whitespace', () => {
				const result = NotificationTitle.create('  Task assigned  ');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('Task assigned');
			});
		});

		describe('validation', () => {
			it('should reject empty string', () => {
				const result = NotificationTitle.create('');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationTitleValidationError);
				expect(result.error.message).toContain('cannot be empty');
			});

			it('should reject whitespace-only string', () => {
				const result = NotificationTitle.create('   ');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationTitleValidationError);
			});

			it('should reject title exceeding 200 characters', () => {
				const longTitle = 'A'.repeat(201);
				const result = NotificationTitle.create(longTitle);
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationTitleValidationError);
				expect(result.error.message).toContain('200');
			});

			it('should reject title exceeding 200 characters after trimming', () => {
				const longTitle = '  ' + 'A'.repeat(201) + '  ';
				const result = NotificationTitle.create(longTitle);
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationTitleValidationError);
			});
		});
	});

	describe('equals()', () => {
		it('should return true for same title value', () => {
			const title1 = NotificationTitle.create('Task assigned').value;
			const title2 = NotificationTitle.create('Task assigned').value;
			expect(title1.equals(title2)).toBe(true);
		});

		it('should return false for different title values', () => {
			const title1 = NotificationTitle.create('Task assigned').value;
			const title2 = NotificationTitle.create('Leave approved').value;
			expect(title1.equals(title2)).toBe(false);
		});

		it('should be case-sensitive', () => {
			const title1 = NotificationTitle.create('Task Assigned').value;
			const title2 = NotificationTitle.create('task assigned').value;
			expect(title1.equals(title2)).toBe(false);
		});
	});

	describe('toString()', () => {
		it('should return the title value as string', () => {
			const title = NotificationTitle.create('Task assigned').value;
			expect(title.toString()).toBe('Task assigned');
		});
	});
});
