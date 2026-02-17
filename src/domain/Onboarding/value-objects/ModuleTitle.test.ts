import { describe, it, expect } from 'vitest';
import { ModuleTitle } from './ModuleTitle';
import { InvalidOnboardingModuleError } from '../errors/OnboardingErrors';

describe('ModuleTitle', () => {
	describe('create()', () => {
		describe('valid titles', () => {
			it('should create a title with a single character', () => {
				const result = ModuleTitle.create('A');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('A');
			});

			it('should create a title with a normal string', () => {
				const result = ModuleTitle.create('Company Orientation');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('Company Orientation');
			});

			it('should create a title with exactly 200 characters', () => {
				const title = 'A'.repeat(200);
				const result = ModuleTitle.create(title);
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe(title);
			});

			it('should trim leading whitespace', () => {
				const result = ModuleTitle.create('  IT Setup Guide');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('IT Setup Guide');
			});

			it('should trim trailing whitespace', () => {
				const result = ModuleTitle.create('Benefits Overview  ');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('Benefits Overview');
			});

			it('should trim both leading and trailing whitespace', () => {
				const result = ModuleTitle.create('  HR Policies  ');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('HR Policies');
			});

			it('should allow titles with numbers', () => {
				const result = ModuleTitle.create('Module 1: Introduction');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('Module 1: Introduction');
			});

			it('should allow titles with special characters', () => {
				const result = ModuleTitle.create('Safety & Compliance (2025)');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('Safety & Compliance (2025)');
			});
		});

		describe('boundary conditions', () => {
			it('should create a title at the minimum length of 1 character after trimming', () => {
				const result = ModuleTitle.create('X');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('X');
			});

			it('should create a title at the maximum length of 200 characters', () => {
				const title = 'B'.repeat(200);
				const result = ModuleTitle.create(title);
				expect(result.isOk).toBe(true);
				expect(result.value.value.length).toBe(200);
			});

			it('should reject a title exceeding 200 characters', () => {
				const title = 'C'.repeat(201);
				const result = ModuleTitle.create(title);
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(InvalidOnboardingModuleError);
				expect(result.error.message).toContain('200');
			});

			it('should reject a title of 201 characters after trimming', () => {
				const title = ' ' + 'D'.repeat(201) + ' ';
				const result = ModuleTitle.create(title);
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(InvalidOnboardingModuleError);
			});
		});

		describe('validation', () => {
			it('should reject an empty string', () => {
				const result = ModuleTitle.create('');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(InvalidOnboardingModuleError);
				expect(result.error.message).toContain('empty');
			});

			it('should reject a whitespace-only string', () => {
				const result = ModuleTitle.create('   ');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(InvalidOnboardingModuleError);
				expect(result.error.message).toContain('empty');
			});

			it('should reject a tab-only string', () => {
				const result = ModuleTitle.create('\t\t');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(InvalidOnboardingModuleError);
			});

			it('should have the correct error code', () => {
				const result = ModuleTitle.create('');
				expect(result.isError).toBe(true);
				expect(result.error.code).toBe('INVALID_ONBOARDING_MODULE');
			});
		});
	});

	describe('value getter', () => {
		it('should return the trimmed string value', () => {
			const result = ModuleTitle.create('  New Employee Orientation  ');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('New Employee Orientation');
		});
	});

	describe('equals()', () => {
		it('should return true for identical titles', () => {
			const title1 = ModuleTitle.create('Company Orientation').value;
			const title2 = ModuleTitle.create('Company Orientation').value;
			expect(title1.equals(title2)).toBe(true);
		});

		it('should return false for different titles', () => {
			const title1 = ModuleTitle.create('Company Orientation').value;
			const title2 = ModuleTitle.create('IT Setup Guide').value;
			expect(title1.equals(title2)).toBe(false);
		});

		it('should return true for titles that are equal after trimming', () => {
			const title1 = ModuleTitle.create('  HR Policies  ').value;
			const title2 = ModuleTitle.create('HR Policies').value;
			expect(title1.equals(title2)).toBe(true);
		});

		it('should be case-sensitive', () => {
			const title1 = ModuleTitle.create('Orientation').value;
			const title2 = ModuleTitle.create('orientation').value;
			expect(title1.equals(title2)).toBe(false);
		});
	});

	describe('toString()', () => {
		it('should return the trimmed string value', () => {
			const title = ModuleTitle.create('  Safety Training  ').value;
			expect(title.toString()).toBe('Safety Training');
		});
	});
});
