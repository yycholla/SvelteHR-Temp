import { describe, expect, it } from 'vitest';
import { Email } from './Email';

describe('Email', () => {
	describe('create', () => {
		it('returns Ok with valid email', () => {
			const validEmail = 'user@example.com';
			const result = Email.create(validEmail);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(validEmail);
		});

		it('returns InvalidEmailError with empty string', () => {
			const result = Email.create('');

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('InvalidEmailError');
			expect(result.error.message).toContain('cannot be empty');
		});

		it('returns InvalidEmailError with invalid format', () => {
			const invalidEmails = [
				'notanemail',
				'missing@domain',
				'@nodomain.com',
				'no-at-sign.com',
				'spaces in@email.com',
				'double@@domain.com'
			];

			invalidEmails.forEach((email) => {
				const result = Email.create(email);

				expect(result.isError).toBe(true);
				expect(result.error.name).toBe('InvalidEmailError');
				expect(result.error.message).toContain('Invalid email format');
			});
		});

		it('normalizes to lowercase', () => {
			const upperCaseEmail = 'User@EXAMPLE.COM';
			const result = Email.create(upperCaseEmail);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('user@example.com');
		});

		it('trims whitespace', () => {
			const emailWithWhitespace = '  user@example.com  ';
			const result = Email.create(emailWithWhitespace);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('user@example.com');
		});
	});
});
