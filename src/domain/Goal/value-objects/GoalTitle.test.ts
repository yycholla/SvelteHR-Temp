// src/domain/Goal/value-objects/GoalTitle.test.ts
import { describe, it, expect } from 'vitest';
import { GoalTitle } from './GoalTitle';
import { GoalTitleValidationError } from '../errors/GoalErrors';

describe('GoalTitle', () => {
	describe('create', () => {
		it('creates a GoalTitle with a valid title', () => {
			const result = GoalTitle.create('Complete project documentation');

			expect(result.isOk).toBe(true);
			expect(result.value?.value).toBe('Complete project documentation');
		});

		it('trims whitespace from the title', () => {
			const result = GoalTitle.create('  Increase sales by 20%  ');

			expect(result.isOk).toBe(true);
			expect(result.value?.value).toBe('Increase sales by 20%');
		});

		it('rejects an empty string', () => {
			const result = GoalTitle.create('');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalTitleValidationError);
			expect(result.error?.message).toBe('Goal title cannot be empty');
		});

		it('rejects a whitespace-only string', () => {
			const result = GoalTitle.create('   ');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalTitleValidationError);
			expect(result.error?.message).toBe('Goal title cannot be empty');
		});

		it('accepts a title at minimum length (1 character)', () => {
			const result = GoalTitle.create('A');

			expect(result.isOk).toBe(true);
			expect(result.value?.value).toBe('A');
		});

		it('accepts a title at maximum length (200 characters)', () => {
			const title = 'A'.repeat(200);
			const result = GoalTitle.create(title);

			expect(result.isOk).toBe(true);
			expect(result.value?.value).toBe(title);
			expect(result.value?.length).toBe(200);
		});

		it('rejects a title exceeding maximum length', () => {
			const title = 'A'.repeat(201);
			const result = GoalTitle.create(title);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalTitleValidationError);
			expect(result.error?.message).toBe('Goal title cannot exceed 200 characters');
		});

		it('handles special characters correctly', () => {
			const result = GoalTitle.create('Improve Q4 2025 metrics by 15% 🎯');

			expect(result.isOk).toBe(true);
			expect(result.value?.value).toBe('Improve Q4 2025 metrics by 15% 🎯');
		});

		it('handles Unicode characters correctly', () => {
			const result = GoalTitle.create('实现销售目标');

			expect(result.isOk).toBe(true);
			expect(result.value?.value).toBe('实现销售目标');
		});

		it('handles multi-line titles by preserving newlines', () => {
			const result = GoalTitle.create('Line 1\nLine 2');

			expect(result.isOk).toBe(true);
			expect(result.value?.value).toBe('Line 1\nLine 2');
		});
	});

	describe('value getter', () => {
		it('returns the underlying title value', () => {
			const result = GoalTitle.create('Launch new product line');

			expect(result.value?.value).toBe('Launch new product line');
		});
	});

	describe('length getter', () => {
		it('returns the length of the title', () => {
			const result = GoalTitle.create('Short title');

			expect(result.value?.length).toBe(11);
		});

		it('returns the correct length after trimming', () => {
			const result = GoalTitle.create('  Test  ');

			expect(result.value?.length).toBe(4);
		});
	});

	describe('equals', () => {
		it('returns true for identical titles', () => {
			const title1 = GoalTitle.create('Same title').value!;
			const title2 = GoalTitle.create('Same title').value!;

			expect(title1.equals(title2)).toBe(true);
		});

		it('returns false for different titles', () => {
			const title1 = GoalTitle.create('Title A').value!;
			const title2 = GoalTitle.create('Title B').value!;

			expect(title1.equals(title2)).toBe(false);
		});

		it('is case-sensitive', () => {
			const title1 = GoalTitle.create('Title').value!;
			const title2 = GoalTitle.create('title').value!;

			expect(title1.equals(title2)).toBe(false);
		});
	});

	describe('toString', () => {
		it('returns the title as a string', () => {
			const title = GoalTitle.create('Deploy to production').value!;

			expect(title.toString()).toBe('Deploy to production');
		});
	});
});
