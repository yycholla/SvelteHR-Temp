import { describe, expect, it } from 'vitest';
import { ContentType } from './ContentType';
import { InvalidTrainingError } from '../errors/TrainingErrors';

describe('ContentType', () => {
	describe('create', () => {
		it('returns Ok with text content type', () => {
			const result = ContentType.create('text');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('text');
		});

		it('returns Ok with video content type', () => {
			const result = ContentType.create('video');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('video');
		});

		it('returns Ok with quiz content type', () => {
			const result = ContentType.create('quiz');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('quiz');
		});

		it('returns Ok with document content type', () => {
			const result = ContentType.create('document');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('document');
		});

		it('returns Ok with interactive content type', () => {
			const result = ContentType.create('interactive');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('interactive');
		});

		it('returns InvalidTrainingError for empty string', () => {
			const result = ContentType.create('');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
		});

		it('returns InvalidTrainingError for unknown type', () => {
			const result = ContentType.create('audio');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
			expect(result.error.message).toContain('audio');
		});

		it('is case-sensitive - uppercase is invalid', () => {
			const result = ContentType.create('TEXT');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
		});

		it('is case-sensitive - mixed case is invalid', () => {
			const result = ContentType.create('Video');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
		});

		it('returns InvalidTrainingError for whitespace-only string', () => {
			const result = ContentType.create('   ');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
		});

		it('includes valid options in error message', () => {
			const result = ContentType.create('unknown');

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('text');
			expect(result.error.message).toContain('video');
		});

		it('returns InvalidTrainingError has correct error code', () => {
			const result = ContentType.create('invalid');

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_TRAINING');
		});

		it('returns InvalidTrainingError for numeric string', () => {
			const result = ContentType.create('1');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
		});
	});

	describe('equals', () => {
		it('returns true for same content type', () => {
			const type1 = ContentType.create('video').value;
			const type2 = ContentType.create('video').value;

			expect(type1.equals(type2)).toBe(true);
		});

		it('returns false for different content types', () => {
			const type1 = ContentType.create('text').value;
			const type2 = ContentType.create('quiz').value;

			expect(type1.equals(type2)).toBe(false);
		});

		it('returns false for document vs interactive', () => {
			const type1 = ContentType.create('document').value;
			const type2 = ContentType.create('interactive').value;

			expect(type1.equals(type2)).toBe(false);
		});
	});

	describe('toString', () => {
		it('returns the string value', () => {
			const type = ContentType.create('quiz').value;

			expect(type.toString()).toBe('quiz');
		});

		it('returns video string', () => {
			const type = ContentType.create('video').value;

			expect(type.toString()).toBe('video');
		});
	});

	describe('value', () => {
		it('returns the ContentTypeValue', () => {
			const type = ContentType.create('interactive').value;

			expect(type.value).toBe('interactive');
		});
	});
});
