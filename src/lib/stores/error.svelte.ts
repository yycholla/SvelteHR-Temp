import { logger } from '$lib/utils/logger';
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
	details?: unknown;
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

function normalizeError(error: unknown): Error {
	if (error instanceof Error) return error;
	return new Error(typeof error === 'string' ? error : 'Unknown error');
}

interface GraphQLErrorLike {
	message?: string;
	extensions?: { userMessage?: string };
	graphQLErrors?: unknown;
	networkError?: unknown;
	name?: string;
}

// Helper functions for common error scenarios
export function handleGraphQLError(error: unknown, operation?: string): void {
	const graphQLError = error as GraphQLErrorLike;
	logger.error('Handle graph q l error failed', normalizeError(error));

	const message = graphQLError.message || 'A GraphQL operation failed';
	const userMessage = graphQLError.extensions?.userMessage || message;

	errorStore.add({
		message: userMessage,
		type: 'error',
		details: {
			operation,
			originalError: graphQLError,
			graphqlErrors: graphQLError.graphQLErrors,
			networkError: graphQLError.networkError
		},
		action: {
			label: 'Retry',
			handler: () => window.location.reload()
		}
	});
}

export function handleServerError(error: unknown, context?: string): void {
	const serverError = error as GraphQLErrorLike;
	logger.error('Handle server error failed', normalizeError(error));

	const isNetworkError = !navigator.onLine || serverError.name === 'NetworkError';
	const message = isNetworkError
		? 'Network connection lost. Please check your internet connection.'
		: serverError.message || 'A server error occurred';

	errorStore.add({
		message,
		type: 'error',
		details: {
			context,
			originalError: serverError,
			isNetworkError
		},
		action: {
			label: isNetworkError ? 'Retry' : 'Reload',
			handler: () => window.location.reload()
		}
	});
}

export function showSuccess(message: string, details?: unknown): void {
	errorStore.add({
		message,
		type: 'info',
		details
	});
}

export function showWarning(message: string, details?: unknown, action?: AppError['action']): void {
	errorStore.add({
		message,
		type: 'warning',
		details,
		action
	});
}
