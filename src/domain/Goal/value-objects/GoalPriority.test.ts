// src/domain/Goal/value-objects/GoalPriority.test.ts
import { describe, it, expect } from 'vitest';
import { GoalPriority } from './GoalPriority';
import { GoalPriorityValidationError } from '../errors/GoalErrors';

describe('GoalPriority', () => {
	describe('create', () => {
		it('should create valid low priority', () => {
			const result = GoalPriority.create('low');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('low');
		});

		it('should create valid medium priority', () => {
			const result = GoalPriority.create('medium');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('medium');
		});

		it('should create valid high priority', () => {
			const result = GoalPriority.create('high');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('high');
		});

		it('should normalize uppercase priority', () => {
			const result = GoalPriority.create('HIGH');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('high');
		});

		it('should trim whitespace', () => {
			const result = GoalPriority.create('  low  ');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('low');
		});

		it('should reject empty string', () => {
			const result = GoalPriority.create('');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalPriorityValidationError);
		});

		it('should reject invalid priority', () => {
			const result = GoalPriority.create('urgent');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalPriorityValidationError);
		});
	});

	describe('priority checks', () => {
		it('should identify low priority', () => {
			const priority = GoalPriority.create('low').value;
			expect(priority.isLow()).toBe(true);
			expect(priority.isMedium()).toBe(false);
			expect(priority.isHigh()).toBe(false);
		});

		it('should identify medium priority', () => {
			const priority = GoalPriority.create('medium').value;
			expect(priority.isLow()).toBe(false);
			expect(priority.isMedium()).toBe(true);
			expect(priority.isHigh()).toBe(false);
		});

		it('should identify high priority', () => {
			const priority = GoalPriority.create('high').value;
			expect(priority.isLow()).toBe(false);
			expect(priority.isMedium()).toBe(false);
			expect(priority.isHigh()).toBe(true);
		});
	});

	describe('level', () => {
		it('should return correct level for low', () => {
			const priority = GoalPriority.create('low').value;
			expect(priority.level).toBe(1);
		});

		it('should return correct level for medium', () => {
			const priority = GoalPriority.create('medium').value;
			expect(priority.level).toBe(2);
		});

		it('should return correct level for high', () => {
			const priority = GoalPriority.create('high').value;
			expect(priority.level).toBe(3);
		});
	});

	describe('comparison', () => {
		it('should identify high is higher than medium', () => {
			const high = GoalPriority.create('high').value;
			const medium = GoalPriority.create('medium').value;
			expect(high.isHigherThan(medium)).toBe(true);
		});

		it('should identify medium is higher than low', () => {
			const medium = GoalPriority.create('medium').value;
			const low = GoalPriority.create('low').value;
			expect(medium.isHigherThan(low)).toBe(true);
		});

		it('should identify low is lower than high', () => {
			const low = GoalPriority.create('low').value;
			const high = GoalPriority.create('high').value;
			expect(low.isLowerThan(high)).toBe(true);
		});

		it('should return false for same priority comparison', () => {
			const medium1 = GoalPriority.create('medium').value;
			const medium2 = GoalPriority.create('medium').value;
			expect(medium1.isHigherThan(medium2)).toBe(false);
			expect(medium1.isLowerThan(medium2)).toBe(false);
		});
	});

	describe('equals', () => {
		it('should return true for same priority', () => {
			const priority1 = GoalPriority.create('medium').value;
			const priority2 = GoalPriority.create('medium').value;
			expect(priority1.equals(priority2)).toBe(true);
		});

		it('should return false for different priorities', () => {
			const priority1 = GoalPriority.create('low').value;
			const priority2 = GoalPriority.create('high').value;
			expect(priority1.equals(priority2)).toBe(false);
		});
	});

	describe('toString', () => {
		it('should return priority as string', () => {
			const low = GoalPriority.create('low').value;
			expect(low.toString()).toBe('low');

			const high = GoalPriority.create('high').value;
			expect(high.toString()).toBe('high');
		});
	});
});
