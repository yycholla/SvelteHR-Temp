import { describe, it, expect } from 'vitest';
import { UploadedBy } from './UploadedBy';
import { UploadedByValidationError } from '../errors/DocumentErrors';

describe('UploadedBy', () => {
	describe('create()', () => {
		describe('valid user IDs', () => {
			it('should create with valid UUID', () => {
				const result = UploadedBy.create('550e8400-e29b-41d4-a716-446655440000');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('550e8400-e29b-41d4-a716-446655440000');
			});

			it('should create with lowercase UUID', () => {
				const result = UploadedBy.create('c9bf9e57-1685-4c89-bafb-ff5af830be8a');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('c9bf9e57-1685-4c89-bafb-ff5af830be8a');
			});

			it('should create with uppercase UUID', () => {
				const result = UploadedBy.create('C9BF9E57-1685-4C89-BAFB-FF5AF830BE8A');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('c9bf9e57-1685-4c89-bafb-ff5af830be8a');
			});

			it('should create with mixed case UUID', () => {
				const result = UploadedBy.create('C9BF9e57-1685-4c89-BAFB-ff5aF830BE8A');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('c9bf9e57-1685-4c89-bafb-ff5af830be8a');
			});
		});

		describe('normalization', () => {
			it('should normalize UUID to lowercase', () => {
				const result = UploadedBy.create('550E8400-E29B-41D4-A716-446655440000');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('550e8400-e29b-41d4-a716-446655440000');
			});

			it('should trim leading whitespace', () => {
				const result = UploadedBy.create('  550e8400-e29b-41d4-a716-446655440000');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('550e8400-e29b-41d4-a716-446655440000');
			});

			it('should trim trailing whitespace', () => {
				const result = UploadedBy.create('550e8400-e29b-41d4-a716-446655440000  ');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('550e8400-e29b-41d4-a716-446655440000');
			});

			it('should trim both leading and trailing whitespace', () => {
				const result = UploadedBy.create('  550e8400-e29b-41d4-a716-446655440000  ');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('550e8400-e29b-41d4-a716-446655440000');
			});
		});

		describe('validation', () => {
			it('should reject empty string', () => {
				const result = UploadedBy.create('');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(UploadedByValidationError);
				expect(result.error?.message).toContain('cannot be empty');
			});

			it('should reject whitespace-only string', () => {
				const result = UploadedBy.create('   ');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(UploadedByValidationError);
				expect(result.error?.message).toContain('cannot be empty');
			});

			it('should reject invalid UUID format (no hyphens)', () => {
				const result = UploadedBy.create('550e8400e29b41d4a716446655440000');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(UploadedByValidationError);
				expect(result.error?.message).toContain('Invalid UUID format');
			});

			it('should reject UUID with wrong number of segments', () => {
				const result = UploadedBy.create('550e8400-e29b-41d4-446655440000');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(UploadedByValidationError);
			});

			it('should reject UUID with invalid characters', () => {
				const result = UploadedBy.create('550e8400-e29b-41d4-a716-44665544000g');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(UploadedByValidationError);
			});

			it('should reject UUID with wrong segment lengths', () => {
				const result = UploadedBy.create('550e840-e29b-41d4-a716-446655440000');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(UploadedByValidationError);
			});

			it('should reject random string', () => {
				const result = UploadedBy.create('not-a-uuid');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(UploadedByValidationError);
			});

			it('should reject numeric string', () => {
				const result = UploadedBy.create('12345');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(UploadedByValidationError);
			});
		});
	});

	describe('equals()', () => {
		it('should return true for same UUID', () => {
			const id1 = UploadedBy.create('550e8400-e29b-41d4-a716-446655440000').value!;
			const id2 = UploadedBy.create('550e8400-e29b-41d4-a716-446655440000').value!;
			expect(id1.equals(id2)).toBe(true);
		});

		it('should return false for different UUIDs', () => {
			const id1 = UploadedBy.create('550e8400-e29b-41d4-a716-446655440000').value!;
			const id2 = UploadedBy.create('c9bf9e57-1685-4c89-bafb-ff5af830be8a').value!;
			expect(id1.equals(id2)).toBe(false);
		});

		it('should be case-insensitive (normalized)', () => {
			const id1 = UploadedBy.create('550E8400-E29B-41D4-A716-446655440000').value!;
			const id2 = UploadedBy.create('550e8400-e29b-41d4-a716-446655440000').value!;
			expect(id1.equals(id2)).toBe(true);
		});

		it('should ignore whitespace (normalized)', () => {
			const id1 = UploadedBy.create('  550e8400-e29b-41d4-a716-446655440000  ').value!;
			const id2 = UploadedBy.create('550e8400-e29b-41d4-a716-446655440000').value!;
			expect(id1.equals(id2)).toBe(true);
		});
	});

	describe('toString()', () => {
		it('should return the UUID as string', () => {
			const id = UploadedBy.create('550e8400-e29b-41d4-a716-446655440000').value!;
			expect(id.toString()).toBe('550e8400-e29b-41d4-a716-446655440000');
		});

		it('should return normalized (lowercase) UUID', () => {
			const id = UploadedBy.create('550E8400-E29B-41D4-A716-446655440000').value!;
			expect(id.toString()).toBe('550e8400-e29b-41d4-a716-446655440000');
		});
	});
});
