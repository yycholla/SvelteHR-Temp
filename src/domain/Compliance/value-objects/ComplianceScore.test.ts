// src/domain/Compliance/value-objects/ComplianceScore.test.ts
import { describe, it, expect } from 'vitest';
import { ComplianceScore } from './ComplianceScore';

describe('ComplianceScore', () => {
	describe('create()', () => {
		it('should create a valid score of 0', () => {
			const result = ComplianceScore.create(0);
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(0);
		});

		it('should create a valid score of 100', () => {
			const result = ComplianceScore.create(100);
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(100);
		});

		it('should create a valid score of 50', () => {
			const result = ComplianceScore.create(50);
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(50);
		});

		it('should reject a score below 0', () => {
			const result = ComplianceScore.create(-1);
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('between 0 and 100');
		});

		it('should reject a score above 100', () => {
			const result = ComplianceScore.create(101);
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('between 0 and 100');
		});

		it('should reject a non-integer score', () => {
			const result = ComplianceScore.create(75.5);
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('integer');
		});

		it('should reject NaN', () => {
			const result = ComplianceScore.create(NaN);
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('finite number');
		});

		it('should reject Infinity', () => {
			const result = ComplianceScore.create(Infinity);
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('finite number');
		});
	});

	describe('grade getter', () => {
		it('should return A for score 90', () => {
			const score = ComplianceScore.create(90).value;
			expect(score.grade).toBe('A');
		});

		it('should return A for score 100', () => {
			const score = ComplianceScore.create(100).value;
			expect(score.grade).toBe('A');
		});

		it('should return B for score 80', () => {
			const score = ComplianceScore.create(80).value;
			expect(score.grade).toBe('B');
		});

		it('should return B for score 89', () => {
			const score = ComplianceScore.create(89).value;
			expect(score.grade).toBe('B');
		});

		it('should return C for score 70', () => {
			const score = ComplianceScore.create(70).value;
			expect(score.grade).toBe('C');
		});

		it('should return C for score 79', () => {
			const score = ComplianceScore.create(79).value;
			expect(score.grade).toBe('C');
		});

		it('should return D for score 60', () => {
			const score = ComplianceScore.create(60).value;
			expect(score.grade).toBe('D');
		});

		it('should return D for score 69', () => {
			const score = ComplianceScore.create(69).value;
			expect(score.grade).toBe('D');
		});

		it('should return F for score 59', () => {
			const score = ComplianceScore.create(59).value;
			expect(score.grade).toBe('F');
		});

		it('should return F for score 0', () => {
			const score = ComplianceScore.create(0).value;
			expect(score.grade).toBe('F');
		});
	});

	describe('isPassingScore()', () => {
		it('should return true for score of 70 (threshold)', () => {
			const score = ComplianceScore.create(70).value;
			expect(score.isPassingScore()).toBe(true);
		});

		it('should return true for score above 70', () => {
			const score = ComplianceScore.create(85).value;
			expect(score.isPassingScore()).toBe(true);
		});

		it('should return false for score of 69', () => {
			const score = ComplianceScore.create(69).value;
			expect(score.isPassingScore()).toBe(false);
		});

		it('should return false for score of 0', () => {
			const score = ComplianceScore.create(0).value;
			expect(score.isPassingScore()).toBe(false);
		});
	});

	describe('equals()', () => {
		it('should return true for equal scores', () => {
			const a = ComplianceScore.create(85).value;
			const b = ComplianceScore.create(85).value;
			expect(a.equals(b)).toBe(true);
		});

		it('should return false for different scores', () => {
			const a = ComplianceScore.create(85).value;
			const b = ComplianceScore.create(90).value;
			expect(a.equals(b)).toBe(false);
		});
	});

	describe('toString()', () => {
		it('should return the string representation of the score', () => {
			const score = ComplianceScore.create(75).value;
			expect(score.toString()).toBe('75');
		});
	});
});
