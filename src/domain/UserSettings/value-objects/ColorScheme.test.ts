// src/domain/UserSettings/value-objects/ColorScheme.test.ts
import { describe, it, expect } from 'vitest';
import { ColorScheme } from './ColorScheme';
import { InvalidUserSettingsError } from '../errors/UserSettingsErrors';

describe('ColorScheme', () => {
	describe('create', () => {
		it('should create blue color scheme', () => {
			const result = ColorScheme.create('blue');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('blue');
		});

		it('should create green color scheme', () => {
			const result = ColorScheme.create('green');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('green');
		});

		it('should create purple color scheme', () => {
			const result = ColorScheme.create('purple');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('purple');
		});

		it('should create orange color scheme', () => {
			const result = ColorScheme.create('orange');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('orange');
		});

		it('should reject invalid color scheme', () => {
			const result = ColorScheme.create('red');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidUserSettingsError);
		});

		it('should reject empty string', () => {
			const result = ColorScheme.create('');
			expect(result.isError).toBe(true);
		});

		it('should reject uppercase color scheme', () => {
			const result = ColorScheme.create('BLUE');
			expect(result.isError).toBe(true);
		});

		it('should include valid options in error message', () => {
			const result = ColorScheme.create('yellow');
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('blue');
			expect(result.error.message).toContain('green');
		});

		it('should reject numeric string', () => {
			const result = ColorScheme.create('1');
			expect(result.isError).toBe(true);
		});
	});

	describe('equals', () => {
		it('should return true for equal color schemes', () => {
			const c1 = ColorScheme.create('blue').value;
			const c2 = ColorScheme.create('blue').value;
			expect(c1.equals(c2)).toBe(true);
		});

		it('should return false for different color schemes', () => {
			const c1 = ColorScheme.create('blue').value;
			const c2 = ColorScheme.create('purple').value;
			expect(c1.equals(c2)).toBe(false);
		});
	});

	describe('toString', () => {
		it('should return the color scheme string', () => {
			const c = ColorScheme.create('orange').value;
			expect(c.toString()).toBe('orange');
		});
	});
});
