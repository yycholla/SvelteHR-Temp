// src/domain/Compensation/value-objects/SalaryGrade.test.ts
import { describe, expect, it } from 'vitest';
import { SalaryGrade } from './SalaryGrade';

describe('SalaryGrade', () => {
	describe('create', () => {
		it('returns Ok with entry grade', () => {
			const result = SalaryGrade.create('entry');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('entry');
		});

		it('returns Ok with mid grade', () => {
			const result = SalaryGrade.create('mid');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('mid');
		});

		it('returns Ok with senior grade', () => {
			const result = SalaryGrade.create('senior');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('senior');
		});

		it('returns Ok with lead grade', () => {
			const result = SalaryGrade.create('lead');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('lead');
		});

		it('returns Ok with principal grade', () => {
			const result = SalaryGrade.create('principal');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('principal');
		});

		it('normalizes to lowercase', () => {
			const result = SalaryGrade.create('SENIOR');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('senior');
		});

		it('returns InvalidCompensationError with invalid grade', () => {
			const invalidGrades = ['junior', 'staff', 'executive', '', 'invalid'];

			invalidGrades.forEach((grade) => {
				const result = SalaryGrade.create(grade);

				expect(result.isError).toBe(true);
				expect(result.error.name).toBe('InvalidCompensationError');
				expect(result.error.message).toContain('Invalid salary grade');
			});
		});

		it('trims whitespace', () => {
			const result = SalaryGrade.create('  senior  ');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('senior');
		});
	});

	describe('equals', () => {
		it('returns true for identical grades', () => {
			const grade1 = SalaryGrade.create('senior').value;
			const grade2 = SalaryGrade.create('senior').value;

			expect(grade1.equals(grade2)).toBe(true);
		});

		it('returns false for different grades', () => {
			const grade1 = SalaryGrade.create('senior').value;
			const grade2 = SalaryGrade.create('lead').value;

			expect(grade1.equals(grade2)).toBe(false);
		});
	});

	describe('compareTo', () => {
		it('returns 0 for equal grades', () => {
			const grade1 = SalaryGrade.create('senior').value;
			const grade2 = SalaryGrade.create('senior').value;

			expect(grade1.compareTo(grade2)).toBe(0);
		});

		it('returns negative for lower grade', () => {
			const entry = SalaryGrade.create('entry').value;
			const senior = SalaryGrade.create('senior').value;

			expect(entry.compareTo(senior)).toBeLessThan(0);
		});

		it('returns positive for higher grade', () => {
			const principal = SalaryGrade.create('principal').value;
			const mid = SalaryGrade.create('mid').value;

			expect(principal.compareTo(mid)).toBeGreaterThan(0);
		});

		it('compares correctly across all grades', () => {
			const entry = SalaryGrade.create('entry').value;
			const mid = SalaryGrade.create('mid').value;
			const senior = SalaryGrade.create('senior').value;
			const lead = SalaryGrade.create('lead').value;
			const principal = SalaryGrade.create('principal').value;

			expect(entry.compareTo(mid)).toBeLessThan(0);
			expect(mid.compareTo(senior)).toBeLessThan(0);
			expect(senior.compareTo(lead)).toBeLessThan(0);
			expect(lead.compareTo(principal)).toBeLessThan(0);
		});
	});

	describe('isPromotion', () => {
		it('returns true when comparing to lower grade', () => {
			const senior = SalaryGrade.create('senior').value;
			const mid = SalaryGrade.create('mid').value;

			expect(senior.isPromotion(mid)).toBe(true);
		});

		it('returns false when comparing to same grade', () => {
			const senior = SalaryGrade.create('senior').value;
			const sameSenior = SalaryGrade.create('senior').value;

			expect(senior.isPromotion(sameSenior)).toBe(false);
		});

		it('returns false when comparing to higher grade', () => {
			const mid = SalaryGrade.create('mid').value;
			const senior = SalaryGrade.create('senior').value;

			expect(mid.isPromotion(senior)).toBe(false);
		});
	});
});
