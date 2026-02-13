// src/domain/Compensation/value-objects/Salary.test.ts
import { describe, expect, it } from 'vitest';
import { Salary } from './Salary';

describe('Salary', () => {
	describe('create', () => {
		it('returns Ok with valid salary in USD', () => {
			const result = Salary.create(50000, 'USD');

			expect(result.isOk).toBe(true);
			expect(result.value.amount).toBe(50000);
			expect(result.value.currency).toBe('USD');
		});

		it('returns Ok with valid salary in EUR', () => {
			const result = Salary.create(45000, 'EUR');

			expect(result.isOk).toBe(true);
			expect(result.value.amount).toBe(45000);
			expect(result.value.currency).toBe('EUR');
		});

		it('returns Ok with valid salary in GBP', () => {
			const result = Salary.create(40000, 'GBP');

			expect(result.isOk).toBe(true);
			expect(result.value.amount).toBe(40000);
			expect(result.value.currency).toBe('GBP');
		});

		it('returns Ok with zero salary', () => {
			const result = Salary.create(0, 'USD');

			expect(result.isOk).toBe(true);
			expect(result.value.amount).toBe(0);
		});

		it('normalizes currency to uppercase', () => {
			const result = Salary.create(50000, 'usd');

			expect(result.isOk).toBe(true);
			expect(result.value.currency).toBe('USD');
		});

		it('returns InvalidSalaryError with negative amount', () => {
			const result = Salary.create(-1000, 'USD');

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('InvalidSalaryError');
			expect(result.error.message).toContain('must be non-negative');
		});

		it('returns InvalidSalaryError with invalid currency', () => {
			const invalidCurrencies = ['JPY', 'CNY', 'INVALID', 'US', ''];

			invalidCurrencies.forEach((currency) => {
				const result = Salary.create(50000, currency);

				expect(result.isError).toBe(true);
				expect(result.error.name).toBe('InvalidSalaryError');
				expect(result.error.message).toContain('Invalid currency');
			});
		});

		it('accepts decimal amounts', () => {
			const result = Salary.create(50000.5, 'USD');

			expect(result.isOk).toBe(true);
			expect(result.value.amount).toBe(50000.5);
		});

		it('accepts large amounts', () => {
			const result = Salary.create(999999999.99, 'USD');

			expect(result.isOk).toBe(true);
			expect(result.value.amount).toBe(999999999.99);
		});
	});

	describe('equals', () => {
		it('returns true for identical salaries', () => {
			const salary1 = Salary.create(50000, 'USD').value;
			const salary2 = Salary.create(50000, 'USD').value;

			expect(salary1.equals(salary2)).toBe(true);
		});

		it('returns false for different amounts', () => {
			const salary1 = Salary.create(50000, 'USD').value;
			const salary2 = Salary.create(60000, 'USD').value;

			expect(salary1.equals(salary2)).toBe(false);
		});

		it('returns false for different currencies', () => {
			const salary1 = Salary.create(50000, 'USD').value;
			const salary2 = Salary.create(50000, 'EUR').value;

			expect(salary1.equals(salary2)).toBe(false);
		});
	});

	describe('toString', () => {
		it('formats salary correctly', () => {
			const salary = Salary.create(50000, 'USD').value;

			expect(salary.toString()).toBe('50000 USD');
		});

		it('formats decimal amounts correctly', () => {
			const salary = Salary.create(50000.5, 'EUR').value;

			expect(salary.toString()).toBe('50000.5 EUR');
		});
	});
});
