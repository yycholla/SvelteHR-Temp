import { describe, expect, it } from 'vitest';
import { DepartmentName } from './DepartmentName';

describe('DepartmentName', () => {
	describe('create', () => {
		it('returns Ok with valid name', () => {
			const validName = 'Engineering';
			const result = DepartmentName.create(validName);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(validName);
		});

		it('returns Ok with name at minimum length (1 character)', () => {
			const result = DepartmentName.create('A');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('A');
		});

		it('returns Ok with name at maximum length (100 characters)', () => {
			const maxLengthName = 'A'.repeat(100);
			const result = DepartmentName.create(maxLengthName);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(maxLengthName);
		});

		it('returns ValidationError with empty string', () => {
			const result = DepartmentName.create('');

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('ValidationError');
			expect(result.error.message).toContain('cannot be empty');
		});

		it('returns ValidationError with whitespace-only string', () => {
			const result = DepartmentName.create('   ');

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('ValidationError');
			expect(result.error.message).toContain('cannot be empty');
		});

		it('returns ValidationError with null', () => {
			const result = DepartmentName.create(null as unknown as string);

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('ValidationError');
			expect(result.error.message).toContain('cannot be empty');
		});

		it('returns ValidationError with undefined', () => {
			const result = DepartmentName.create(undefined as unknown as string);

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('ValidationError');
			expect(result.error.message).toContain('cannot be empty');
		});

		it('returns ValidationError with name exceeding max length', () => {
			const tooLongName = 'A'.repeat(101);
			const result = DepartmentName.create(tooLongName);

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('ValidationError');
			expect(result.error.message).toContain('between 1 and 100 characters');
		});

		it('trims leading whitespace', () => {
			const result = DepartmentName.create('  Engineering');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('Engineering');
		});

		it('trims trailing whitespace', () => {
			const result = DepartmentName.create('Engineering  ');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('Engineering');
		});

		it('trims both leading and trailing whitespace', () => {
			const result = DepartmentName.create('  Engineering  ');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('Engineering');
		});

		it('preserves internal whitespace', () => {
			const result = DepartmentName.create('Human Resources');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('Human Resources');
		});

		it('allows special characters', () => {
			const specialNames = ['R&D', 'Sales - North', 'IT/DevOps', 'Customer Success (US)'];

			specialNames.forEach((name) => {
				const result = DepartmentName.create(name);

				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe(name);
			});
		});

		it('allows unicode characters', () => {
			const unicodeNames = ['Développement', 'Diseño', '开发部'];

			unicodeNames.forEach((name) => {
				const result = DepartmentName.create(name);

				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe(name);
			});
		});
	});

	describe('equals', () => {
		it('returns true for identical names', () => {
			const name1 = DepartmentName.create('Engineering').value;
			const name2 = DepartmentName.create('Engineering').value;

			expect(name1.equals(name2)).toBe(true);
		});

		it('returns true for case-insensitive match', () => {
			const name1 = DepartmentName.create('Engineering').value;
			const name2 = DepartmentName.create('ENGINEERING').value;

			expect(name1.equals(name2)).toBe(true);
		});

		it('returns true for mixed case variations', () => {
			const name1 = DepartmentName.create('Human Resources').value;
			const name2 = DepartmentName.create('human RESOURCES').value;

			expect(name1.equals(name2)).toBe(true);
		});

		it('returns false for different names', () => {
			const name1 = DepartmentName.create('Engineering').value;
			const name2 = DepartmentName.create('Marketing').value;

			expect(name1.equals(name2)).toBe(false);
		});
	});

	describe('toString', () => {
		it('returns the raw value', () => {
			const name = DepartmentName.create('Engineering').value;

			expect(name.toString()).toBe('Engineering');
		});

		it('preserves original casing', () => {
			const name = DepartmentName.create('Human Resources').value;

			expect(name.toString()).toBe('Human Resources');
		});
	});
});
