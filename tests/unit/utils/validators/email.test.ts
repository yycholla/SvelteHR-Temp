import { describe, expect, it } from 'vitest';
import { isValidEmail, normalizeEmail } from '$lib/utils/validators/email';

describe('isValidEmail', () => {
	it('accepts valid email addresses', () => {
		expect(isValidEmail('user@example.com')).toBe(true);
		expect(isValidEmail('test.user+tag@domain.co.uk')).toBe(true);
	});

	it('rejects invalid email addresses', () => {
		expect(isValidEmail('invalid')).toBe(false);
		expect(isValidEmail('user@')).toBe(false);
		expect(isValidEmail('@domain.com')).toBe(false);
		expect(isValidEmail('')).toBe(false);
	});

	it('handles null/undefined', () => {
		expect(isValidEmail(null)).toBe(false);
		expect(isValidEmail(undefined)).toBe(false);
	});

	it('rejects emails with consecutive dots', () => {
		expect(isValidEmail('test..user@domain.com')).toBe(false);
		expect(isValidEmail('test...user@domain.com')).toBe(false);
	});

	it('rejects emails starting with dot', () => {
		expect(isValidEmail('.test@domain.com')).toBe(false);
	});

	it('rejects emails ending with dot before @', () => {
		expect(isValidEmail('test.@domain.com')).toBe(false);
	});

	it('rejects emails with consecutive dots in domain', () => {
		expect(isValidEmail('test@domain..com')).toBe(false);
		expect(isValidEmail('test@domain...com')).toBe(false);
	});

	it('rejects emails with domain starting with dot', () => {
		expect(isValidEmail('test@.domain.com')).toBe(false);
	});

	it('rejects emails with domain ending with dot', () => {
		expect(isValidEmail('test@domain.com.')).toBe(false);
	});
});

describe('normalizeEmail', () => {
	it('converts to lowercase and trims', () => {
		expect(normalizeEmail(' USER@EXAMPLE.COM ')).toBe('user@example.com');
	});

	it('handles null without crashing', () => {
		expect(normalizeEmail(null as unknown as string)).toBe('');
	});

	it('handles undefined without crashing', () => {
		expect(normalizeEmail(undefined as unknown as string)).toBe('');
	});

	it('handles empty string', () => {
		expect(normalizeEmail('')).toBe('');
	});
});
