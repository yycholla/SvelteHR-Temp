import { describe, it, expect } from 'vitest';
import { ReadStatus } from './ReadStatus';
import { ReadStatusValidationError } from '../errors/NotificationErrors';

describe('ReadStatus', () => {
	describe('create()', () => {
		describe('valid statuses', () => {
			it('should create status "read"', () => {
				const result = ReadStatus.create('read');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('read');
			});

			it('should create status "unread"', () => {
				const result = ReadStatus.create('unread');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('unread');
			});
		});

		describe('normalization', () => {
			it('should normalize uppercase input', () => {
				const result = ReadStatus.create('READ');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('read');
			});

			it('should normalize mixed case input', () => {
				const result = ReadStatus.create('UnReAd');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('unread');
			});

			it('should trim leading whitespace', () => {
				const result = ReadStatus.create('  read');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('read');
			});

			it('should trim trailing whitespace', () => {
				const result = ReadStatus.create('unread  ');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('unread');
			});

			it('should trim both leading and trailing whitespace', () => {
				const result = ReadStatus.create('  read  ');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('read');
			});
		});

		describe('validation', () => {
			it('should reject empty string', () => {
				const result = ReadStatus.create('');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(ReadStatusValidationError);
				expect(result.error.message).toContain('Invalid read status');
			});

			it('should reject whitespace-only string', () => {
				const result = ReadStatus.create('   ');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(ReadStatusValidationError);
			});

			it('should reject invalid status', () => {
				const result = ReadStatus.create('pending');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(ReadStatusValidationError);
				expect(result.error.message).toContain('pending');
			});
		});
	});

	describe('isRead()', () => {
		it('should return true for read status', () => {
			const status = ReadStatus.create('read').value;
			expect(status.isRead()).toBe(true);
		});

		it('should return false for unread status', () => {
			const status = ReadStatus.create('unread').value;
			expect(status.isRead()).toBe(false);
		});
	});

	describe('equals()', () => {
		it('should return true for same status value', () => {
			const status1 = ReadStatus.create('read').value;
			const status2 = ReadStatus.create('read').value;
			expect(status1.equals(status2)).toBe(true);
		});

		it('should return false for different status values', () => {
			const status1 = ReadStatus.create('read').value;
			const status2 = ReadStatus.create('unread').value;
			expect(status1.equals(status2)).toBe(false);
		});

		it('should be case-insensitive in comparison', () => {
			const status1 = ReadStatus.create('read').value;
			const status2 = ReadStatus.create('READ').value;
			expect(status1.equals(status2)).toBe(true);
		});
	});

	describe('toString()', () => {
		it('should return the status value as string', () => {
			const status = ReadStatus.create('unread').value;
			expect(status.toString()).toBe('unread');
		});
	});
});
