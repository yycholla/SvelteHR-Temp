import { describe, it, expect } from 'vitest';
import { NotificationPriority } from './NotificationPriority';
import { NotificationPriorityValidationError } from '../errors/NotificationErrors';

describe('NotificationPriority', () => {
	describe('create()', () => {
		describe('valid priorities', () => {
			it('should create priority "low"', () => {
				const result = NotificationPriority.create('low');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('low');
			});

			it('should create priority "normal"', () => {
				const result = NotificationPriority.create('normal');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('normal');
			});

			it('should create priority "high"', () => {
				const result = NotificationPriority.create('high');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('high');
			});

			it('should create priority "urgent"', () => {
				const result = NotificationPriority.create('urgent');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('urgent');
			});
		});

		describe('normalization', () => {
			it('should normalize uppercase input', () => {
				const result = NotificationPriority.create('LOW');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('low');
			});

			it('should normalize mixed case input', () => {
				const result = NotificationPriority.create('NoRmAl');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('normal');
			});

			it('should trim leading whitespace', () => {
				const result = NotificationPriority.create('  high');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('high');
			});

			it('should trim trailing whitespace', () => {
				const result = NotificationPriority.create('urgent  ');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('urgent');
			});

			it('should trim both leading and trailing whitespace', () => {
				const result = NotificationPriority.create('  low  ');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('low');
			});
		});

		describe('validation', () => {
			it('should reject empty string', () => {
				const result = NotificationPriority.create('');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationPriorityValidationError);
				expect(result.error.message).toContain('Invalid notification priority');
			});

			it('should reject whitespace-only string', () => {
				const result = NotificationPriority.create('   ');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationPriorityValidationError);
			});

			it('should reject invalid priority', () => {
				const result = NotificationPriority.create('critical');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationPriorityValidationError);
				expect(result.error.message).toContain('critical');
			});
		});
	});

	describe('isHighPriority()', () => {
		it('should return false for low priority', () => {
			const priority = NotificationPriority.create('low').value;
			expect(priority.isHighPriority()).toBe(false);
		});

		it('should return false for normal priority', () => {
			const priority = NotificationPriority.create('normal').value;
			expect(priority.isHighPriority()).toBe(false);
		});

		it('should return true for high priority', () => {
			const priority = NotificationPriority.create('high').value;
			expect(priority.isHighPriority()).toBe(true);
		});

		it('should return true for urgent priority', () => {
			const priority = NotificationPriority.create('urgent').value;
			expect(priority.isHighPriority()).toBe(true);
		});
	});

	describe('equals()', () => {
		it('should return true for same priority value', () => {
			const priority1 = NotificationPriority.create('normal').value;
			const priority2 = NotificationPriority.create('normal').value;
			expect(priority1.equals(priority2)).toBe(true);
		});

		it('should return false for different priority values', () => {
			const priority1 = NotificationPriority.create('low').value;
			const priority2 = NotificationPriority.create('high').value;
			expect(priority1.equals(priority2)).toBe(false);
		});

		it('should be case-insensitive in comparison', () => {
			const priority1 = NotificationPriority.create('urgent').value;
			const priority2 = NotificationPriority.create('URGENT').value;
			expect(priority1.equals(priority2)).toBe(true);
		});
	});

	describe('toString()', () => {
		it('should return the priority value as string', () => {
			const priority = NotificationPriority.create('high').value;
			expect(priority.toString()).toBe('high');
		});
	});
});
