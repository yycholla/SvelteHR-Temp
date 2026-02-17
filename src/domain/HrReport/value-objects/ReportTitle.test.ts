import { describe, it, expect } from 'vitest';
import { ReportTitle } from './ReportTitle';

describe('ReportTitle', () => {
	describe('create()', () => {
		describe('valid titles', () => {
			it('should create a valid title', () => {
				const result = ReportTitle.create('Monthly Headcount Report');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('Monthly Headcount Report');
			});

			it('should trim leading and trailing whitespace', () => {
				const result = ReportTitle.create('  Q1 Turnover Report  ');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('Q1 Turnover Report');
			});

			it('should accept a single character title', () => {
				const result = ReportTitle.create('A');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('A');
			});

			it('should accept a title exactly at max length (200 chars)', () => {
				const longTitle = 'A'.repeat(200);
				const result = ReportTitle.create(longTitle);
				expect(result.isOk).toBe(true);
				expect(result.value.value.length).toBe(200);
			});

			it('should accept a title with special characters', () => {
				const result = ReportTitle.create('HR Report: Q1-2025 (Annual Review)');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('HR Report: Q1-2025 (Annual Review)');
			});

			it('should accept a title with numbers', () => {
				const result = ReportTitle.create('2025 Annual Performance Report');
				expect(result.isOk).toBe(true);
			});
		});

		describe('invalid titles', () => {
			it('should reject empty string', () => {
				const result = ReportTitle.create('');
				expect(result.isError).toBe(true);
				expect(result.error.code).toBe('INVALID_REPORT');
				expect(result.error.message).toContain('empty');
			});

			it('should reject whitespace-only string', () => {
				const result = ReportTitle.create('   ');
				expect(result.isError).toBe(true);
				expect(result.error.code).toBe('INVALID_REPORT');
			});

			it('should reject title exceeding 200 characters', () => {
				const tooLong = 'A'.repeat(201);
				const result = ReportTitle.create(tooLong);
				expect(result.isError).toBe(true);
				expect(result.error.code).toBe('INVALID_REPORT');
				expect(result.error.message).toContain('200');
			});

			it('should reject title of 250 characters', () => {
				const tooLong = 'B'.repeat(250);
				const result = ReportTitle.create(tooLong);
				expect(result.isError).toBe(true);
			});

			it('should provide descriptive error message', () => {
				const result = ReportTitle.create('');
				expect(result.isError).toBe(true);
				expect(result.error.message).toContain('title');
			});
		});
	});

	describe('equals()', () => {
		it('should return true for identical titles', () => {
			const title1 = ReportTitle.create('Annual Report').value;
			const title2 = ReportTitle.create('Annual Report').value;
			expect(title1.equals(title2)).toBe(true);
		});

		it('should return false for different titles', () => {
			const title1 = ReportTitle.create('Annual Report').value;
			const title2 = ReportTitle.create('Monthly Report').value;
			expect(title1.equals(title2)).toBe(false);
		});

		it('should be case-sensitive', () => {
			const title1 = ReportTitle.create('Annual Report').value;
			const title2 = ReportTitle.create('annual report').value;
			expect(title1.equals(title2)).toBe(false);
		});
	});

	describe('toString()', () => {
		it('should return the title value', () => {
			const title = ReportTitle.create('Attendance Report').value;
			expect(title.toString()).toBe('Attendance Report');
		});

		it('should match the value getter', () => {
			const title = ReportTitle.create('Performance Review Report').value;
			expect(title.toString()).toBe(title.value);
		});
	});

	describe('value getter', () => {
		it('should return the trimmed title string', () => {
			const title = ReportTitle.create('  Compensation Report  ').value;
			expect(title.value).toBe('Compensation Report');
		});
	});
});
