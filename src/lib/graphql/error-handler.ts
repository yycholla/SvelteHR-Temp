/**
 * GraphQL Error Handler Integration
 * 
 * Provides comprehensive error handling for GraphQL operations with
 * seamless integration to the existing error system and toast notifications.
 */

import { GraphQLClientError } from './client';
import { 
	showError, 
	showWarning, 
	showToastWithActions, 
	logError, 
	type ToastAction 
} from '../utils/errors';
import { goto } from '$app/navigation';

/**
 * Handle GraphQL errors with appropriate user feedback
 */
export class GraphQLErrorHandler {
	/**
	 * Handle GraphQL error with toast notification
	 */
	static handleWithToast(
		error: GraphQLClientError, 
		options: {
			customMessage?: string;
			showActions?: boolean;
			context?: string;
			suppressToast?: boolean;
		} = {}
	): void {
		const enhancedError = error.toEnhancedError();
		
		// Log error for debugging and monitoring
		logError(enhancedError, {
			context: options.context,
			operation_name: error.operationName,
			variables: error.variables
		});
		
		// Skip toast if explicitly suppressed
		if (options.suppressToast) return;
		
		const message = options.customMessage || error.userMessage;
		const actions = this.createErrorActions(error);
		
		// Show appropriate toast based on error type and user preference
		if (options.showActions && actions.length > 0) {
			showToastWithActions(message, this.getToastType(error), actions, {
				title: this.getErrorTitle(error),
				timeout: this.getToastTimeout(error),
				dismissible: true
			});
		} else {
			const toastType = this.getToastType(error);
			if (toastType === 'warning') {
				showWarning(message, {
					title: this.getErrorTitle(error),
					timeout: this.getToastTimeout(error)
				});
			} else {
				showError(message, {
					title: this.getErrorTitle(error),
					timeout: this.getToastTimeout(error)
				});
			}
		}
	}
	
	/**
	 * Handle authentication errors with automatic redirect
	 */
	static handleAuthError(
		error: GraphQLClientError,
		options: {
			redirectPath?: string;
			showToast?: boolean;
		} = {}
	): void {
		const message = 'Your session has expired. Please sign in again.';
		
		if (options.showToast !== false) {
			showToastWithActions(
				message,
				'warning',
				[
					{
						label: 'Sign In',
						action: () => {
							const returnUrl = encodeURIComponent(globalThis.location?.pathname || '/');
							goto(options.redirectPath || `/login?returnUrl=${returnUrl}`);
						},
						variant: 'primary'
					}
				],
				{
					title: 'Authentication Required',
					timeout: 0, // Don't auto-dismiss
					dismissible: true
				}
			);
		}
		
		// Log the error
		logError(error.toEnhancedError(), { action: 'auth_error_redirect' });
	}
	
	/**
	 * Handle permission errors with helpful guidance
	 */
	static handlePermissionError(
		error: GraphQLClientError,
		options: {
			resource?: string;
			requiredPermission?: string;
			showToast?: boolean;
		} = {}
	): void {
		const baseMessage = error.userMessage;
		const contextMessage = options.resource 
			? `You don't have permission to access ${options.resource}.`
			: baseMessage;
		
		if (options.showToast !== false) {
			showToastWithActions(
				contextMessage,
				'warning',
				[
					{
						label: 'Contact Support',
						action: () => {
							// This could open a support modal or navigate to help
							goto('/help?issue=permissions');
						},
						variant: 'secondary'
					}
				],
				{
					title: 'Access Denied',
					timeout: 8000,
					dismissible: true
				}
			);
		}
		
		// Log with permission context
		logError(error.toEnhancedError(), {
			resource: options.resource,
			required_permission: options.requiredPermission
		});
	}
	
	/**
	 * Handle validation errors with field-specific guidance
	 */
	static handleValidationError(
		error: GraphQLClientError,
		options: {
			showToast?: boolean;
			fieldErrors?: Record<string, string>;
		} = {}
	): { message: string; fieldErrors: Record<string, string> } {
		const message = error.userMessage;
		const fieldErrors = options.fieldErrors || {};
		
		// Extract field errors from GraphQL error extensions
		if (error.extensions?.validationErrors) {
			for (const validationError of error.extensions.validationErrors) {
				if (validationError.field && validationError.message) {
					fieldErrors[validationError.field] = validationError.message;
				}
			}
		}
		
		if (options.showToast !== false) {
			const hasFieldErrors = Object.keys(fieldErrors).length > 0;
			const toastMessage = hasFieldErrors 
				? 'Please correct the highlighted fields'
				: message;
			
			showWarning(toastMessage, {
				title: 'Validation Error',
				timeout: 5000
			});
		}
		
		// Log validation details
		logError(error.toEnhancedError(), { field_errors: fieldErrors });
		
		return { message, fieldErrors };
	}
	
	/**
	 * Handle network errors with retry options
	 */
	static handleNetworkError(
		error: GraphQLClientError,
		retryFunction?: () => void,
		options: {
			showToast?: boolean;
			maxRetries?: number;
			currentRetry?: number;
		} = {}
	): void {
		const message = error.userMessage;
		const canRetry = error.isRetryable && retryFunction;
		const hasRetriesLeft = !options.maxRetries || 
			(options.currentRetry || 0) < options.maxRetries;
		
		if (options.showToast !== false) {
			if (canRetry && hasRetriesLeft) {
				showToastWithActions(
					message,
					'error',
					[
						{
							label: 'Try Again',
							action: retryFunction,
							variant: 'primary'
						},
						{
							label: 'Refresh Page',
							action: () => globalThis.location?.reload(),
							variant: 'secondary'
						}
					],
					{
						title: 'Connection Problem',
						timeout: 0, // Don't auto-dismiss when actions available
						dismissible: true
					}
				);
			} else {
				showError(message, {
					title: 'Network Error',
					timeout: 8000
				});
			}
		}
		
		// Log network error details
		logError(error.toEnhancedError(), {
			retry_available: canRetry,
			retries_left: hasRetriesLeft,
			current_retry: options.currentRetry || 0,
			max_retries: options.maxRetries || 0
		});
	}
	
	/**
	 * Create appropriate error actions based on error type
	 */
	private static createErrorActions(error: GraphQLClientError): ToastAction[] {
		const actions: ToastAction[] = [];
		
		if (error.isAuthError) {
			actions.push({
				label: 'Sign In',
				action: () => {
					const returnUrl = encodeURIComponent(globalThis.location?.pathname || '/');
					goto(`/login?returnUrl=${returnUrl}`);
				},
				variant: 'primary'
			});
		}
		
		if (error.isNetworkError && error.isRetryable) {
			actions.push({
				label: 'Refresh',
				action: () => globalThis.location?.reload(),
				variant: 'secondary'
			});
		}
		
		if (error.isPermissionError) {
			actions.push({
				label: 'Contact Support',
				action: () => goto('/help?issue=permissions'),
				variant: 'secondary'
			});
		}
		
		return actions;
	}
	
	/**
	 * Get appropriate toast type based on error
	 */
	private static getToastType(error: GraphQLClientError): 'error' | 'warning' | 'info' {
		if (error.isAuthError || error.isPermissionError || error.isValidationError) {
			return 'warning';
		}
		return 'error';
	}
	
	/**
	 * Get appropriate error title
	 */
	private static getErrorTitle(error: GraphQLClientError): string {
		if (error.isAuthError) return 'Authentication Required';
		if (error.isPermissionError) return 'Access Denied';
		if (error.isValidationError) return 'Validation Error';
		if (error.isRateLimitError) return 'Rate Limited';
		if (error.isNetworkError) return 'Connection Problem';
		return 'Error';
	}
	
	/**
	 * Get appropriate timeout based on error severity
	 */
	private static getToastTimeout(error: GraphQLClientError): number {
		switch (error.severity) {
			case 'critical':
				return 0; // Don't auto-dismiss critical errors
			case 'high':
				return 8000; // 8 seconds for high priority
			case 'medium':
				return 6000; // 6 seconds for medium priority
			case 'low':
			default:
				return 4000; // 4 seconds for low priority
		}
	}
}

/**
 * Convenience function for handling GraphQL errors
 */
export function handleGraphQLError(
	error: unknown,
	context?: string,
	options: {
		showToast?: boolean;
		showActions?: boolean;
		customMessage?: string;
		retryFunction?: () => void;
	} = {}
): void {
	if (error instanceof GraphQLClientError) {
		// Handle specific error types
		if (error.isAuthError) {
			GraphQLErrorHandler.handleAuthError(error, {
				showToast: options.showToast
			});
			return;
		}
		
		if (error.isPermissionError) {
			GraphQLErrorHandler.handlePermissionError(error, {
				showToast: options.showToast
			});
			return;
		}
		
		if (error.isValidationError) {
			GraphQLErrorHandler.handleValidationError(error, {
				showToast: options.showToast
			});
			return;
		}
		
		if (error.isNetworkError) {
			GraphQLErrorHandler.handleNetworkError(error, options.retryFunction, {
				showToast: options.showToast
			});
			return;
		}
		
		// Handle generic GraphQL error
		GraphQLErrorHandler.handleWithToast(error, {
			context,
			customMessage: options.customMessage,
			showActions: options.showActions,
			suppressToast: options.showToast === false
		});
	} else {
		// Handle non-GraphQL errors
		const message = error instanceof Error ? error.message : 'An unexpected error occurred';
		
		if (options.showToast !== false) {
			showError(options.customMessage || message, {
				title: 'Error',
				timeout: 5000
			});
		}
		
		console.error('Non-GraphQL error:', error);
	}
}

/**
 * Async wrapper that automatically handles GraphQL errors
 */
export async function withGraphQLErrorHandling<T>(
	operation: () => Promise<T>,
	context: string,
	options: {
		showToast?: boolean;
		showActions?: boolean;
		customMessage?: string;
		retryFunction?: () => void;
		fallbackValue?: T;
	} = {}
): Promise<T | null> {
	try {
		return await operation();
	} catch (error) {
		handleGraphQLError(error, context, options);
		return options.fallbackValue ?? null;
	}
}