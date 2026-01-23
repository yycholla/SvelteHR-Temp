import { logger } from '../logger';
import type { AppError } from './AppError';

/**
 * Centralized error handling and logging
 *
 * Provides utilities for handling errors consistently across the application,
 * including logging, type checking, and user-friendly message conversion.
 *
 * @example
 * ```typescript
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   ErrorHandler.handle(error);
 *   const message = ErrorHandler.toUserMessage(error);
 *   return fail(400, { message });
 * }
 * ```
 */
export class ErrorHandler {
	/**
	 * Handles an error by logging it with appropriate context
	 *
	 * AppError instances are logged with their code and context.
	 * Generic errors are logged as unexpected errors.
	 *
	 * @param error - The error to handle
	 */
	static handle(error: Error | AppError): void {
		// Handle null/undefined errors gracefully
		if (!error) {
			logger.error('Unexpected error', new Error('Null or undefined error'));
			return;
		}

		if (this.isAppError(error)) {
			logger.error(error.message, error, {
				code: error.code,
				context: error.context
			});
		} else {
			logger.error('Unexpected error', error);
		}
	}

	/**
	 * Type guard to check if an error is an AppError
	 *
	 * Checks for the presence of both 'code' and 'context' properties
	 * that are unique to AppError instances.
	 *
	 * @param error - The error to check
	 * @returns True if the error is an AppError or its subclass
	 */
	static isAppError(error: Error): error is AppError {
		return 'code' in error && 'context' in error;
	}

	/**
	 * Converts an error to a user-friendly message
	 *
	 * AppError instances return their message (which should be user-friendly).
	 * Generic errors return a safe default message to avoid exposing internals.
	 *
	 * @param error - The error to convert
	 * @returns A user-friendly error message
	 */
	static toUserMessage(error: Error | AppError): string {
		// Handle null/undefined errors
		if (!error) {
			return 'An unexpected error occurred. Please try again.';
		}

		if (this.isAppError(error)) {
			return error.message;
		}

		return 'An unexpected error occurred. Please try again.';
	}

	/**
	 * Converts an error to an HTTP status code
	 *
	 * AppError instances return their statusCode property.
	 * Generic errors return 500 (Internal Server Error).
	 *
	 * This is useful for SvelteKit endpoints that need to return
	 * appropriate HTTP status codes without manual mapping.
	 *
	 * @param error - The error to convert
	 * @returns The HTTP status code
	 *
	 * @example
	 * ```typescript
	 * try {
	 *   await operation();
	 * } catch (error) {
	 *   const status = ErrorHandler.toHttpStatus(error);
	 *   const message = ErrorHandler.toUserMessage(error);
	 *   return fail(status, { message });
	 * }
	 * ```
	 */
	static toHttpStatus(error: Error | AppError): number {
		if (this.isAppError(error)) {
			return error.statusCode;
		}
		return 500; // Internal server error for unknown errors
	}
}
