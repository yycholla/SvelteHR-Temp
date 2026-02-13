import { describe, it, expect } from 'vitest';
import { DocumentStatus } from './DocumentStatus';
import { DocumentStatusValidationError } from '../errors/DocumentErrors';

describe('DocumentStatus', () => {
	describe('create()', () => {
		describe('valid statuses', () => {
			it('should create draft status', () => {
				const result = DocumentStatus.create('draft');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('draft');
			});

			it('should create published status', () => {
				const result = DocumentStatus.create('published');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('published');
			});

			it('should create archived status', () => {
				const result = DocumentStatus.create('archived');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('archived');
			});

			it('should create deleted status', () => {
				const result = DocumentStatus.create('deleted');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('deleted');
			});
		});

		describe('normalization', () => {
			it('should normalize uppercase to lowercase', () => {
				const result = DocumentStatus.create('DRAFT');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('draft');
			});

			it('should normalize mixed case to lowercase', () => {
				const result = DocumentStatus.create('PubLisHed');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('published');
			});

			it('should trim leading whitespace', () => {
				const result = DocumentStatus.create('  archived');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('archived');
			});

			it('should trim trailing whitespace', () => {
				const result = DocumentStatus.create('deleted  ');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('deleted');
			});

			it('should trim both leading and trailing whitespace', () => {
				const result = DocumentStatus.create('  draft  ');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('draft');
			});
		});

		describe('validation', () => {
			it('should reject empty string', () => {
				const result = DocumentStatus.create('');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(DocumentStatusValidationError);
				expect(result.error?.message).toContain('cannot be empty');
			});

			it('should reject whitespace-only string', () => {
				const result = DocumentStatus.create('   ');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(DocumentStatusValidationError);
				expect(result.error?.message).toContain('cannot be empty');
			});

			it('should reject invalid status', () => {
				const result = DocumentStatus.create('invalid');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(DocumentStatusValidationError);
				expect(result.error?.message).toContain('Invalid status');
			});

			it('should include valid statuses in error message', () => {
				const result = DocumentStatus.create('unknown');
				expect(result.isError).toBe(true);
				expect(result.error?.message).toContain('draft');
				expect(result.error?.message).toContain('published');
				expect(result.error?.message).toContain('archived');
				expect(result.error?.message).toContain('deleted');
			});
		});
	});

	describe('equals()', () => {
		it('should return true for same status value', () => {
			const status1 = DocumentStatus.create('draft').value!;
			const status2 = DocumentStatus.create('draft').value!;
			expect(status1.equals(status2)).toBe(true);
		});

		it('should return false for different status values', () => {
			const status1 = DocumentStatus.create('draft').value!;
			const status2 = DocumentStatus.create('published').value!;
			expect(status1.equals(status2)).toBe(false);
		});

		it('should be case-insensitive (normalized)', () => {
			const status1 = DocumentStatus.create('DRAFT').value!;
			const status2 = DocumentStatus.create('draft').value!;
			expect(status1.equals(status2)).toBe(true);
		});

		it('should ignore whitespace (normalized)', () => {
			const status1 = DocumentStatus.create('  published  ').value!;
			const status2 = DocumentStatus.create('published').value!;
			expect(status1.equals(status2)).toBe(true);
		});
	});

	describe('status checking methods', () => {
		it('should identify draft status', () => {
			const status = DocumentStatus.create('draft').value!;
			expect(status.isDraft()).toBe(true);
			expect(status.isPublished()).toBe(false);
			expect(status.isArchived()).toBe(false);
			expect(status.isDeleted()).toBe(false);
		});

		it('should identify published status', () => {
			const status = DocumentStatus.create('published').value!;
			expect(status.isPublished()).toBe(true);
			expect(status.isDraft()).toBe(false);
			expect(status.isArchived()).toBe(false);
			expect(status.isDeleted()).toBe(false);
		});

		it('should identify archived status', () => {
			const status = DocumentStatus.create('archived').value!;
			expect(status.isArchived()).toBe(true);
			expect(status.isDraft()).toBe(false);
			expect(status.isPublished()).toBe(false);
			expect(status.isDeleted()).toBe(false);
		});

		it('should identify deleted status', () => {
			const status = DocumentStatus.create('deleted').value!;
			expect(status.isDeleted()).toBe(true);
			expect(status.isDraft()).toBe(false);
			expect(status.isPublished()).toBe(false);
			expect(status.isArchived()).toBe(false);
		});
	});

	describe('toString()', () => {
		it('should return the status value as string', () => {
			const status = DocumentStatus.create('draft').value!;
			expect(status.toString()).toBe('draft');
		});

		it('should return normalized value', () => {
			const status = DocumentStatus.create('PUBLISHED').value!;
			expect(status.toString()).toBe('published');
		});
	});
});
