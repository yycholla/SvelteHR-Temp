import { describe, expect, it } from 'vitest';
import {
	hasMaxLength,
	hasMinLength,
	isNonEmpty,
	matchesPattern
} from '$lib/utils/validators/string';

describe('isNonEmpty', () => {
	it('returns true for non-empty strings', () => {
		expect(isNonEmpty('hello')).toBe(true);
		expect(isNonEmpty('  hello  ')).toBe(true);
	});

	it('returns false for empty strings', () => {
		expect(isNonEmpty('')).toBe(false);
		expect(isNonEmpty('   ')).toBe(false);
		expect(isNonEmpty(null)).toBe(false);
		expect(isNonEmpty(undefined)).toBe(false);
	});
});

describe('hasMinLength', () => {
	it('returns true if string meets minimum length', () => {
		expect(hasMinLength('hello', 3)).toBe(true);
		expect(hasMinLength('hello', 5)).toBe(true);
	});

	it('returns false if string is too short', () => {
		expect(hasMinLength('hi', 3)).toBe(false);
	});

	it('handles null without crashing', () => {
		expect(hasMinLength(null as unknown as string, 5)).toBe(false);
	});

	it('handles undefined without crashing', () => {
		expect(hasMinLength(undefined as unknown as string, 5)).toBe(false);
	});

	it('handles empty string', () => {
		expect(hasMinLength('', 5)).toBe(false);
	});
});

describe('hasMaxLength', () => {
	it('returns true if string is within maximum length', () => {
		expect(hasMaxLength('hello', 10)).toBe(true);
		expect(hasMaxLength('hello', 5)).toBe(true);
	});

	it('returns false if string is too long', () => {
		expect(hasMaxLength('hello world', 5)).toBe(false);
	});

	it('handles null without crashing - returns true (no length)', () => {
		expect(hasMaxLength(null as unknown as string, 10)).toBe(true);
	});

	it('handles undefined without crashing - returns true (no length)', () => {
		expect(hasMaxLength(undefined as unknown as string, 10)).toBe(true);
	});

	it('handles empty string - returns true', () => {
		expect(hasMaxLength('', 10)).toBe(true);
	});
});

describe('matchesPattern', () => {
	it('returns true if string matches pattern', () => {
		expect(matchesPattern('abc123', /^[a-z0-9]+$/)).toBe(true);
	});

	it('returns false if string does not match pattern', () => {
		expect(matchesPattern('ABC', /^[a-z]+$/)).toBe(false);
	});
});
