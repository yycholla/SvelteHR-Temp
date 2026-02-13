import { describe, it, expect } from 'vitest';
import { DocumentType } from './DocumentType';
import { DocumentTypeValidationError } from '../errors/DocumentErrors';

describe('DocumentType', () => {
	describe('create()', () => {
		describe('valid types', () => {
			it('should create policy type', () => {
				const result = DocumentType.create('policy');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('policy');
			});

			it('should create handbook type', () => {
				const result = DocumentType.create('handbook');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('handbook');
			});

			it('should create form type', () => {
				const result = DocumentType.create('form');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('form');
			});

			it('should create template type', () => {
				const result = DocumentType.create('template');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('template');
			});

			it('should create contract type', () => {
				const result = DocumentType.create('contract');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('contract');
			});
		});

		describe('normalization', () => {
			it('should normalize uppercase to lowercase', () => {
				const result = DocumentType.create('POLICY');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('policy');
			});

			it('should normalize mixed case to lowercase', () => {
				const result = DocumentType.create('HaNdBoOk');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('handbook');
			});

			it('should trim leading whitespace', () => {
				const result = DocumentType.create('  form');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('form');
			});

			it('should trim trailing whitespace', () => {
				const result = DocumentType.create('template  ');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('template');
			});

			it('should trim both leading and trailing whitespace', () => {
				const result = DocumentType.create('  contract  ');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('contract');
			});

			it('should convert kebab-case to lowercase', () => {
				const result = DocumentType.create('hand-book');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('handbook');
			});
		});

		describe('validation', () => {
			it('should reject empty string', () => {
				const result = DocumentType.create('');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(DocumentTypeValidationError);
				expect(result.error?.message).toContain('cannot be empty');
			});

			it('should reject whitespace-only string', () => {
				const result = DocumentType.create('   ');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(DocumentTypeValidationError);
				expect(result.error?.message).toContain('cannot be empty');
			});

			it('should reject invalid type', () => {
				const result = DocumentType.create('invalid');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(DocumentTypeValidationError);
				expect(result.error?.message).toContain('Invalid type');
			});

			it('should include valid types in error message', () => {
				const result = DocumentType.create('unknown');
				expect(result.isError).toBe(true);
				expect(result.error?.message).toContain('policy');
				expect(result.error?.message).toContain('handbook');
				expect(result.error?.message).toContain('form');
				expect(result.error?.message).toContain('template');
				expect(result.error?.message).toContain('contract');
			});

			it('should reject type with invalid characters', () => {
				const result = DocumentType.create('pol!cy');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(DocumentTypeValidationError);
			});
		});
	});

	describe('equals()', () => {
		it('should return true for same type value', () => {
			const type1 = DocumentType.create('policy').value!;
			const type2 = DocumentType.create('policy').value!;
			expect(type1.equals(type2)).toBe(true);
		});

		it('should return false for different type values', () => {
			const type1 = DocumentType.create('policy').value!;
			const type2 = DocumentType.create('handbook').value!;
			expect(type1.equals(type2)).toBe(false);
		});

		it('should be case-insensitive (normalized)', () => {
			const type1 = DocumentType.create('POLICY').value!;
			const type2 = DocumentType.create('policy').value!;
			expect(type1.equals(type2)).toBe(true);
		});

		it('should ignore whitespace (normalized)', () => {
			const type1 = DocumentType.create('  form  ').value!;
			const type2 = DocumentType.create('form').value!;
			expect(type1.equals(type2)).toBe(true);
		});
	});

	describe('type checking methods', () => {
		it('should identify policy type', () => {
			const type = DocumentType.create('policy').value!;
			expect(type.isPolicy()).toBe(true);
			expect(type.isHandbook()).toBe(false);
			expect(type.isForm()).toBe(false);
		});

		it('should identify handbook type', () => {
			const type = DocumentType.create('handbook').value!;
			expect(type.isHandbook()).toBe(true);
			expect(type.isPolicy()).toBe(false);
			expect(type.isTemplate()).toBe(false);
		});

		it('should identify form type', () => {
			const type = DocumentType.create('form').value!;
			expect(type.isForm()).toBe(true);
			expect(type.isContract()).toBe(false);
			expect(type.isPolicy()).toBe(false);
		});

		it('should identify template type', () => {
			const type = DocumentType.create('template').value!;
			expect(type.isTemplate()).toBe(true);
			expect(type.isForm()).toBe(false);
			expect(type.isHandbook()).toBe(false);
		});

		it('should identify contract type', () => {
			const type = DocumentType.create('contract').value!;
			expect(type.isContract()).toBe(true);
			expect(type.isTemplate()).toBe(false);
			expect(type.isPolicy()).toBe(false);
		});
	});

	describe('toString()', () => {
		it('should return the type value as string', () => {
			const type = DocumentType.create('policy').value!;
			expect(type.toString()).toBe('policy');
		});

		it('should return normalized value', () => {
			const type = DocumentType.create('HANDBOOK').value!;
			expect(type.toString()).toBe('handbook');
		});
	});
});
