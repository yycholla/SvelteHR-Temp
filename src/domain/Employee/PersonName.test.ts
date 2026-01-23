import { describe, expect, it } from 'vitest';
import { PersonName } from './PersonName';

describe('PersonName', () => {
	describe('create', () => {
		it('returns Ok with valid names', () => {
			const result = PersonName.create('John', 'Doe');

			expect(result.isOk).toBe(true);
			expect(result.value.first).toBe('John');
			expect(result.value.last).toBe('Doe');
		});

		it('returns ValidationError with empty first name', () => {
			const result = PersonName.create('', 'Doe');

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('ValidationError');
			expect(result.error.message).toContain('first');
			expect(result.error.message).toContain('required');
		});

		it('returns ValidationError with empty last name', () => {
			const result = PersonName.create('John', '');

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('ValidationError');
			expect(result.error.message).toContain('last');
			expect(result.error.message).toContain('required');
		});
	});

	describe('fullName', () => {
		it('formats correctly as "First Last"', () => {
			const name = PersonName.create('John', 'Doe').value;

			expect(name.fullName).toBe('John Doe');
		});
	});

	describe('displayName', () => {
		it('formats correctly as "Last, First"', () => {
			const name = PersonName.create('John', 'Doe').value;

			expect(name.displayName).toBe('Doe, John');
		});
	});
});
