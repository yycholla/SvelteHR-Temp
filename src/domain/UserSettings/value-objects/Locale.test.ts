// src/domain/UserSettings/value-objects/Locale.test.ts
import { describe, it, expect } from 'vitest';
import { Locale } from './Locale';
import { InvalidUserSettingsError } from '../errors/UserSettingsErrors';

describe('Locale', () => {
	describe('create', () => {
		it('should create a valid two-letter locale', () => {
			const result = Locale.create('en');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('en');
		});

		it('should create a valid full locale with region', () => {
			const result = Locale.create('en-US');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('en-US');
		});

		it('should create various valid locales', () => {
			const locales = ['fr', 'fr-FR', 'de-DE', 'zh-CN', 'ja-JP', 'pt-BR', 'es-ES'];
			for (const locale of locales) {
				const result = Locale.create(locale);
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe(locale);
			}
		});

		it('should reject empty string', () => {
			const result = Locale.create('');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidUserSettingsError);
		});

		it('should reject single letter locale', () => {
			const result = Locale.create('e');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidUserSettingsError);
		});

		it('should reject three-letter locale without region', () => {
			const result = Locale.create('eng');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidUserSettingsError);
		});

		it('should reject uppercase language code', () => {
			const result = Locale.create('EN');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidUserSettingsError);
		});

		it('should reject lowercase region code', () => {
			const result = Locale.create('en-us');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidUserSettingsError);
		});

		it('should reject locale without proper separator', () => {
			const result = Locale.create('enUS');
			expect(result.isError).toBe(true);
		});

		it('should reject non-string values', () => {
			const result = Locale.create(null as unknown as string);
			expect(result.isError).toBe(true);
		});

		it('should trim whitespace before validation', () => {
			const result = Locale.create('  en-US  ');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('en-US');
		});

		it('should include format info in error message for invalid format', () => {
			const result = Locale.create('invalid');
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('BCP 47');
		});
	});

	describe('language getter', () => {
		it('should return the language portion of a full locale', () => {
			const locale = Locale.create('en-US').value;
			expect(locale.language).toBe('en');
		});

		it('should return the language for a two-letter locale', () => {
			const locale = Locale.create('fr').value;
			expect(locale.language).toBe('fr');
		});
	});

	describe('region getter', () => {
		it('should return the region portion of a full locale', () => {
			const locale = Locale.create('en-US').value;
			expect(locale.region).toBe('US');
		});

		it('should return null for a two-letter locale', () => {
			const locale = Locale.create('fr').value;
			expect(locale.region).toBeNull();
		});
	});

	describe('equals', () => {
		it('should return true for equal locales', () => {
			const l1 = Locale.create('en-US').value;
			const l2 = Locale.create('en-US').value;
			expect(l1.equals(l2)).toBe(true);
		});

		it('should return false for different locales', () => {
			const l1 = Locale.create('en-US').value;
			const l2 = Locale.create('fr-FR').value;
			expect(l1.equals(l2)).toBe(false);
		});
	});

	describe('toString', () => {
		it('should return the locale string', () => {
			const locale = Locale.create('de-DE').value;
			expect(locale.toString()).toBe('de-DE');
		});
	});
});
