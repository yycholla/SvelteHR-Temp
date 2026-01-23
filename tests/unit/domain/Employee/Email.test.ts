// tests/unit/domain/Employee/Email.test.ts
import { describe, it, expect } from 'vitest';
import { Email } from '$domain/Employee/Email';
import { InvalidEmailError } from '$domain/errors';

describe('Email', () => {
	describe('create', () => {
		it('creates email with valid address', () => {
			const result = Email.create('john.doe@example.com');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('john.doe@example.com');
		});

		it('normalizes email to lowercase', () => {
			const result = Email.create('John.Doe@EXAMPLE.COM');

			expect(result.value.value).toBe('john.doe@example.com');
		});

		it('trims whitespace', () => {
			const result = Email.create('  john@example.com  ');

			expect(result.value.value).toBe('john@example.com');
		});

		it('returns error for empty string', () => {
			const result = Email.create('');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidEmailError);
			expect(result.error.code).toBe('INVALID_EMAIL');
		});

		it('returns error for whitespace-only string', () => {
			const result = Email.create('   ');

			expect(result.isError).toBe(true);
		});

		it('returns error for invalid format - no @', () => {
			const result = Email.create('notanemail');

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Invalid email format');
		});

		it('returns error for invalid format - no domain', () => {
			const result = Email.create('test@');

			expect(result.isError).toBe(true);
		});

		it('returns error for invalid format - no TLD', () => {
			const result = Email.create('test@domain');

			expect(result.isError).toBe(true);
		});
	});

	describe('equals', () => {
		it('returns true for equal emails', () => {
			const email1 = Email.create('test@example.com');
			const email2 = Email.create('test@example.com');

			expect(email1.value.equals(email2.value)).toBe(true);
		});

		it('returns true for equal emails with different casing', () => {
			const email1 = Email.create('Test@Example.com');
			const email2 = Email.create('test@example.com');

			expect(email1.value.equals(email2.value)).toBe(true);
		});

		it('returns false for different emails', () => {
			const email1 = Email.create('test1@example.com');
			const email2 = Email.create('test2@example.com');

			expect(email1.value.equals(email2.value)).toBe(false);
		});
	});
});
