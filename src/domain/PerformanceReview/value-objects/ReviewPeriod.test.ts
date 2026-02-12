// src/domain/PerformanceReview/value-objects/ReviewPeriod.test.ts
import { describe, it, expect } from 'vitest';
import { ReviewPeriod } from './ReviewPeriod';
import { ReviewPeriodValidationError } from '../errors/PerformanceReviewErrors';

describe('ReviewPeriod', () => {
	describe('create', () => {
		it('should create quarterly period Q1-2025', () => {
			const result = ReviewPeriod.create('Q1-2025');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('Q1-2025');
			expect(result.value.isQuarterly()).toBe(true);
		});

		it('should create quarterly period Q4-2026', () => {
			const result = ReviewPeriod.create('Q4-2026');

			expect(result.isOk).toBe(true);
		});

		it('should create half-year period H1-2025', () => {
			const result = ReviewPeriod.create('H1-2025');

			expect(result.isOk).toBe(true);
			expect(result.value.isHalfYearly()).toBe(true);
		});

		it('should create half-year period H2-2025', () => {
			const result = ReviewPeriod.create('H2-2025');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('H2-2025');
			expect(result.value.isHalfYearly()).toBe(true);
		});

		it('should create annual period Annual-2025', () => {
			const result = ReviewPeriod.create('Annual-2025');

			expect(result.isOk).toBe(true);
			expect(result.value.isAnnual()).toBe(true);
		});

		it('should reject invalid format', () => {
			const result = ReviewPeriod.create('Q5-2025');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ReviewPeriodValidationError);
		});

		it('should reject invalid half-year format', () => {
			const result = ReviewPeriod.create('H3-2025');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ReviewPeriodValidationError);
		});

		it('should reject empty period', () => {
			const result = ReviewPeriod.create('');

			expect(result.isError).toBe(true);
		});

		it('should trim whitespace from period', () => {
			const result = ReviewPeriod.create('  Q1-2025  ');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('Q1-2025');
		});

		it('should reject invalid year', () => {
			const result = ReviewPeriod.create('Q1-999');

			expect(result.isError).toBe(true);
		});

		it('should reject year beyond 2100', () => {
			const result = ReviewPeriod.create('Q1-2150');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ReviewPeriodValidationError);
			expect(result.error.message).toContain('between 2000 and 2100');
		});
	});

	describe('year extraction', () => {
		it('should extract year from quarterly period', () => {
			const period = ReviewPeriod.create('Q1-2025').value;

			expect(period.getYear()).toBe(2025);
		});

		it('should extract year from annual period', () => {
			const period = ReviewPeriod.create('Annual-2026').value;

			expect(period.getYear()).toBe(2026);
		});
	});

	describe('quarter extraction', () => {
		it('should extract quarter number', () => {
			expect(ReviewPeriod.create('Q1-2025').value.getQuarter()).toBe(1);
			expect(ReviewPeriod.create('Q4-2025').value.getQuarter()).toBe(4);
		});

		it('should return null for non-quarterly periods', () => {
			expect(ReviewPeriod.create('H1-2025').value.getQuarter()).toBeNull();
			expect(ReviewPeriod.create('Annual-2025').value.getQuarter()).toBeNull();
		});
	});

	describe('comparison', () => {
		it('should check if period is in the past', () => {
			const pastPeriod = ReviewPeriod.create('Q1-2020').value;

			expect(pastPeriod.isPast()).toBe(true);
		});

		it('should check if period is current', () => {
			const currentYear = new Date().getFullYear();
			const currentPeriod = ReviewPeriod.create(`Q1-${currentYear}`).value;

			// This test is time-dependent, so we just check it doesn't throw
			expect(typeof currentPeriod.isCurrent()).toBe('boolean');
		});
	});

	describe('equals', () => {
		it('should return true for same period', () => {
			const period1 = ReviewPeriod.create('Q1-2025').value;
			const period2 = ReviewPeriod.create('Q1-2025').value;

			expect(period1.equals(period2)).toBe(true);
		});

		it('should return false for different period', () => {
			const period1 = ReviewPeriod.create('Q1-2025').value;
			const period2 = ReviewPeriod.create('Q2-2025').value;

			expect(period1.equals(period2)).toBe(false);
		});
	});
});
