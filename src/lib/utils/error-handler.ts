import { writable } from 'svelte/store';
import type { Notification } from '$lib/schemas/notification';

/**
 * Error types for classification
 */
export enum ErrorType {
	NETWORK = 'network',
	AUTH = 'auth',
	VALIDATION = 'validation',
	SERVER = 'server',
	CLIENT = 'client',
	TIMEOUT = 'timeout',
	UNKNOWN = 'unknown'
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
	LOW = 'low',
	MEDIUM = 'medium',
	HIGH = 'high',
	CRITICAL = 'critical'
}

/**
 * Structured error interface
 */
export interface AppError {
	id: string;
	type: ErrorType;
	severity: ErrorSeverity;
	message: string;
	details?: any;
	endpoint?: string;
	statusCode?: number;
	timestamp: Date;
	userId?: string;
	retryable: boolean;
	retryCount?: number;
	maxRetries?: number;
}

/**
 * Error context for debugging
 */
export interface ErrorContext {
	userId?: string;
	endpoint?: string;
	requestData?: any;
	userAgent?: string;
	sessionId?: string;
}

/**
 * Global error store
 */
export const errorStore = writable<AppError[]>([]);

/**
 * Error recovery strategies
 */
export interface RecoveryStrategy {
	canRecover: (error: AppError) => boolean;
	recover: (error: AppError, context?: ErrorContext) => Promise<boolean>;
	description: string;
}

class ErrorHandler {
	private strategies: RecoveryStrategy[] = [];
	private errorLog: AppError[] = [];
	private maxLogSize = 100;

	constructor() {
		this.initializeDefaultStrategies();
	}

	/**
	 * Initialize default error recovery strategies
	 */
	private initializeDefaultStrategies() {
		// Network retry strategy
		this.strategies.push({
			canRecover: (error) => 
				error.type === ErrorType.NETWORK && 
				error.retryable && 
				(error.retryCount || 0) < (error.maxRetries || 3),
			recover: async (error) => {
				await this.delay(Math.pow(2, error.retryCount || 0) * 1000); // Exponential backoff
				return true;
			},
			description: 'Network retry with exponential backoff'
		});

		// Auth token refresh strategy
		this.strategies.push({
			canRecover: (error) => 
				error.type === ErrorType.AUTH && 
				error.statusCode === 401,
			recover: async (error) => {
				try {
					// Attempt token refresh
					const response = await fetch('/api/v1/auth/refresh', {
						method: 'POST',
						credentials: 'include'
					});
					return response.ok;
				} catch {
					return false;
				}
			},
			description: 'Authentication token refresh'
		});

		// Validation error user guidance
		this.strategies.push({
			canRecover: (error) => error.type === ErrorType.VALIDATION,
			recover: async (error) => {
				// Show user-friendly validation messages
				this.showUserFriendlyError(error);
				return false; // Don't auto-retry validation errors
			},
			description: 'Show user-friendly validation messages'
		});
	}

	/**
	 * Classify error based on various factors
	 */
	private classifyError(error: any, statusCode?: number): { type: ErrorType; severity: ErrorSeverity } {
		// Network errors
		if (error.name === 'TypeError' && error.message.includes('fetch')) {
			return { type: ErrorType.NETWORK, severity: ErrorSeverity.HIGH };
		}

		// HTTP status code classification
		if (statusCode) {
			if (statusCode === 401 || statusCode === 403) {
				return { type: ErrorType.AUTH, severity: ErrorSeverity.HIGH };
			}
			if (statusCode >= 400 && statusCode < 500) {
				return { type: ErrorType.CLIENT, severity: ErrorSeverity.MEDIUM };
			}
			if (statusCode >= 500) {
				return { type: ErrorType.SERVER, severity: ErrorSeverity.HIGH };
			}
		}

		// Validation errors
		if (error.name === 'ZodError' || error.message?.includes('validation')) {
			return { type: ErrorType.VALIDATION, severity: ErrorSeverity.LOW };
		}

		// Timeout errors
		if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
			return { type: ErrorType.TIMEOUT, severity: ErrorSeverity.MEDIUM };
		}

		return { type: ErrorType.UNKNOWN, severity: ErrorSeverity.MEDIUM };
	}

	/**
	 * Create structured error from raw error
	 */
	private createAppError(
		error: any, 
		context?: ErrorContext,
		statusCode?: number
	): AppError {
		const { type, severity } = this.classifyError(error, statusCode);
		
		return {
			id: this.generateErrorId(),
			type,
			severity,
			message: error.message || 'An unknown error occurred',
			details: error.details || error.stack,
			endpoint: context?.endpoint,
			statusCode,
			timestamp: new Date(),
			userId: context?.userId,
			retryable: this.isRetryable(type, statusCode),
			maxRetries: this.getMaxRetries(type)
		};
	}

	/**
	 * Determine if error is retryable
	 */
	private isRetryable(type: ErrorType, statusCode?: number): boolean {
		if (type === ErrorType.NETWORK || type === ErrorType.TIMEOUT) return true;
		if (type === ErrorType.AUTH && statusCode === 401) return true;
		if (type === ErrorType.SERVER && statusCode && statusCode >= 500) return true;
		return false;
	}

	/**
	 * Get maximum retry attempts for error type
	 */
	private getMaxRetries(type: ErrorType): number {
		switch (type) {
			case ErrorType.NETWORK:
			case ErrorType.TIMEOUT:
				return 3;
			case ErrorType.AUTH:
				return 1;
			case ErrorType.SERVER:
				return 2;
			default:
				return 0;
		}
	}

	/**
	 * Generate unique error ID
	 */
	private generateErrorId(): string {
		return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Delay utility for retries
	 */
	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Show user-friendly error message
	 */
	private showUserFriendlyError(error: AppError) {
		const friendlyMessages = {
			[ErrorType.NETWORK]: 'Connection problem. Please check your internet connection.',
			[ErrorType.AUTH]: 'Session expired. Please log in again.',
			[ErrorType.VALIDATION]: 'Please check your input and try again.',
			[ErrorType.SERVER]: 'Server is temporarily unavailable. Please try again later.',
			[ErrorType.TIMEOUT]: 'Request took too long. Please try again.',
			[ErrorType.UNKNOWN]: 'Something went wrong. Please try again.'
		};

		const message = friendlyMessages[error.type] || error.message;
		
		// Add to error store for UI display
		errorStore.update(errors => [...errors, { ...error, message }]);
	}

	/**
	 * Handle error with recovery attempts
	 */
	async handleError(
		error: any,
		context?: ErrorContext,
		statusCode?: number
	): Promise<AppError> {
		const appError = this.createAppError(error, context, statusCode);
		
		// Log error
		this.logError(appError);

		// Attempt recovery
		for (const strategy of this.strategies) {
			if (strategy.canRecover(appError)) {
				try {
					const recovered = await strategy.recover(appError, context);
					if (recovered) {
						appError.retryCount = (appError.retryCount || 0) + 1;
						console.log(`Error recovery successful: ${strategy.description}`);
						return appError;
					}
				} catch (recoveryError) {
					console.warn(`Recovery strategy failed: ${strategy.description}`, recoveryError);
				}
			}
		}

		// If no recovery possible, show to user
		this.showUserFriendlyError(appError);
		
		return appError;
	}

	/**
	 * Log error to internal store
	 */
	private logError(error: AppError) {
		this.errorLog.unshift(error);
		
		// Maintain max log size
		if (this.errorLog.length > this.maxLogSize) {
			this.errorLog = this.errorLog.slice(0, this.maxLogSize);
		}

		// Send to external logging service in production
		if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
			this.sendToLoggingService(error);
		}
	}

	/**
	 * Send error to external logging service
	 */
	private async sendToLoggingService(error: AppError) {
		try {
			// This would integrate with services like Sentry, LogRocket, etc.
			await fetch('/api/v1/monitoring/errors', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(error)
			});
		} catch (loggingError) {
			console.warn('Failed to send error to logging service:', loggingError);
		}
	}

	/**
	 * Clear error from store
	 */
	clearError(errorId: string) {
		errorStore.update(errors => errors.filter(e => e.id !== errorId));
	}

	/**
	 * Clear all errors
	 */
	clearAllErrors() {
		errorStore.set([]);
	}

	/**
	 * Get error history
	 */
	getErrorHistory(): AppError[] {
		return [...this.errorLog];
	}

	/**
	 * Add custom recovery strategy
	 */
	addRecoveryStrategy(strategy: RecoveryStrategy) {
		this.strategies.push(strategy);
	}

	/**
	 * Get error statistics
	 */
	getErrorStats() {
		const now = new Date();
		const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
		
		const recentErrors = this.errorLog.filter(e => e.timestamp > last24Hours);
		
		return {
			total: this.errorLog.length,
			last24Hours: recentErrors.length,
			byType: this.groupBy(recentErrors, 'type'),
			bySeverity: this.groupBy(recentErrors, 'severity'),
			byEndpoint: this.groupBy(recentErrors, 'endpoint')
		};
	}

	private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
		return array.reduce((acc, item) => {
			const value = item[key] as string;
			acc[value] = (acc[value] || 0) + 1;
			return acc;
		}, {} as Record<string, number>);
	}
}

// Export singleton instance
export const errorHandler = new ErrorHandler();

// Utility functions for common error scenarios
export const ErrorUtils = {
	/**
	 * Handle API errors consistently
	 */
	async handleApiError(error: any, endpoint: string, context?: Partial<ErrorContext>) {
		return errorHandler.handleError(error, {
			...context,
			endpoint
		}, error.response?.status);
	},

	/**
	 * Create user-friendly validation error
	 */
	createValidationError(message: string, details?: any): AppError {
		return {
			id: `val_${Date.now()}`,
			type: ErrorType.VALIDATION,
			severity: ErrorSeverity.LOW,
			message,
			details,
			timestamp: new Date(),
			retryable: false
		};
	},

	/**
	 * Check if error should trigger logout
	 */
	shouldLogout(error: AppError): boolean {
		return error.type === ErrorType.AUTH && 
			   error.statusCode === 403 && 
			   (error.retryCount || 0) > 0;
	}
};