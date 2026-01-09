import type { ErrorType } from '$lib/types/graphql-contracts';
import { ErrorResponse } from './model';
import type { AppError } from './types';

/**
 * Factory function to create ErrorResponse from various error sources
 */
export function createErrorResponse(
	error: unknown,
	config?: {
		type?: ErrorType;
		userMessage?: string;
		context?: Record<string, unknown>;
		userId?: string;
		correlationId?: string;
	}
): ErrorResponse {
	// Auto-detect error type if not provided
	const type = config?.type || detectErrorType(error);

	return new ErrorResponse({
		type,
		originalError: error,
		userMessage: config?.userMessage,
		context: config?.context,
		userId: config?.userId,
		correlationId: config?.correlationId
	});
}

/**
 * Auto-detect error type from error object
 */
function detectErrorType(error: unknown): ErrorType {
	if (!error) return 'graphql';

	const errorString =
		error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

	if (errorString.includes('timeout') || errorString.includes('timed out')) {
		return 'timeout';
	}

	if (
		errorString.includes('network') ||
		errorString.includes('fetch') ||
		errorString.includes('connection')
	) {
		return 'network';
	}

	if (
		errorString.includes('unauthorized') ||
		errorString.includes('authentication') ||
		errorString.includes('token')
	) {
		return 'authentication';
	}

	if (
		errorString.includes('permission') ||
		errorString.includes('forbidden') ||
		errorString.includes('access denied')
	) {
		return 'permission';
	}

	if (
		errorString.includes('validation') ||
		errorString.includes('invalid') ||
		errorString.includes('required')
	) {
		return 'validation';
	}

	return 'graphql';
}

/**
 * Type guard to check if an object is an ErrorResponse
 */
export function isErrorResponse(obj: unknown): obj is ErrorResponse {
	return obj instanceof ErrorResponse;
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
	return (
		typeof error === 'object' &&
		error !== null &&
		'userMessage' in error &&
		typeof (error as any).userMessage === 'string'
	);
}
