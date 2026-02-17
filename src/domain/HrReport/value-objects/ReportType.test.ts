import { describe, it, expect } from 'vitest';
import { ReportType } from './ReportType';

describe('ReportType', () => {
	describe('create()', () => {
		describe('valid types', () => {
			it('should create headcount type', () => {
				const result = ReportType.create('headcount');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('headcount');
			});

			it('should create turnover type', () => {
				const result = ReportType.create('turnover');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('turnover');
			});

			it('should create attendance type', () => {
				const result = ReportType.create('attendance');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('attendance');
			});

			it('should create performance type', () => {
				const result = ReportType.create('performance');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('performance');
			});

			it('should create leave type', () => {
				const result = ReportType.create('leave');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('leave');
			});

			it('should create compensation type', () => {
				const result = ReportType.create('compensation');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('compensation');
			});

			it('should create training type', () => {
				const result = ReportType.create('training');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('training');
			});

			it('should create custom type', () => {
				const result = ReportType.create('custom');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('custom');
			});

			it('should trim whitespace before validation', () => {
				const result = ReportType.create('  attendance  ');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('attendance');
			});

			it('should normalize to lowercase', () => {
				const result = ReportType.create('HEADCOUNT');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('headcount');
			});

			it('should handle mixed case', () => {
				const result = ReportType.create('Performance');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('performance');
			});
		});

		describe('invalid types', () => {
			it('should reject empty string', () => {
				const result = ReportType.create('');
				expect(result.isError).toBe(true);
				expect(result.error.code).toBe('INVALID_REPORT');
			});

			it('should reject whitespace-only string', () => {
				const result = ReportType.create('   ');
				expect(result.isError).toBe(true);
				expect(result.error.code).toBe('INVALID_REPORT');
			});

			it('should reject unknown type', () => {
				const result = ReportType.create('payroll');
				expect(result.isError).toBe(true);
				expect(result.error.message).toContain('payroll');
			});

			it('should reject "benefits" type (not in valid set)', () => {
				const result = ReportType.create('benefits');
				expect(result.isError).toBe(true);
				expect(result.error.code).toBe('INVALID_REPORT');
			});

			it('should include valid options in error message', () => {
				const result = ReportType.create('invalid');
				expect(result.isError).toBe(true);
				expect(result.error.message).toContain('headcount');
				expect(result.error.message).toContain('custom');
			});
		});
	});

	describe('equals()', () => {
		it('should return true for same type', () => {
			const type1 = ReportType.create('attendance').value;
			const type2 = ReportType.create('attendance').value;
			expect(type1.equals(type2)).toBe(true);
		});

		it('should return false for different types', () => {
			const type1 = ReportType.create('attendance').value;
			const type2 = ReportType.create('turnover').value;
			expect(type1.equals(type2)).toBe(false);
		});
	});

	describe('toString()', () => {
		it('should return the type value as string', () => {
			const type = ReportType.create('performance').value;
			expect(type.toString()).toBe('performance');
		});

		it('should match the value getter', () => {
			const type = ReportType.create('custom').value;
			expect(type.toString()).toBe(type.value);
		});
	});
});
