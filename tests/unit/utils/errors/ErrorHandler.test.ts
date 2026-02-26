import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorHandler } from '$lib/utils/errors/ErrorHandler';
import {
	AppError,
	ValidationError,
	NotFoundError,
	UnauthorizedError,
	ForbiddenError
} from '$lib/utils/errors/AppError';
import { logger } from '$lib/utils/logger';

vi.mock('$lib/utils/logger', () => ({
	logger: {
		error: vi.fn(),
		warn: vi.fn(),
		info: vi.fn()
	}
}));

describe('ErrorHandler', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('handle', () => {
		it('logs AppError with code and context', () => {
			const error = new ValidationError('Invalid email', { field: 'email' });

			ErrorHandler.handle(error);

			expect(logger.error).toHaveBeenCalledWith(
				'Invalid email',
				error,
				expect.objectContaining({
					code: 'VALIDATION_ERROR',
					context: { field: 'email' }
				})
			);
		});

		it('logs generic Error without code', () => {
			const error = new Error('Something broke');

			ErrorHandler.handle(error);

			expect(logger.error).toHaveBeenCalledWith('Unexpected error', error);
		});

		it('logs AppError without context', () => {
			const error = new AppError('Test error', 'TEST_CODE');

			ErrorHandler.handle(error);

			expect(logger.error).toHaveBeenCalledWith(
				'Test error',
				error,
				expect.objectContaining({
					code: 'TEST_CODE',
					context: undefined
				})
			);
		});

		it('logs all typed errors correctly', () => {
			const errors = [
				new ValidationError('Validation failed', { field: 'email' }),
				new NotFoundError('Resource not found', { id: '123' }),
				new UnauthorizedError('Not authenticated', { reason: 'expired' }),
				new ForbiddenError('Access denied', { permission: 'delete' })
			];

			errors.forEach((error) => {
				vi.clearAllMocks();
				ErrorHandler.handle(error);

				expect(logger.error).toHaveBeenCalledWith(
					error.message,
					error,
					expect.objectContaining({
						code: error.code,
						context: error.context
					})
				);
			});
		});

		it('handles errors with complex context', () => {
			const error = new AppError('Complex error', 'COMPLEX', 500, {
				user: { id: '123', role: 'admin' },
				timestamp: new Date('2025-01-22'),
				metadata: { nested: { value: 42 } }
			});

			ErrorHandler.handle(error);

			expect(logger.error).toHaveBeenCalledWith(
				'Complex error',
				error,
				expect.objectContaining({
					code: 'COMPLEX',
					context: {
						user: { id: '123', role: 'admin' },
						timestamp: new Date('2025-01-22'),
						metadata: { nested: { value: 42 } }
					}
				})
			);
		});

		it('handles null and undefined errors gracefully', () => {
			const nullError = null as unknown as Error;
			const undefinedError = undefined as unknown as Error;

			// These should not throw, though behavior is implementation-specific
			expect(() => ErrorHandler.handle(nullError)).not.toThrow();
			expect(() => ErrorHandler.handle(undefinedError)).not.toThrow();
		});
	});

	describe('isAppError', () => {
		it('returns true for AppError instances', () => {
			const error = new AppError('Test', 'TEST_CODE');

			expect(ErrorHandler.isAppError(error)).toBe(true);
		});

		it('returns true for all typed error subclasses', () => {
			const errors = [
				new ValidationError('Test'),
				new NotFoundError('Test'),
				new UnauthorizedError('Test'),
				new ForbiddenError('Test')
			];

			errors.forEach((error) => {
				expect(ErrorHandler.isAppError(error)).toBe(true);
			});
		});

		it('returns false for generic Error', () => {
			const error = new Error('Test');

			expect(ErrorHandler.isAppError(error)).toBe(false);
		});

		it('returns false for Error-like objects without code', () => {
			const errorLike = {
				message: 'Test',
				name: 'Error',
				context: { some: 'data' }
			} as Error;

			expect(ErrorHandler.isAppError(errorLike)).toBe(false);
		});

		it('returns false for Error-like objects without context property', () => {
			const errorLike = {
				message: 'Test',
				name: 'Error',
				code: 'SOME_CODE'
			} as Error;

			expect(ErrorHandler.isAppError(errorLike)).toBe(false);
		});

		it('returns true for objects with both code and context', () => {
			const errorLike = {
				message: 'Test',
				name: 'CustomError',
				code: 'CUSTOM',
				context: { data: 'value' }
			} as Error;

			expect(ErrorHandler.isAppError(errorLike)).toBe(true);
		});
	});

	describe('toUserMessage', () => {
		it('returns AppError message for known errors', () => {
			const error = new ValidationError('Invalid email');

			expect(ErrorHandler.toUserMessage(error)).toBe('Invalid email');
		});

		it('returns generic message for unknown errors', () => {
			const error = new Error('Stack trace here');

			expect(ErrorHandler.toUserMessage(error)).toBe(
				'An unexpected error occurred. Please try again.'
			);
		});

		it('returns message for all typed errors', () => {
			const errors = [
				new ValidationError('Validation failed'),
				new NotFoundError('Resource not found'),
				new UnauthorizedError('Not authenticated'),
				new ForbiddenError('Access denied')
			];

			errors.forEach((error) => {
				expect(ErrorHandler.toUserMessage(error)).toBe(error.message);
			});
		});

		it('returns generic message for empty error message', () => {
			const error = new Error('');

			expect(ErrorHandler.toUserMessage(error)).toBe(
				'An unexpected error occurred. Please try again.'
			);
		});

		it('returns AppError message even with sensitive details in context', () => {
			const error = new ValidationError('Invalid input', {
				internalError: 'SQL constraint violation on users.email',
				stack: 'sensitive stack trace'
			});

			// Should only expose the user-friendly message, not context
			expect(ErrorHandler.toUserMessage(error)).toBe('Invalid input');
		});

		it('handles null and undefined errors', () => {
			const nullError = null as unknown as Error;
			const undefinedError = undefined as unknown as Error;

			expect(ErrorHandler.toUserMessage(nullError)).toBe(
				'An unexpected error occurred. Please try again.'
			);
			expect(ErrorHandler.toUserMessage(undefinedError)).toBe(
				'An unexpected error occurred. Please try again.'
			);
		});
	});

	describe('Edge Cases', () => {
		it('handles errors with circular references in context', () => {
			const circular: Record<string, unknown> = { name: 'test' };
			circular.self = circular;

			const error = new AppError('Circular reference', 'CIRCULAR', 500, circular);

			// Should not throw when handling
			expect(() => ErrorHandler.handle(error)).not.toThrow();
		});

		it('handles AppError with undefined code', () => {
			const error = {
				message: 'Test',
				name: 'AppError',
				code: undefined,
				context: {}
			} as unknown as AppError;

			expect(ErrorHandler.isAppError(error)).toBe(true);
		});

		it('handles very long error messages', () => {
			const longMessage = 'A'.repeat(10000);
			const error = new ValidationError(longMessage);

			expect(ErrorHandler.toUserMessage(error)).toBe(longMessage);
		});

		it('handles errors with special characters in message', () => {
			const specialMessage = 'Error: <script>alert("xss")</script> \n\t\r';
			const error = new ValidationError(specialMessage);

			expect(ErrorHandler.toUserMessage(error)).toBe(specialMessage);
		});
	});

	describe('Type Safety', () => {
		it('correctly narrows type with isAppError type guard', () => {
			const error: Error | AppError = new ValidationError('Test');

			if (ErrorHandler.isAppError(error)) {
				// TypeScript should allow accessing code and context
				expect(error.code).toBe('VALIDATION_ERROR');
				expect(error.context).toBeUndefined();
			}
		});

		it('type guard works in filter operations', () => {
			const errors: Error[] = [
				new Error('Generic'),
				new ValidationError('Validation'),
				new Error('Another generic'),
				new NotFoundError('Not found')
			];

			const appErrors = errors.filter(ErrorHandler.isAppError);

			expect(appErrors).toHaveLength(2);
			appErrors.forEach((error) => {
				expect(error).toHaveProperty('code');
				expect(error).toHaveProperty('context');
			});
		});
	});

	describe('toHttpStatus', () => {
		it('returns status code from AppError', () => {
			const error = new ValidationError('Invalid input');
			expect(ErrorHandler.toHttpStatus(error)).toBe(400);
		});

		it('returns 500 for generic Error', () => {
			const error = new Error('Something broke');
			expect(ErrorHandler.toHttpStatus(error)).toBe(500);
		});

		it('returns 401 for UnauthorizedError', () => {
			const error = new UnauthorizedError('Not authenticated');
			expect(ErrorHandler.toHttpStatus(error)).toBe(401);
		});

		it('returns 403 for ForbiddenError', () => {
			const error = new ForbiddenError('Access denied');
			expect(ErrorHandler.toHttpStatus(error)).toBe(403);
		});

		it('returns 404 for NotFoundError', () => {
			const error = new NotFoundError('Resource not found');
			expect(ErrorHandler.toHttpStatus(error)).toBe(404);
		});

		it('returns 500 for base AppError', () => {
			const error = new AppError('Internal error', 'INTERNAL');
			expect(ErrorHandler.toHttpStatus(error)).toBe(500);
		});
	});
});
