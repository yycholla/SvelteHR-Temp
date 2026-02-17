import { describe, it, expect } from 'vitest';
import { ModuleCategory } from './ModuleCategory';
import { InvalidOnboardingModuleError } from '../errors/OnboardingErrors';

describe('ModuleCategory', () => {
	describe('create()', () => {
		describe('valid categories', () => {
			it('should create company_wide category', () => {
				const result = ModuleCategory.create('company_wide');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('company_wide');
			});

			it('should create department_specific category', () => {
				const result = ModuleCategory.create('department_specific');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('department_specific');
			});

			it('should create role_specific category', () => {
				const result = ModuleCategory.create('role_specific');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('role_specific');
			});

			it('should create compliance category', () => {
				const result = ModuleCategory.create('compliance');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('compliance');
			});

			it('should create orientation category', () => {
				const result = ModuleCategory.create('orientation');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('orientation');
			});

			it('should create technical category', () => {
				const result = ModuleCategory.create('technical');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('technical');
			});
		});

		describe('validation', () => {
			it('should reject an empty string', () => {
				const result = ModuleCategory.create('');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(InvalidOnboardingModuleError);
				expect(result.error.message).toContain('Invalid module category');
			});

			it('should reject a whitespace-only string', () => {
				const result = ModuleCategory.create('   ');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(InvalidOnboardingModuleError);
			});

			it('should reject an unrecognized category', () => {
				const result = ModuleCategory.create('invalid');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(InvalidOnboardingModuleError);
				expect(result.error.message).toContain('Invalid module category');
			});

			it('should reject case variation Company_Wide (case-sensitive)', () => {
				const result = ModuleCategory.create('Company_Wide');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(InvalidOnboardingModuleError);
			});

			it('should reject COMPANY_WIDE uppercase', () => {
				const result = ModuleCategory.create('COMPANY_WIDE');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(InvalidOnboardingModuleError);
			});

			it('should reject Orientation with capital letter', () => {
				const result = ModuleCategory.create('Orientation');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(InvalidOnboardingModuleError);
			});

			it('should reject Technical with capital letter', () => {
				const result = ModuleCategory.create('Technical');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(InvalidOnboardingModuleError);
			});

			it('should reject a number string', () => {
				const result = ModuleCategory.create('123');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(InvalidOnboardingModuleError);
			});

			it('should include the list of valid categories in the error message', () => {
				const result = ModuleCategory.create('unknown');
				expect(result.isError).toBe(true);
				expect(result.error.message).toContain('company_wide');
			});

			it('should have the correct error code', () => {
				const result = ModuleCategory.create('bad_value');
				expect(result.isError).toBe(true);
				expect(result.error.code).toBe('INVALID_ONBOARDING_MODULE');
			});
		});

		describe('whitespace handling', () => {
			it('should trim whitespace before validation', () => {
				const result = ModuleCategory.create('  company_wide  ');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('company_wide');
			});

			it('should trim and reject whitespace-only string', () => {
				const result = ModuleCategory.create('  ');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(InvalidOnboardingModuleError);
			});
		});
	});

	describe('value getter', () => {
		it('should return the exact category value', () => {
			const result = ModuleCategory.create('compliance');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('compliance');
		});
	});

	describe('equals()', () => {
		it('should return true for the same category', () => {
			const cat1 = ModuleCategory.create('orientation').value;
			const cat2 = ModuleCategory.create('orientation').value;
			expect(cat1.equals(cat2)).toBe(true);
		});

		it('should return false for different categories', () => {
			const cat1 = ModuleCategory.create('orientation').value;
			const cat2 = ModuleCategory.create('technical').value;
			expect(cat1.equals(cat2)).toBe(false);
		});
	});

	describe('toString()', () => {
		it('should return the category string value', () => {
			const cat = ModuleCategory.create('role_specific').value;
			expect(cat.toString()).toBe('role_specific');
		});
	});
});
