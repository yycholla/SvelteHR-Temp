import { describe, it, expect } from 'vitest';
import { EventTitle } from './EventTitle';
import { EventTitleValidationError } from '../errors/EventErrors';

describe('EventTitle', () => {
	describe('create()', () => {
		describe('valid titles', () => {
			it('should create title with minimum length (1 character)', () => {
				const result = EventTitle.create('A');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('A');
			});

			it('should create title with typical length', () => {
				const result = EventTitle.create('Team Meeting');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('Team Meeting');
			});

			it('should create title at maximum length (200 characters)', () => {
				const longTitle = 'A'.repeat(200);
				const result = EventTitle.create(longTitle);
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe(longTitle);
			});
		});

		describe('trimming', () => {
			it('should trim leading whitespace', () => {
				const result = EventTitle.create('  Team Meeting');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('Team Meeting');
			});

			it('should trim trailing whitespace', () => {
				const result = EventTitle.create('Team Meeting  ');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('Team Meeting');
			});

			it('should trim both leading and trailing whitespace', () => {
				const result = EventTitle.create('  Team Meeting  ');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('Team Meeting');
			});
		});

		describe('validation', () => {
			it('should reject empty string', () => {
				const result = EventTitle.create('');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(EventTitleValidationError);
				expect(result.error?.message).toContain('cannot be empty');
			});

			it('should reject whitespace-only string', () => {
				const result = EventTitle.create('   ');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(EventTitleValidationError);
				expect(result.error?.message).toContain('cannot be empty');
			});

			it('should reject title exceeding 200 characters', () => {
				const tooLongTitle = 'A'.repeat(201);
				const result = EventTitle.create(tooLongTitle);
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(EventTitleValidationError);
				expect(result.error?.message).toContain('200 characters');
			});

			it('should reject title exceeding 200 characters after trimming', () => {
				const tooLongTitle = '  ' + 'A'.repeat(201) + '  ';
				const result = EventTitle.create(tooLongTitle);
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(EventTitleValidationError);
				expect(result.error?.message).toContain('200 characters');
			});
		});
	});

	describe('equals()', () => {
		it('should return true for same title value', () => {
			const title1 = EventTitle.create('Team Meeting').value!;
			const title2 = EventTitle.create('Team Meeting').value!;
			expect(title1.equals(title2)).toBe(true);
		});

		it('should return false for different title values', () => {
			const title1 = EventTitle.create('Team Meeting').value!;
			const title2 = EventTitle.create('Annual Review').value!;
			expect(title1.equals(title2)).toBe(false);
		});

		it('should be case-sensitive', () => {
			const title1 = EventTitle.create('Team Meeting').value!;
			const title2 = EventTitle.create('team meeting').value!;
			expect(title1.equals(title2)).toBe(false);
		});
	});

	describe('toString()', () => {
		it('should return the title value as string', () => {
			const title = EventTitle.create('Team Meeting').value!;
			expect(title.toString()).toBe('Team Meeting');
		});
	});
});
