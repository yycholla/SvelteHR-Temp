// Standardized error handling utilities for consistent error responses
// T055: Error Handling Standardization - CRITICAL

import { type HttpError, error } from '@sveltejs/kit';
import { ZodError } from 'zod';

// Standardized error response interface
export interface StandardErrorResponse {
	type:
		| 'validation'
		| 'authentication'
		| 'authorization'
		| 'not_found'
		| 'server_error'
		| 'network_error'
		| 'graphql_error';
	message: string;
	userMessage: string;
	details?: Record<string, any>;
	statusCode: number;
	timestamp: string;
	requestId?: string;
}

// Common error types and messages
export const ERROR_TYPES = {
	VALIDATION: 'validation',
	AUTHENTICATION: 'authentication',
	AUTHORIZATION: 'authorization',
	NOT_FOUND: 'not_found',
	SERVER_ERROR: 'server_error',
	NETWORK_ERROR: 'network_error',
	GRAPHQL_ERROR: 'graphql_error'
} as const;

export const USER_FRIENDLY_MESSAGES = {
	VALIDATION: 'Please check your input and try again.',
	AUTHENTICATION: 'Please log in to access this page.',
	AUTHORIZATION: "You don't have permission to access this resource.",
	NOT_FOUND: 'The requested resource was not found.',
	SERVER_ERROR: 'Something went wrong on our end. Please try again later.',
	NETWORK_ERROR: 'Unable to connect to the server. Please check your connection.',
	GRAPHQL_ERROR: 'There was a problem loading the data. Please try refreshing the page.'
} as const;

// Error classification function
export function classifyError(error: any): StandardErrorResponse['type'] {
	if (error instanceof ZodError) {
		return ERROR_TYPES.VALIDATION;
	}

	if (error?.status === 401 || error?.message?.toLowerCase().includes('unauthorized')) {
		return ERROR_TYPES.AUTHENTICATION;
	}

	if (error?.status === 403 || error?.message?.toLowerCase().includes('forbidden')) {
		return ERROR_TYPES.AUTHORIZATION;
	}

	if (error?.status === 404 || error?.message?.toLowerCase().includes('not found')) {
		return ERROR_TYPES.NOT_FOUND;
	}

	if (error?.code === 'ECONNREFUSED' || error?.message?.toLowerCase().includes('network')) {
		return ERROR_TYPES.NETWORK_ERROR;
	}

	if (error?.extensions?.code || error?.message?.toLowerCase().includes('graphql')) {
		return ERROR_TYPES.GRAPHQL_ERROR;
	}

	return ERROR_TYPES.SERVER_ERROR;
}

// Create standardized error response
export function createStandardError(
	originalError: any,
	context?: {
		requestId?: string;
		userId?: string;
		path?: string;
		operation?: string;
	}
): StandardErrorResponse {
	const type = classifyError(originalError);
	const timestamp = new Date().toISOString();

	// Extract status code
	let statusCode = 500;
	if (originalError?.status) {
		statusCode = originalError.status;
	} else {
		switch (type) {
			case ERROR_TYPES.VALIDATION:
				statusCode = 400;
				break;
			case ERROR_TYPES.AUTHENTICATION:
				statusCode = 401;
				break;
			case ERROR_TYPES.AUTHORIZATION:
				statusCode = 403;
				break;
			case ERROR_TYPES.NOT_FOUND:
				statusCode = 404;
				break;
			case ERROR_TYPES.NETWORK_ERROR:
				statusCode = 503;
				break;
			default:
				statusCode = 500;
		}
	}

	// Create detailed error information
	const details: Record<string, any> = {
		originalMessage: originalError?.message || 'Unknown error',
		stack: originalError?.stack,
		...context
	};

	// Handle validation errors specially
	if (originalError instanceof ZodError) {
		details.validationErrors = originalError.issues.map((err) => ({
			field: err.path.join('.'),
			message: err.message,
			code: err.code
		}));
	}

	// Handle GraphQL errors
	if (originalError?.extensions) {
		details.graphqlExtensions = originalError.extensions;
	}

	const standardError: StandardErrorResponse = {
		type,
		message: originalError?.message || 'Unknown error occurred',
		userMessage: getUserFriendlyMessage(type, originalError),
		statusCode,
		timestamp,
		details,
		requestId: context?.requestId || generateRequestId()
	};

	// Log error for debugging (exclude sensitive information)
	console.error(`[${timestamp}] ${type.toUpperCase()} Error:`, {
		type,
		message: standardError.message,
		statusCode,
		userId: context?.userId,
		path: context?.path,
		operation: context?.operation,
		requestId: standardError.requestId
	});

	return standardError;
}

// Get user-friendly error message
function getUserFriendlyMessage(type: StandardErrorResponse['type'], originalError: any): string {
	// Check for custom user-friendly message in the original error
	if (originalError?.userMessage) {
		return originalError.userMessage;
	}

	// Handle specific validation errors
	if (type === ERROR_TYPES.VALIDATION && originalError instanceof ZodError) {
		const firstError = originalError.issues[0];
		if (firstError) {
			return `${firstError.path.join(' -> ')}: ${firstError.message}`;
		}
	}

	// Handle specific GraphQL errors
	if (type === ERROR_TYPES.GRAPHQL_ERROR && originalError?.extensions?.code) {
		switch (originalError.extensions.code) {
			case 'UNAUTHENTICATED':
				return USER_FRIENDLY_MESSAGES.AUTHENTICATION;
			case 'FORBIDDEN':
				return USER_FRIENDLY_MESSAGES.AUTHORIZATION;
			case 'NOT_FOUND':
				return USER_FRIENDLY_MESSAGES.NOT_FOUND;
			default:
				return USER_FRIENDLY_MESSAGES.GRAPHQL_ERROR;
		}
	}

	// Return default message based on error type
	switch (type) {
		case ERROR_TYPES.VALIDATION:
			return USER_FRIENDLY_MESSAGES.VALIDATION;
		case ERROR_TYPES.AUTHENTICATION:
			return USER_FRIENDLY_MESSAGES.AUTHENTICATION;
		case ERROR_TYPES.AUTHORIZATION:
			return USER_FRIENDLY_MESSAGES.AUTHORIZATION;
		case ERROR_TYPES.NOT_FOUND:
			return USER_FRIENDLY_MESSAGES.NOT_FOUND;
		case ERROR_TYPES.NETWORK_ERROR:
			return USER_FRIENDLY_MESSAGES.NETWORK_ERROR;
		case ERROR_TYPES.GRAPHQL_ERROR:
			return USER_FRIENDLY_MESSAGES.GRAPHQL_ERROR;
		default:
			return USER_FRIENDLY_MESSAGES.SERVER_ERROR;
	}
}

// Generate unique request ID
function generateRequestId(): string {
	return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// SvelteKit error helper - converts StandardErrorResponse to SvelteKit error
export function throwStandardError(
	originalError: any,
	context?: {
		requestId?: string;
		userId?: string;
		path?: string;
		operation?: string;
	}
): never {
	const standardError = createStandardError(originalError, context);

	// SvelteKit error() expects (status, message) or (status, Error object)
	// We'll pass the user message as a string
	error(standardError.statusCode, standardError.userMessage);
}

// Async error wrapper for load functions
export async function safeServerLoad<T>(
	loadFunction: () => Promise<T>,
	context: {
		userId?: string;
		path: string;
		operation: string;
	}
): Promise<T> {
	try {
		return await loadFunction();
	} catch (err) {
		throwStandardError(err, {
			...context,
			requestId: generateRequestId()
		});
	}
}

// Error boundary wrapper for components
export function createErrorBoundary() {
	let errorState = $state<StandardErrorResponse | null>(null);

	const handleError = (error: any, context?: { operation?: string }) => {
		const standardError = createStandardError(error, context);
		errorState = standardError;
	};

	const clearError = () => {
		errorState = null;
	};

	return {
		get error() {
			return errorState;
		},
		handleError,
		clearError,
		get hasError() {
			return errorState !== null;
		}
	};
}

// Retry mechanism with exponential backoff
export async function withRetry<T>(
	operation: () => Promise<T>,
	options: {
		maxRetries?: number;
		baseDelay?: number;
		maxDelay?: number;
		retryOn?: (error: any) => boolean;
	} = {}
): Promise<T> {
	const {
		maxRetries = 3,
		baseDelay = 1000,
		maxDelay = 10000,
		retryOn = (error) => {
			// Retry on network errors and 5xx server errors
			const type = classifyError(error);
			return type === ERROR_TYPES.NETWORK_ERROR || (error?.status >= 500 && error?.status < 600);
		}
	} = options;

	let lastError: any;

	for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error;

			if (attempt > maxRetries || !retryOn(error)) {
				break;
			}

			// Calculate delay with exponential backoff
			const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);

			console.warn(
				`Operation failed (attempt ${attempt}/${maxRetries + 1}), retrying in ${delay}ms:`,
				error
			);

			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	throw lastError;
}

// GraphQL error extractor
export function extractGraphQLErrors(result: any): StandardErrorResponse[] {
	if (!result?.errors) return [];

	return result.errors.map((gqlError: any) =>
		createStandardError(gqlError, {
			operation: 'GraphQL Query',
			path: result?.data ? 'Partial Success' : 'Query Failed'
		})
	);
}

// Loading state helper for UI components
export function createLoadingState() {
	let loading = $state(false);
	let error = $state<StandardErrorResponse | null>(null);

	const execute = async <T>(operation: () => Promise<T>): Promise<T | null> => {
		loading = true;
		error = null;

		try {
			const result = await operation();
			return result;
		} catch (err) {
			error = createStandardError(err);
			return null;
		} finally {
			loading = false;
		}
	};

	return {
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		execute,
		clearError: () => {
			error = null;
		}
	};
}
