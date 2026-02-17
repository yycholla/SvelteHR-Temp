import { describe, expect, it } from 'vitest';
import { TrainingTitle } from './TrainingTitle';
import { InvalidTrainingError } from '../errors/TrainingErrors';

describe('TrainingTitle', () => {
	describe('create', () => {
		it('returns Ok with a valid title', () => {
			const result = TrainingTitle.create('Introduction to Safety');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('Introduction to Safety');
		});

		it('trims leading and trailing whitespace', () => {
			const result = TrainingTitle.create('  Compliance Training  ');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('Compliance Training');
		});

		it('accepts a single character title', () => {
			const result = TrainingTitle.create('A');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('A');
		});

		it('accepts a title at exactly 200 characters', () => {
			const title = 'A'.repeat(200);
			const result = TrainingTitle.create(title);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(title);
		});

		it('returns InvalidTrainingError for empty string', () => {
			const result = TrainingTitle.create('');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
			expect(result.error.message).toContain('cannot be empty');
		});

		it('returns InvalidTrainingError for whitespace-only string', () => {
			const result = TrainingTitle.create('   ');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
			expect(result.error.message).toContain('cannot be empty');
		});

		it('returns InvalidTrainingError for title exceeding 200 characters', () => {
			const title = 'A'.repeat(201);
			const result = TrainingTitle.create(title);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
			expect(result.error.message).toContain('cannot exceed 200 characters');
		});

		it('includes actual length in error message for oversized title', () => {
			const title = 'B'.repeat(250);
			const result = TrainingTitle.create(title);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('250');
		});

		it('returns InvalidTrainingError has correct error code', () => {
			const result = TrainingTitle.create('');

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_TRAINING');
		});

		it('accepts title with special characters', () => {
			const result = TrainingTitle.create('Safety & Health: Part 1 (2025)');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('Safety & Health: Part 1 (2025)');
		});

		it('accepts title with numbers', () => {
			const result = TrainingTitle.create('Module 42');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('Module 42');
		});
	});

	describe('equals', () => {
		it('returns true for titles with same value', () => {
			const title1 = TrainingTitle.create('Leadership Training').value;
			const title2 = TrainingTitle.create('Leadership Training').value;

			expect(title1.equals(title2)).toBe(true);
		});

		it('returns false for titles with different values', () => {
			const title1 = TrainingTitle.create('Safety Training').value;
			const title2 = TrainingTitle.create('Compliance Training').value;

			expect(title1.equals(title2)).toBe(false);
		});

		it('is case-sensitive', () => {
			const title1 = TrainingTitle.create('fire safety').value;
			const title2 = TrainingTitle.create('Fire Safety').value;

			expect(title1.equals(title2)).toBe(false);
		});
	});

	describe('toString', () => {
		it('returns the string value', () => {
			const title = TrainingTitle.create('Onboarding Basics').value;

			expect(title.toString()).toBe('Onboarding Basics');
		});
	});

	describe('value', () => {
		it('returns the trimmed string value', () => {
			const title = TrainingTitle.create('  Tech Skills  ').value;

			expect(title.value).toBe('Tech Skills');
		});
	});
});
