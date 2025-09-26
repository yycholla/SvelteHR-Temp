/**
 * GraphQL Error Handling Utilities
 * SvelteHR GraphQL Integration Error Resolution
 *
 * Standardized error processing, classification, and user message generation
 * for all GraphQL operations across the application.
 *
 * Features:
 * - Error classification and severity determination
 * - User-friendly message generation
 * - Suggested action recommendations
 * - Retry logic integration
 * - Development/production error handling
 */

import type {
	ErrorResponse,
	ErrorType,
	ErrorSeverity,
	ActionOption,
	GraphQLErrorCode
} from '$lib/types/graphql-contracts';
import { GRAPHQL_ERROR_CODES, GRAPHQL_OPERATION_CONSTANTS } from '$lib/types/graphql-contracts';

// =============================================================================
// Error ID Generation
// =============================================================================

function generateErrorId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substr(2, 5);
	return `err_${timestamp}_${random}`;
}

// =============================================================================
// Error Classification
// =============================================================================

export function classifyError(error: any): ErrorType {
	// Network errors (offline, connection failed, etc.)
	if (error.networkError || error.name === 'NetworkError') {
		return 'network';
	}

	// Timeout errors
	if (error.message?.includes('timeout') || error.code === 'TIMEOUT') {
		return 'timeout';
	}

	// GraphQL errors with specific codes
	if (error.graphQLErrors?.length > 0) {
		const graphQLError = error.graphQLErrors[0];
		const errorCode = graphQLError.extensions?.code;

		switch (errorCode) {
			case 'UNAUTHENTICATED':
			case 'JWT_INVALID':
			case 'TOKEN_EXPIRED':
				return 'authentication';

			case 'FORBIDDEN':
			case 'UNAUTHORIZED':
			case 'PERMISSION_DENIED':
				return 'permission';

			case 'VALIDATION_FAILED':
			case 'BAD_USER_INPUT':
				return 'validation';

			default:
				return 'graphql';
		}
	}

	// Server errors (5xx)
	if (error.response?.status >= 500) {
		return 'graphql';
	}

	// Default fallback
	return 'graphql';
}

// =============================================================================
// Error Severity Determination
// =============================================================================

export function determineSeverity(error: any): ErrorSeverity {
	const errorType = classifyError(error);

	switch (errorType) {
		case 'authentication':
			return 'high'; // Blocks user access

		case 'permission':
			return 'medium'; // User can continue with limited access

		case 'network':
		case 'timeout':
			return 'high'; // Prevents data loading

		case 'validation':
			return 'low'; // User input issue, easily correctable

		case 'graphql':
		default:
			// Check for specific server errors
			if (error.response?.status >= 500) {
				return 'critical'; // Server-side issue
			}
			return 'medium'; // General GraphQL error
	}
}

// =============================================================================
// Retry Logic
// =============================================================================

export function isRetryableError(error: any): boolean {
	const errorType = classifyError(error);

	// Never retry authentication or permission errors
	if (errorType === 'authentication' || errorType === 'permission') {
		return false;
	}

	// Never retry validation errors (user input issues)
	if (errorType === 'validation') {
		return false;
	}

	// Retry network and timeout errors
	if (errorType === 'network' || errorType === 'timeout') {
		return true;
	}

	// Check for specific GraphQL error codes
	if (error.graphQLErrors?.length > 0) {
		const graphQLError = error.graphQLErrors[0];
		const errorCode = graphQLError.extensions?.code;

		// Don't retry rate limiting immediately
		if (errorCode === 'RATE_LIMIT_EXCEEDED') {
			return true; // But with delay
		}

		// Retry server errors
		if (errorCode === 'INTERNAL_SERVER_ERROR') {
			return true;
		}
	}

	// Retry 5xx server errors
	if (error.response?.status >= 500) {
		return true;
	}

	return false;
}

// =============================================================================
// User Message Generation
// =============================================================================

export function createUserMessage(error: any): string {
	const errorType = classifyError(error);

	switch (errorType) {
		case 'network':
			return "We're having trouble connecting to our servers. Please check your internet connection and try again.";

		case 'timeout':
			return 'The request is taking longer than expected. Please try again.';

		case 'authentication':
			return 'Your session has expired. Please sign in again to continue.';

		case 'permission':
			return "You don't have permission to access this information. Contact your administrator if you believe this is an error.";

		case 'validation':
			// Try to extract specific validation message
			if (error.graphQLErrors?.length > 0) {
				const graphQLError = error.graphQLErrors[0];
				if (graphQLError.message) {
					return `Please check your input: ${graphQLError.message}`;
				}
			}
			return 'Please check your input and try again.';

		case 'graphql':
		default:
			// Check for specific GraphQL error messages
			if (error.graphQLErrors?.length > 0) {
				const graphQLError = error.graphQLErrors[0];
				const errorCode = graphQLError.extensions?.code;

				switch (errorCode) {
					case 'RATE_LIMIT_EXCEEDED':
						return 'Too many requests. Please wait a moment before trying again.';

					case 'INTERNAL_SERVER_ERROR':
						return 'Something went wrong on our end. Our team has been notified and is working on a fix.';

					default:
						return 'Something went wrong while loading your data. Please try again or contact support if the problem persists.';
				}
			}

			return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
	}
}

// =============================================================================
// Suggested Actions Generation
// =============================================================================

export function generateSuggestedActions(error: any): ActionOption[] {
	const errorType = classifyError(error);
	const actions: ActionOption[] = [];

	switch (errorType) {
		case 'network':
			actions.push({
				label: 'Try Again',
				action: 'retry',
				isPrimary: true
			});
			actions.push({
				label: 'Check Connection',
				action: 'check_network',
				isPrimary: false
			});
			break;

		case 'timeout':
			actions.push({
				label: 'Try Again',
				action: 'retry',
				isPrimary: true
			});
			actions.push({
				label: 'Refresh Page',
				action: 'refresh',
				isPrimary: false
			});
			break;

		case 'authentication':
			actions.push({
				label: 'Sign In',
				action: 'redirect_login',
				isPrimary: true
			});
			break;

		case 'permission':
			actions.push({
				label: 'Contact Administrator',
				action: 'contact_admin',
				isPrimary: true
			});
			actions.push({
				label: 'Go Back',
				action: 'go_back',
				isPrimary: false
			});
			break;

		case 'validation':
			actions.push({
				label: 'Fix Input',
				action: 'focus_input',
				isPrimary: true
			});
			break;

		case 'graphql':
		default:
			// Check for rate limiting
			if (error.graphQLErrors?.some((e: any) => e.extensions?.code === 'RATE_LIMIT_EXCEEDED')) {
				actions.push({
					label: 'Wait and Try Again',
					action: 'retry_delayed',
					isPrimary: true,
					parameters: { delay: 5000 }
				});
			} else {
				actions.push({
					label: 'Try Again',
					action: 'retry',
					isPrimary: true
				});
				actions.push({
					label: 'Contact Support',
					action: 'contact_support',
					isPrimary: false
				});
			}
			break;
	}

	return actions;
}

// =============================================================================
// Main Error Handler
// =============================================================================

export function createStandardizedError(
	originalError: any,
	operationName: string,
	variables?: any
): ErrorResponse {
	const errorType = classifyError(originalError);
	const severity = determineSeverity(originalError);
	const userMessage = createUserMessage(originalError);
	const suggestedActions = generateSuggestedActions(originalError);
	const isRetryable = isRetryableError(originalError);

	const errorResponse: ErrorResponse = {
		id: generateErrorId(),
		type: errorType,
		originalError,
		userMessage,
		technicalDetails: JSON.stringify(
			{
				originalError: originalError.message || originalError.toString(),
				operationName,
				variables,
				stack: originalError.stack,
				graphQLErrors: originalError.graphQLErrors,
				networkError: originalError.networkError,
				timestamp: new Date().toISOString()
			},
			null,
			2
		),
		suggestedActions,
		timestamp: new Date(),
		isRetryable,
		severity,
		operationId: operationName
	};

	// Add retry delay for rate limiting
	if (originalError.graphQLErrors?.some((e: any) => e.extensions?.code === 'RATE_LIMIT_EXCEEDED')) {
		errorResponse.retryAfter = 5; // 5 seconds
	}

	// Log error in development mode
	if (import.meta.env.DEV) {
		console.group(`🔴 GraphQL Error: ${operationName}`);
		console.error('Original Error:', originalError);
		console.error('Classified Error:', errorResponse);
		console.groupEnd();
	}

	return errorResponse;
}

// =============================================================================
// Error Handler Factory Functions
// =============================================================================

interface ErrorHandlerConfig {
	maxRetries: number;
	timeoutMs: number;
	showUserMessages: boolean;
	onError?: (error: ErrorResponse) => void;
	onRetry?: (attempt: number, error: ErrorResponse) => void;
}

export function createErrorHandler(config: ErrorHandlerConfig) {
	return {
		process(error: any, operationName: string, variables?: any): ErrorResponse {
			const standardizedError = createStandardizedError(error, operationName, variables);

			// Call custom error handler if provided
			if (config.onError) {
				config.onError(standardizedError);
			}

			return standardizedError;
		},

		shouldRetry(error: ErrorResponse, currentAttempt: number): boolean {
			return error.isRetryable && currentAttempt < config.maxRetries;
		},

		getRetryDelay(attempt: number): number {
			// Exponential backoff with jitter
			const baseDelay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
			const jitter = Math.random() * 0.1 * baseDelay;
			return Math.floor(baseDelay + jitter);
		}
	};
}

// =============================================================================
// Development Helpers
// =============================================================================

export function logErrorDetails(error: ErrorResponse): void {
	if (import.meta.env.DEV) {
		console.group(`🔍 Error Details: ${error.id}`);
		console.log('Type:', error.type);
		console.log('Severity:', error.severity);
		console.log('User Message:', error.userMessage);
		console.log('Is Retryable:', error.isRetryable);
		console.log('Suggested Actions:', error.suggestedActions);
		console.log('Technical Details:', error.technicalDetails);
		console.groupEnd();
	}
}

// =============================================================================
// Error Boundaries Integration
// =============================================================================

export interface ErrorBoundaryHandler {
	handleError: (error: Error, errorInfo: { componentStack: string }) => void;
	reset: () => void;
}

export function createErrorBoundaryHandler(
	onError?: (error: ErrorResponse) => void
): ErrorBoundaryHandler {
	return {
		handleError(error: Error, errorInfo: { componentStack: string }) {
			const errorResponse = createStandardizedError(error, 'COMPONENT_ERROR', {
				componentStack: errorInfo.componentStack
			});

			if (onError) {
				onError(errorResponse);
			}

			logErrorDetails(errorResponse);
		},

		reset() {
			// Reset error boundary state
			console.log('🔄 Error boundary reset');
		}
	};
}

// =============================================================================
// Utility Exports
// =============================================================================

export { GRAPHQL_ERROR_CODES, GRAPHQL_OPERATION_CONSTANTS } from '$lib/types/graphql-contracts';

// Re-export types for convenience
export type {
	ErrorResponse,
	ErrorType,
	ErrorSeverity,
	ActionOption,
	GraphQLErrorCode
} from '$lib/types/graphql-contracts';
