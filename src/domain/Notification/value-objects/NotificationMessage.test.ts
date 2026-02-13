import { describe, it, expect } from 'vitest';
import { NotificationMessage } from './NotificationMessage';
import { NotificationMessageValidationError } from '../errors/NotificationErrors';

describe('NotificationMessage', () => {
	describe('create()', () => {
		describe('valid messages', () => {
			it('should create message with minimum length (1 character)', () => {
				const result = NotificationMessage.create('A');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('A');
			});

			it('should create message with typical length', () => {
				const result = NotificationMessage.create('You have been assigned a new task');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('You have been assigned a new task');
			});

			it('should create message at maximum length (1000 characters)', () => {
				const longMessage = 'A'.repeat(1000);
				const result = NotificationMessage.create(longMessage);
				expect(result.isOk).toBe(true);
				expect(result.value.length).toBe(1000);
			});
		});

		describe('trimming', () => {
			it('should trim leading whitespace', () => {
				const result = NotificationMessage.create('  Your leave request has been approved');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('Your leave request has been approved');
			});

			it('should trim trailing whitespace', () => {
				const result = NotificationMessage.create('Your leave request has been approved  ');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('Your leave request has been approved');
			});

			it('should trim both leading and trailing whitespace', () => {
				const result = NotificationMessage.create('  Your leave request has been approved  ');
				expect(result.isOk).toBe(true);
				expect(result.value.toString()).toBe('Your leave request has been approved');
			});
		});

		describe('validation', () => {
			it('should reject empty string', () => {
				const result = NotificationMessage.create('');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationMessageValidationError);
				expect(result.error.message).toContain('cannot be empty');
			});

			it('should reject whitespace-only string', () => {
				const result = NotificationMessage.create('   ');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationMessageValidationError);
			});

			it('should reject message exceeding 1000 characters', () => {
				const longMessage = 'A'.repeat(1001);
				const result = NotificationMessage.create(longMessage);
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationMessageValidationError);
				expect(result.error.message).toContain('1000');
			});

			it('should reject message exceeding 1000 characters after trimming', () => {
				const longMessage = '  ' + 'A'.repeat(1001) + '  ';
				const result = NotificationMessage.create(longMessage);
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationMessageValidationError);
			});
		});
	});

	describe('equals()', () => {
		it('should return true for same message value', () => {
			const message1 = NotificationMessage.create('Task assigned').value;
			const message2 = NotificationMessage.create('Task assigned').value;
			expect(message1.equals(message2)).toBe(true);
		});

		it('should return false for different message values', () => {
			const message1 = NotificationMessage.create('Task assigned').value;
			const message2 = NotificationMessage.create('Leave approved').value;
			expect(message1.equals(message2)).toBe(false);
		});

		it('should be case-sensitive', () => {
			const message1 = NotificationMessage.create('Task Assigned').value;
			const message2 = NotificationMessage.create('task assigned').value;
			expect(message1.equals(message2)).toBe(false);
		});
	});

	describe('toString()', () => {
		it('should return the message value as string', () => {
			const message = NotificationMessage.create('Task assigned').value;
			expect(message.toString()).toBe('Task assigned');
		});
	});
});
