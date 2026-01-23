import { describe, expect, it } from 'vitest';
import { isValidPhone, normalizePhone } from '$lib/utils/validators/phone';

describe('isValidPhone', () => {
	it('accepts valid phone numbers', () => {
		expect(isValidPhone('555-123-4567')).toBe(true);
		expect(isValidPhone('(555) 123-4567')).toBe(true);
		expect(isValidPhone('5551234567')).toBe(true);
		expect(isValidPhone('+1-555-123-4567')).toBe(true);
	});

	it('rejects invalid phone numbers', () => {
		expect(isValidPhone('123')).toBe(false);
		expect(isValidPhone('abc-def-ghij')).toBe(false);
		expect(isValidPhone('')).toBe(false);
	});

	it('handles null/undefined', () => {
		expect(isValidPhone(null)).toBe(false);
		expect(isValidPhone(undefined)).toBe(false);
	});
});

describe('normalizePhone', () => {
	it('removes formatting characters', () => {
		expect(normalizePhone('(555) 123-4567')).toBe('5551234567');
		expect(normalizePhone('+1-555-123-4567')).toBe('15551234567');
	});

	it('handles null without crashing', () => {
		expect(normalizePhone(null as unknown as string)).toBe('');
	});

	it('handles undefined without crashing', () => {
		expect(normalizePhone(undefined as unknown as string)).toBe('');
	});

	it('handles empty string', () => {
		expect(normalizePhone('')).toBe('');
	});
});
