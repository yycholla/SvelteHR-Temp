import { describe, it, expect } from 'vitest';
import { EventColor } from './EventColor';
import { EventColorValidationError } from '../errors/EventErrors';

describe('EventColor', () => {
	describe('create()', () => {
		describe('3-digit hex colors', () => {
			it('should accept 3-digit hex with # prefix', () => {
				const result = EventColor.create('#f00');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('#FF0000');
			});

			it('should accept 3-digit hex without # prefix', () => {
				const result = EventColor.create('f00');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('#FF0000');
			});

			it('should expand 3-digit hex to 6-digit', () => {
				const result = EventColor.create('#abc');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('#AABBCC');
			});

			it('should handle lowercase 3-digit hex', () => {
				const result = EventColor.create('f5a');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('#FF55AA');
			});
		});

		describe('6-digit hex colors', () => {
			it('should accept 6-digit hex with # prefix', () => {
				const result = EventColor.create('#ff0000');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('#FF0000');
			});

			it('should accept 6-digit hex without # prefix', () => {
				const result = EventColor.create('ff0000');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('#FF0000');
			});

			it('should normalize to uppercase', () => {
				const result = EventColor.create('#abc123');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('#ABC123');
			});

			it('should handle mixed case', () => {
				const result = EventColor.create('AbC123');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('#ABC123');
			});
		});

		describe('validation', () => {
			it('should reject invalid length (not 3 or 6)', () => {
				const result = EventColor.create('#ff00');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(EventColorValidationError);
				expect(result.error?.message).toContain('Invalid color format');
			});

			it('should reject non-hex characters', () => {
				const result = EventColor.create('#gghhii');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(EventColorValidationError);
			});

			it('should reject empty string', () => {
				const result = EventColor.create('');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(EventColorValidationError);
			});

			it('should reject special characters', () => {
				const result = EventColor.create('#ff00$$');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(EventColorValidationError);
			});
		});
	});

	describe('equals()', () => {
		it('should return true for same color value', () => {
			const color1 = EventColor.create('#ff0000').value!;
			const color2 = EventColor.create('ff0000').value!;
			expect(color1.equals(color2)).toBe(true);
		});

		it('should return true for expanded 3-digit matching 6-digit', () => {
			const color1 = EventColor.create('#f00').value!;
			const color2 = EventColor.create('#FF0000').value!;
			expect(color1.equals(color2)).toBe(true);
		});

		it('should return false for different colors', () => {
			const color1 = EventColor.create('#ff0000').value!;
			const color2 = EventColor.create('#00ff00').value!;
			expect(color1.equals(color2)).toBe(false);
		});
	});

	describe('toString()', () => {
		it('should return normalized hex color', () => {
			const color = EventColor.create('ff0000').value!;
			expect(color.toString()).toBe('#FF0000');
		});

		it('should return expanded 3-digit as 6-digit', () => {
			const color = EventColor.create('f00').value!;
			expect(color.toString()).toBe('#FF0000');
		});
	});
});
