// src/domain/UserSettings/value-objects/Timezone.test.ts
import { describe, it, expect } from 'vitest';
import { Timezone } from './Timezone';
import { InvalidUserSettingsError } from '../errors/UserSettingsErrors';

describe('Timezone', () => {
	describe('create', () => {
		it('should create a valid UTC timezone', () => {
			const result = Timezone.create('UTC');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('UTC');
		});

		it('should create a valid IANA timezone', () => {
			const result = Timezone.create('America/New_York');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('America/New_York');
		});

		it('should create timezone for various IANA zones', () => {
			const zones = ['Europe/London', 'Asia/Tokyo', 'Pacific/Auckland', 'US/Eastern'];
			for (const zone of zones) {
				const result = Timezone.create(zone);
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe(zone);
			}
		});

		it('should trim whitespace from timezone', () => {
			const result = Timezone.create('  America/Chicago  ');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('America/Chicago');
		});

		it('should reject empty string', () => {
			const result = Timezone.create('');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidUserSettingsError);
		});

		it('should reject whitespace-only string', () => {
			const result = Timezone.create('   ');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidUserSettingsError);
		});

		it('should reject timezone exceeding 50 characters', () => {
			const longTimezone = 'A'.repeat(51);
			const result = Timezone.create(longTimezone);
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidUserSettingsError);
		});

		it('should accept timezone of exactly 50 characters', () => {
			const exactTimezone = 'A'.repeat(50);
			const result = Timezone.create(exactTimezone);
			expect(result.isOk).toBe(true);
		});

		it('should reject non-string values', () => {
			const result = Timezone.create(123 as unknown as string);
			expect(result.isError).toBe(true);
		});

		it('should include invalid value in error message', () => {
			const longValue = 'A'.repeat(60);
			const result = Timezone.create(longValue);
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('50');
		});
	});

	describe('value getter', () => {
		it('should return the timezone string', () => {
			const tz = Timezone.create('America/Los_Angeles').value;
			expect(tz.value).toBe('America/Los_Angeles');
		});
	});

	describe('equals', () => {
		it('should return true for equal timezones', () => {
			const tz1 = Timezone.create('UTC').value;
			const tz2 = Timezone.create('UTC').value;
			expect(tz1.equals(tz2)).toBe(true);
		});

		it('should return false for different timezones', () => {
			const tz1 = Timezone.create('UTC').value;
			const tz2 = Timezone.create('America/New_York').value;
			expect(tz1.equals(tz2)).toBe(false);
		});
	});

	describe('toString', () => {
		it('should return the timezone string', () => {
			const tz = Timezone.create('Europe/Paris').value;
			expect(tz.toString()).toBe('Europe/Paris');
		});
	});
});
