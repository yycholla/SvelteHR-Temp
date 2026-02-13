import { describe, it, expect } from 'vitest';
import { DocumentTitle } from './DocumentTitle';
import { DocumentTitleValidationError } from '../errors/DocumentErrors';

describe('DocumentTitle', () => {
	describe('create()', () => {
		describe('valid titles', () => {
			it('should create title with minimum length (1 character)', () => {
				const result = DocumentTitle.create('A');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('A');
			});

			it('should create title with typical length', () => {
				const result = DocumentTitle.create('Employee Handbook');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('Employee Handbook');
			});

			it('should create title at maximum length (200 characters)', () => {
				const longTitle = 'A'.repeat(200);
				const result = DocumentTitle.create(longTitle);
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe(longTitle);
			});

			it('should create title with special characters', () => {
				const result = DocumentTitle.create('Q1-2024 Financial Report (Updated)');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('Q1-2024 Financial Report (Updated)');
			});

			it('should create title with unicode characters', () => {
				const result = DocumentTitle.create('Política de Privacidad 2024');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('Política de Privacidad 2024');
			});
		});

		describe('trimming', () => {
			it('should trim leading whitespace', () => {
				const result = DocumentTitle.create('  Employee Handbook');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('Employee Handbook');
			});

			it('should trim trailing whitespace', () => {
				const result = DocumentTitle.create('Employee Handbook  ');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('Employee Handbook');
			});

			it('should trim both leading and trailing whitespace', () => {
				const result = DocumentTitle.create('  Employee Handbook  ');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('Employee Handbook');
			});

			it('should preserve internal whitespace', () => {
				const result = DocumentTitle.create('Company  Policy  Document');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('Company  Policy  Document');
			});
		});

		describe('validation', () => {
			it('should reject empty string', () => {
				const result = DocumentTitle.create('');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(DocumentTitleValidationError);
				expect(result.error?.message).toContain('cannot be empty');
			});

			it('should reject whitespace-only string', () => {
				const result = DocumentTitle.create('   ');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(DocumentTitleValidationError);
				expect(result.error?.message).toContain('cannot be empty');
			});

			it('should reject title exceeding 200 characters', () => {
				const tooLongTitle = 'A'.repeat(201);
				const result = DocumentTitle.create(tooLongTitle);
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(DocumentTitleValidationError);
				expect(result.error?.message).toContain('200 characters');
			});

			it('should reject title exceeding 200 characters after trimming', () => {
				const tooLongTitle = '  ' + 'A'.repeat(201) + '  ';
				const result = DocumentTitle.create(tooLongTitle);
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(DocumentTitleValidationError);
				expect(result.error?.message).toContain('200 characters');
			});

			it('should include character count in error message', () => {
				const tooLongTitle = 'A'.repeat(250);
				const result = DocumentTitle.create(tooLongTitle);
				expect(result.isError).toBe(true);
				expect(result.error?.message).toContain('got 250');
			});
		});
	});

	describe('equals()', () => {
		it('should return true for same title value', () => {
			const title1 = DocumentTitle.create('Employee Handbook').value!;
			const title2 = DocumentTitle.create('Employee Handbook').value!;
			expect(title1.equals(title2)).toBe(true);
		});

		it('should return false for different title values', () => {
			const title1 = DocumentTitle.create('Employee Handbook').value!;
			const title2 = DocumentTitle.create('Privacy Policy').value!;
			expect(title1.equals(title2)).toBe(false);
		});

		it('should be case-sensitive', () => {
			const title1 = DocumentTitle.create('Employee Handbook').value!;
			const title2 = DocumentTitle.create('employee handbook').value!;
			expect(title1.equals(title2)).toBe(false);
		});

		it('should consider trimmed values only', () => {
			const title1 = DocumentTitle.create('  Employee Handbook  ').value!;
			const title2 = DocumentTitle.create('Employee Handbook').value!;
			expect(title1.equals(title2)).toBe(true);
		});
	});

	describe('toString()', () => {
		it('should return the title value as string', () => {
			const title = DocumentTitle.create('Employee Handbook').value!;
			expect(title.toString()).toBe('Employee Handbook');
		});

		it('should return trimmed value', () => {
			const title = DocumentTitle.create('  Employee Handbook  ').value!;
			expect(title.toString()).toBe('Employee Handbook');
		});
	});
});
