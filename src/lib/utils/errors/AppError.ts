/**
 * Base application error class with error code, HTTP status code, and context
 *
 * All application errors should extend this class to provide
 * consistent error handling across the application.
 *
 * @example
 * ```typescript
 * throw new AppError('User not found', 'USER_NOT_FOUND', 404, { userId: '123' });
 * ```
 */
export class AppError extends Error {
	/**
	 * Creates a new AppError
	 *
	 * @param message - Human-readable error message
	 * @param code - Machine-readable error code for programmatic handling
	 * @param statusCode - HTTP status code (defaults to 500)
	 * @param context - Optional additional context about the error
	 */
	constructor(
		message: string,
		public readonly code: string,
		public readonly statusCode: number = 500,
		public readonly context?: Record<string, unknown>
	) {
		super(message);
		this.name = 'AppError';
	}
}

/**
 * Validation error for invalid input data
 *
 * Use this when user input or data fails validation rules.
 * Returns HTTP status code 400 (Bad Request).
 *
 * @example
 * ```typescript
 * throw new ValidationError('Invalid email format', { field: 'email', value: 'invalid' });
 * ```
 */
export class ValidationError extends AppError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(message, 'VALIDATION_ERROR', 400, context);
		this.name = 'ValidationError';
	}
}

/**
 * Error for when a requested resource is not found
 *
 * Use this when a database query or resource lookup fails to find data.
 * Returns HTTP status code 404 (Not Found).
 *
 * @example
 * ```typescript
 * throw new NotFoundError('Employee not found', { resourceType: 'employee', resourceId: 'emp-123' });
 * ```
 */
export class NotFoundError extends AppError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(message, 'NOT_FOUND', 404, context);
		this.name = 'NotFoundError';
	}
}

/**
 * Error for authentication failures
 *
 * Use this when a user is not authenticated or their session is invalid.
 * Returns HTTP status code 401 (Unauthorized).
 *
 * @example
 * ```typescript
 * throw new UnauthorizedError('Session expired', { reason: 'token_expired' });
 * ```
 */
export class UnauthorizedError extends AppError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(message, 'UNAUTHORIZED', 401, context);
		this.name = 'UnauthorizedError';
	}
}

/**
 * Error for authorization failures
 *
 * Use this when a user is authenticated but lacks permission for an action.
 * Returns HTTP status code 403 (Forbidden).
 *
 * @example
 * ```typescript
 * throw new ForbiddenError('Insufficient permissions', {
 *   requiredPermission: 'employees.delete',
 *   userRole: 'manager'
 * });
 * ```
 */
export class ForbiddenError extends AppError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(message, 'FORBIDDEN', 403, context);
		this.name = 'ForbiddenError';
	}
}
