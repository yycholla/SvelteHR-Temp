// src/domain/UserSettings/value-objects/FontSize.test.ts
import { describe, it, expect } from 'vitest';
import { FontSize } from './FontSize';
import { InvalidUserSettingsError } from '../errors/UserSettingsErrors';

describe('FontSize', () => {
	describe('create', () => {
		it('should create small font size', () => {
			const result = FontSize.create('small');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('small');
		});

		it('should create medium font size', () => {
			const result = FontSize.create('medium');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('medium');
		});

		it('should create large font size', () => {
			const result = FontSize.create('large');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('large');
		});

		it('should reject invalid font size', () => {
			const result = FontSize.create('extra-large');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidUserSettingsError);
		});

		it('should reject empty string', () => {
			const result = FontSize.create('');
			expect(result.isError).toBe(true);
		});

		it('should reject uppercase font size', () => {
			const result = FontSize.create('MEDIUM');
			expect(result.isError).toBe(true);
		});

		it('should include valid options in error message', () => {
			const result = FontSize.create('huge');
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('small');
			expect(result.error.message).toContain('medium');
			expect(result.error.message).toContain('large');
		});

		it('should reject numeric values', () => {
			const result = FontSize.create('12' as string);
			expect(result.isError).toBe(true);
		});
	});

	describe('equals', () => {
		it('should return true for equal font sizes', () => {
			const f1 = FontSize.create('medium').value;
			const f2 = FontSize.create('medium').value;
			expect(f1.equals(f2)).toBe(true);
		});

		it('should return false for different font sizes', () => {
			const f1 = FontSize.create('small').value;
			const f2 = FontSize.create('large').value;
			expect(f1.equals(f2)).toBe(false);
		});
	});

	describe('toString', () => {
		it('should return the font size string', () => {
			const f = FontSize.create('large').value;
			expect(f.toString()).toBe('large');
		});
	});
});
