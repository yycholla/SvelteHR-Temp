// tests/unit/domain/Employee/PersonName.test.ts
import { describe, it, expect } from 'vitest';
import { PersonName } from '$domain/Employee/PersonName';
import { ValidationError } from '$domain/errors';

describe('PersonName', () => {
	describe('create', () => {
		it('creates name with valid first and last names', () => {
			const result = PersonName.create('John', 'Doe');

			expect(result.isOk).toBe(true);
			expect(result.value.first).toBe('John');
			expect(result.value.last).toBe('Doe');
		});

		it('trims whitespace from names', () => {
			const result = PersonName.create('  John  ', '  Doe  ');

			expect(result.value.first).toBe('John');
			expect(result.value.last).toBe('Doe');
		});

		it('returns error for empty first name', () => {
			const result = PersonName.create('', 'Doe');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ValidationError);
			expect(result.error.message).toContain('required');
		});

		it('returns error for empty last name', () => {
			const result = PersonName.create('John', '');

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('required');
		});

		it('returns error for whitespace-only first name', () => {
			const result = PersonName.create('   ', 'Doe');

			expect(result.isError).toBe(true);
		});

		it('returns error for whitespace-only last name', () => {
			const result = PersonName.create('John', '   ');

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('required');
		});

		it('returns error for first name exceeding 100 characters', () => {
			const longName = 'a'.repeat(101);
			const result = PersonName.create(longName, 'Doe');

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('max_length');
		});

		it('returns error for last name exceeding 100 characters', () => {
			const longName = 'a'.repeat(101);
			const result = PersonName.create('John', longName);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('max_length');
		});
	});

	describe('fullName', () => {
		it('formats as "First Last"', () => {
			const name = PersonName.create('John', 'Doe').value;

			expect(name.fullName).toBe('John Doe');
		});
	});

	describe('displayName', () => {
		it('formats as "Last, First"', () => {
			const name = PersonName.create('John', 'Doe').value;

			expect(name.displayName).toBe('Doe, John');
		});
	});

	describe('equals', () => {
		it('returns true for equal names', () => {
			const name1 = PersonName.create('John', 'Doe').value;
			const name2 = PersonName.create('John', 'Doe').value;

			expect(name1.equals(name2)).toBe(true);
		});

		it('returns true for equal names with trimmed whitespace', () => {
			const name1 = PersonName.create('  John  ', '  Doe  ').value;
			const name2 = PersonName.create('John', 'Doe').value;

			expect(name1.equals(name2)).toBe(true);
		});

		it('returns false for different first names', () => {
			const name1 = PersonName.create('John', 'Doe').value;
			const name2 = PersonName.create('Jane', 'Doe').value;

			expect(name1.equals(name2)).toBe(false);
		});

		it('returns false for different last names', () => {
			const name1 = PersonName.create('John', 'Doe').value;
			const name2 = PersonName.create('John', 'Smith').value;

			expect(name1.equals(name2)).toBe(false);
		});
	});
});
