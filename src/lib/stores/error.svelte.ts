/**
 * Error Management Store (Svelte 5 Runes)
 * Manages application errors, warnings, and loading states with reactive state
 */

import { nanoid } from 'nanoid';

export interface AppError {
	id: string;
	message: string;
	type: 'error' | 'warning' | 'info';
	timestamp: Date;
	details?: any;
	action?: {
		label: string;
		handler: () => void;
	};
}

export interface LoadingState {
	isLoading: boolean;
	message?: string;
	operation?: string;
}

/**
 * Error Store Class
 */
class ErrorStore {
	errors = $state<AppError[]>([]);
	loadingState = $state<LoadingState>({ isLoading: false });

	// Derived states for convenience
	hasErrors = $derived(this.errors.length > 0);
	criticalErrors = $derived(this.errors.filter((error) => error.type === 'error'));
	warnings = $derived(this.errors.filter((error) => error.type === 'warning'));
	infoMessages = $derived(this.errors.filter((error) => error.type === 'info'));

	/**
	 * Add an error to the store
	 */
	add(error: Omit<AppError, 'id' | 'timestamp'>): string {
		const newError: AppError = {
			...error,
			id: nanoid(),
			timestamp: new Date()
		};

		this.errors = [...this.errors, newError];

		// Auto-remove info messages after 5 seconds
		if (error.type === 'info') {
			setTimeout(() => {
				this.remove(newError.id);
			}, 5000);
		}

		// Auto-remove warnings after 10 seconds
		if (error.type === 'warning') {
			setTimeout(() => {
				this.remove(newError.id);
			}, 10000);
		}

		return newError.id;
	}

	/**
	 * Remove an error by ID
	 */
	remove(id: string): void {
		this.errors = this.errors.filter((error) => error.id !== id);
	}

	/**
	 * Clear all errors
	 */
	clear(): void {
		this.errors = [];
	}

	/**
	 * Start loading state
	 */
	startLoading(message?: string, operation?: string): void {
		this.loadingState = { isLoading: true, message, operation };
	}

	/**
	 * Stop loading state
	 */
	stopLoading(): void {
		this.loadingState = { isLoading: false };
	}
}

export const errorStore = new ErrorStore();

// Helper functions for common error scenarios
export function handleGraphQLError(error: any, operation?: string): void {
	console.error(`GraphQL Error${operation ? ` in ${operation}` : ''}:`, error);

	const message = error.message || 'A GraphQL operation failed';
	const userMessage = error.extensions?.userMessage || message;

	errorStore.add({
		message: userMessage,
		type: 'error',
		details: {
			operation,
			originalError: error,
			graphqlErrors: error.graphQLErrors,
			networkError: error.networkError
		},
		action: {
			label: 'Retry',
			handler: () => window.location.reload()
		}
	});
}

export function handleServerError(error: any, context?: string): void {
	console.error(`Server Error${context ? ` in ${context}` : ''}:`, error);

	const isNetworkError = !navigator.onLine || error.name === 'NetworkError';
	const message = isNetworkError
		? 'Network connection lost. Please check your internet connection.'
		: error.message || 'A server error occurred';

	errorStore.add({
		message,
		type: 'error',
		details: {
			context,
			originalError: error,
			isNetworkError
		},
		action: {
			label: isNetworkError ? 'Retry' : 'Reload',
			handler: () => window.location.reload()
		}
	});
}

export function showSuccess(message: string, details?: any): void {
	errorStore.add({
		message,
		type: 'info',
		details
	});
}

export function showWarning(message: string, details?: any, action?: AppError['action']): void {
	errorStore.add({
		message,
		type: 'warning',
		details,
		action
	});
}
