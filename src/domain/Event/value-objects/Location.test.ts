import { describe, it, expect } from 'vitest';
import { Location } from './Location';
import { LocationValidationError } from '../errors/EventErrors';

describe('Location', () => {
	describe('create()', () => {
		describe('valid locations', () => {
			it('should create location with empty string', () => {
				const result = Location.create('');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('');
			});

			it('should create location with typical value', () => {
				const loc = 'Conference Room A, Building 2';
				const result = Location.create(loc);
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe(loc);
			});

			it('should create location at maximum length (500 characters)', () => {
				const longLoc = 'A'.repeat(500);
				const result = Location.create(longLoc);
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe(longLoc);
			});
		});

		describe('trimming', () => {
			it('should trim leading whitespace', () => {
				const result = Location.create('  Conference Room A');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('Conference Room A');
			});

			it('should trim trailing whitespace', () => {
				const result = Location.create('Conference Room A  ');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('Conference Room A');
			});

			it('should trim both leading and trailing whitespace', () => {
				const result = Location.create('  Conference Room A  ');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('Conference Room A');
			});

			it('should allow empty string after trimming whitespace-only input', () => {
				const result = Location.create('   ');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('');
			});
		});

		describe('validation', () => {
			it('should reject location exceeding 500 characters', () => {
				const tooLongLoc = 'A'.repeat(501);
				const result = Location.create(tooLongLoc);
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(LocationValidationError);
				expect(result.error?.message).toContain('500 characters');
			});
		});
	});

	describe('equals()', () => {
		it('should return true for same location value', () => {
			const loc1 = Location.create('Conference Room A').value!;
			const loc2 = Location.create('Conference Room A').value!;
			expect(loc1.equals(loc2)).toBe(true);
		});

		it('should return false for different location values', () => {
			const loc1 = Location.create('Conference Room A').value!;
			const loc2 = Location.create('Conference Room B').value!;
			expect(loc1.equals(loc2)).toBe(false);
		});

		it('should return true for two empty locations', () => {
			const loc1 = Location.create('').value!;
			const loc2 = Location.create('').value!;
			expect(loc1.equals(loc2)).toBe(true);
		});
	});

	describe('toString()', () => {
		it('should return the location value as string', () => {
			const loc = Location.create('Conference Room A').value!;
			expect(loc.toString()).toBe('Conference Room A');
		});

		it('should return empty string for empty location', () => {
			const loc = Location.create('').value!;
			expect(loc.toString()).toBe('');
		});
	});
});
