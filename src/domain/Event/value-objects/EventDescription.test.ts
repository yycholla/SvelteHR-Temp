import { describe, it, expect } from 'vitest';
import { EventDescription } from './EventDescription';
import { EventDescriptionValidationError } from '../errors/EventErrors';

describe('EventDescription', () => {
	describe('create()', () => {
		describe('valid descriptions', () => {
			it('should create description with empty string', () => {
				const result = EventDescription.create('');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('');
			});

			it('should create description with typical length', () => {
				const desc = 'This is a team meeting to discuss Q1 objectives and key results.';
				const result = EventDescription.create(desc);
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe(desc);
			});

			it('should create description at maximum length (2000 characters)', () => {
				const longDesc = 'A'.repeat(2000);
				const result = EventDescription.create(longDesc);
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe(longDesc);
			});
		});

		describe('trimming', () => {
			it('should trim leading whitespace', () => {
				const result = EventDescription.create('  Important meeting');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('Important meeting');
			});

			it('should trim trailing whitespace', () => {
				const result = EventDescription.create('Important meeting  ');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('Important meeting');
			});

			it('should trim both leading and trailing whitespace', () => {
				const result = EventDescription.create('  Important meeting  ');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('Important meeting');
			});

			it('should allow empty string after trimming whitespace-only input', () => {
				const result = EventDescription.create('   ');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('');
			});
		});

		describe('validation', () => {
			it('should reject description exceeding 2000 characters', () => {
				const tooLongDesc = 'A'.repeat(2001);
				const result = EventDescription.create(tooLongDesc);
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(EventDescriptionValidationError);
				expect(result.error?.message).toContain('2000 characters');
			});

			it('should reject description exceeding 2000 characters after trimming', () => {
				const tooLongDesc = '  ' + 'A'.repeat(2001) + '  ';
				const result = EventDescription.create(tooLongDesc);
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(EventDescriptionValidationError);
				expect(result.error?.message).toContain('2000 characters');
			});
		});
	});

	describe('equals()', () => {
		it('should return true for same description value', () => {
			const desc1 = EventDescription.create('Important meeting').value!;
			const desc2 = EventDescription.create('Important meeting').value!;
			expect(desc1.equals(desc2)).toBe(true);
		});

		it('should return false for different description values', () => {
			const desc1 = EventDescription.create('Important meeting').value!;
			const desc2 = EventDescription.create('Casual gathering').value!;
			expect(desc1.equals(desc2)).toBe(false);
		});

		it('should return true for two empty descriptions', () => {
			const desc1 = EventDescription.create('').value!;
			const desc2 = EventDescription.create('').value!;
			expect(desc1.equals(desc2)).toBe(true);
		});
	});

	describe('toString()', () => {
		it('should return the description value as string', () => {
			const desc = EventDescription.create('Important meeting').value!;
			expect(desc.toString()).toBe('Important meeting');
		});

		it('should return empty string for empty description', () => {
			const desc = EventDescription.create('').value!;
			expect(desc.toString()).toBe('');
		});
	});
});
