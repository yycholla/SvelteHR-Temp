import { describe, it, expect } from 'vitest';
import { ResourceLink } from './ResourceLink';
import { ResourceLinkValidationError } from '../errors/NotificationErrors';

describe('ResourceLink', () => {
	describe('create()', () => {
		describe('valid links', () => {
			it('should create link with http protocol', () => {
				const result = ResourceLink.create('http://example.com');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('http://example.com');
			});

			it('should create link with https protocol', () => {
				const result = ResourceLink.create('https://example.com');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('https://example.com');
			});

			it('should create link with path', () => {
				const result = ResourceLink.create('https://example.com/tasks/123');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('https://example.com/tasks/123');
			});

			it('should create link with query params', () => {
				const result = ResourceLink.create('https://example.com/tasks?id=123');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('https://example.com/tasks?id=123');
			});

			it('should allow empty string (optional link)', () => {
				const result = ResourceLink.create('');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('');
			});
		});

		describe('trimming', () => {
			it('should trim leading whitespace', () => {
				const result = ResourceLink.create('  https://example.com');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('https://example.com');
			});

			it('should trim trailing whitespace', () => {
				const result = ResourceLink.create('https://example.com  ');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('https://example.com');
			});

			it('should trim both leading and trailing whitespace', () => {
				const result = ResourceLink.create('  https://example.com  ');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('https://example.com');
			});
		});

		describe('validation', () => {
			it('should reject whitespace-only string', () => {
				const result = ResourceLink.create('   ');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(ResourceLinkValidationError);
			});

			it('should reject invalid URL format (no protocol)', () => {
				const result = ResourceLink.create('example.com');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(ResourceLinkValidationError);
				expect(result.error.message).toContain('http');
			});

			it('should reject URL exceeding 500 characters', () => {
				const longUrl = 'https://example.com/' + 'a'.repeat(500);
				const result = ResourceLink.create(longUrl);
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(ResourceLinkValidationError);
				expect(result.error.message).toContain('500');
			});
		});
	});

	describe('equals()', () => {
		it('should return true for same URL value', () => {
			const link1 = ResourceLink.create('https://example.com').value;
			const link2 = ResourceLink.create('https://example.com').value;
			expect(link1.equals(link2)).toBe(true);
		});

		it('should return false for different URL values', () => {
			const link1 = ResourceLink.create('https://example.com').value;
			const link2 = ResourceLink.create('https://other.com').value;
			expect(link1.equals(link2)).toBe(false);
		});
	});

	describe('toString()', () => {
		it('should return the URL value as string', () => {
			const link = ResourceLink.create('https://example.com/task/123').value;
			expect(link.toString()).toBe('https://example.com/task/123');
		});
	});
});
