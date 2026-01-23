import { describe, it, expect } from 'vitest';
import {
	AppError,
	ValidationError,
	NotFoundError,
	UnauthorizedError,
	ForbiddenError
} from '$lib/utils/errors/AppError';

describe('AppError', () => {
	it('creates error with code and context', () => {
		const error = new AppError('Something failed', 'TEST_ERROR', 500, { userId: '123' });

		expect(error.message).toBe('Something failed');
		expect(error.code).toBe('TEST_ERROR');
		expect(error.context).toEqual({ userId: '123' });
		expect(error.name).toBe('AppError');
	});

	it('creates error without context', () => {
		const error = new AppError('Something failed', 'TEST_ERROR');

		expect(error.message).toBe('Something failed');
		expect(error.code).toBe('TEST_ERROR');
		expect(error.context).toBeUndefined();
		expect(error.name).toBe('AppError');
	});

	it('extends Error properly', () => {
		const error = new AppError('Test error', 'TEST_CODE');

		expect(error).toBeInstanceOf(Error);
		expect(error).toBeInstanceOf(AppError);
		expect(error.stack).toBeDefined();
	});

	it('handles empty context object', () => {
		const error = new AppError('Test', 'TEST_CODE', 500, {});

		expect(error.context).toEqual({});
	});

	it('handles complex context data', () => {
		const error = new AppError('Test', 'TEST_CODE', 500, {
			user: { id: '123', role: 'admin' },
			timestamp: new Date('2025-01-22'),
			nested: { deeply: { value: 42 } }
		});

		expect(error.context).toEqual({
			user: { id: '123', role: 'admin' },
			timestamp: new Date('2025-01-22'),
			nested: { deeply: { value: 42 } }
		});
	});

	it('preserves error message for stack traces', () => {
		const error = new AppError('Critical failure', 'CRITICAL_ERROR');

		expect(error.toString()).toContain('Critical failure');
	});
});

describe('ValidationError', () => {
	it('has VALIDATION_ERROR code', () => {
		const error = new ValidationError('Invalid input', { field: 'email' });

		expect(error.code).toBe('VALIDATION_ERROR');
		expect(error.message).toBe('Invalid input');
		expect(error.context).toEqual({ field: 'email' });
	});

	it('sets correct name', () => {
		const error = new ValidationError('Invalid input');

		expect(error.name).toBe('ValidationError');
	});

	it('extends AppError', () => {
		const error = new ValidationError('Invalid input');

		expect(error).toBeInstanceOf(AppError);
		expect(error).toBeInstanceOf(ValidationError);
	});

	it('creates error without context', () => {
		const error = new ValidationError('Invalid input');

		expect(error.code).toBe('VALIDATION_ERROR');
		expect(error.context).toBeUndefined();
	});

	it('handles validation with multiple fields', () => {
		const error = new ValidationError('Multiple validation errors', {
			fields: ['email', 'password', 'confirmPassword'],
			errors: {
				email: 'Invalid format',
				password: 'Too short',
				confirmPassword: 'Does not match'
			}
		});

		expect(error.context).toEqual({
			fields: ['email', 'password', 'confirmPassword'],
			errors: {
				email: 'Invalid format',
				password: 'Too short',
				confirmPassword: 'Does not match'
			}
		});
	});
});

describe('NotFoundError', () => {
	it('has NOT_FOUND code', () => {
		const error = new NotFoundError('User not found');

		expect(error.code).toBe('NOT_FOUND');
		expect(error.message).toBe('User not found');
	});

	it('sets correct name', () => {
		const error = new NotFoundError('Resource not found');

		expect(error.name).toBe('NotFoundError');
	});

	it('extends AppError', () => {
		const error = new NotFoundError('Not found');

		expect(error).toBeInstanceOf(AppError);
		expect(error).toBeInstanceOf(NotFoundError);
	});

	it('includes resource context', () => {
		const error = new NotFoundError('Employee not found', {
			resourceType: 'employee',
			resourceId: 'emp-123'
		});

		expect(error.context).toEqual({
			resourceType: 'employee',
			resourceId: 'emp-123'
		});
	});
});

describe('UnauthorizedError', () => {
	it('has UNAUTHORIZED code', () => {
		const error = new UnauthorizedError('Not authenticated');

		expect(error.code).toBe('UNAUTHORIZED');
		expect(error.message).toBe('Not authenticated');
	});

	it('sets correct name', () => {
		const error = new UnauthorizedError('Authentication required');

		expect(error.name).toBe('UnauthorizedError');
	});

	it('extends AppError', () => {
		const error = new UnauthorizedError('Unauthorized');

		expect(error).toBeInstanceOf(AppError);
		expect(error).toBeInstanceOf(UnauthorizedError);
	});

	it('includes authentication context', () => {
		const error = new UnauthorizedError('Session expired', {
			reason: 'token_expired',
			expiresAt: new Date('2025-01-22T10:00:00Z')
		});

		expect(error.context).toEqual({
			reason: 'token_expired',
			expiresAt: new Date('2025-01-22T10:00:00Z')
		});
	});
});

describe('ForbiddenError', () => {
	it('has FORBIDDEN code', () => {
		const error = new ForbiddenError('Access denied');

		expect(error.code).toBe('FORBIDDEN');
		expect(error.message).toBe('Access denied');
	});

	it('sets correct name', () => {
		const error = new ForbiddenError('Insufficient permissions');

		expect(error.name).toBe('ForbiddenError');
	});

	it('extends AppError', () => {
		const error = new ForbiddenError('Forbidden');

		expect(error).toBeInstanceOf(AppError);
		expect(error).toBeInstanceOf(ForbiddenError);
	});

	it('includes permission context', () => {
		const error = new ForbiddenError('Insufficient permissions', {
			requiredPermission: 'employees.delete',
			userRole: 'manager',
			resource: 'employee-123'
		});

		expect(error.context).toEqual({
			requiredPermission: 'employees.delete',
			userRole: 'manager',
			resource: 'employee-123'
		});
	});
});

describe('Error Hierarchy', () => {
	it('all error types extend Error', () => {
		const errors = [
			new AppError('Test', 'TEST'),
			new ValidationError('Test'),
			new NotFoundError('Test'),
			new UnauthorizedError('Test'),
			new ForbiddenError('Test')
		];

		errors.forEach((error) => {
			expect(error).toBeInstanceOf(Error);
		});
	});

	it('all typed errors extend AppError', () => {
		const errors = [
			new ValidationError('Test'),
			new NotFoundError('Test'),
			new UnauthorizedError('Test'),
			new ForbiddenError('Test')
		];

		errors.forEach((error) => {
			expect(error).toBeInstanceOf(AppError);
		});
	});

	it('each error type is distinguishable', () => {
		const validation = new ValidationError('Test');
		const notFound = new NotFoundError('Test');
		const unauthorized = new UnauthorizedError('Test');
		const forbidden = new ForbiddenError('Test');

		expect(validation).toBeInstanceOf(ValidationError);
		expect(validation).not.toBeInstanceOf(NotFoundError);

		expect(notFound).toBeInstanceOf(NotFoundError);
		expect(notFound).not.toBeInstanceOf(ValidationError);

		expect(unauthorized).toBeInstanceOf(UnauthorizedError);
		expect(unauthorized).not.toBeInstanceOf(ForbiddenError);

		expect(forbidden).toBeInstanceOf(ForbiddenError);
		expect(forbidden).not.toBeInstanceOf(UnauthorizedError);
	});
});

describe('HTTP Status Codes', () => {
	it('AppError defaults to 500', () => {
		const error = new AppError('Test', 'TEST_CODE');
		expect(error.statusCode).toBe(500);
	});

	it('ValidationError has 400 status code', () => {
		const error = new ValidationError('Invalid input');
		expect(error.statusCode).toBe(400);
	});

	it('UnauthorizedError has 401 status code', () => {
		const error = new UnauthorizedError('Not logged in');
		expect(error.statusCode).toBe(401);
	});

	it('ForbiddenError has 403 status code', () => {
		const error = new ForbiddenError('Access denied');
		expect(error.statusCode).toBe(403);
	});

	it('NotFoundError has 404 status code', () => {
		const error = new NotFoundError('Resource not found');
		expect(error.statusCode).toBe(404);
	});
});
