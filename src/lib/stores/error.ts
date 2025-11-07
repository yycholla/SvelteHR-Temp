import { writable, derived } from 'svelte/store';
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

// Error management store
function createErrorStore() {
	const errors = writable<AppError[]>([]);
	const loading = writable<LoadingState>({ isLoading: false });

	return {
		// Error management
		errors: {
			subscribe: errors.subscribe,
			add: (error: Omit<AppError, 'id' | 'timestamp'>) => {
				const newError: AppError = {
					...error,
					id: nanoid(),
					timestamp: new Date()
				};

				errors.update((current) => [...current, newError]);

				// Auto-remove info messages after 5 seconds
				if (error.type === 'info') {
					setTimeout(() => {
						errors.update((current) => current.filter((e) => e.id !== newError.id));
					}, 5000);
				}

				// Auto-remove warnings after 10 seconds
				if (error.type === 'warning') {
					setTimeout(() => {
						errors.update((current) => current.filter((e) => e.id !== newError.id));
					}, 10000);
				}

				return newError.id;
			},
			remove: (id: string) => {
				errors.update((current) => current.filter((error) => error.id !== id));
			},
			clear: () => {
				errors.set([]);
			}
		},

		// Loading state management
		loading: {
			subscribe: loading.subscribe,
			start: (message?: string, operation?: string) => {
				loading.set({ isLoading: true, message, operation });
			},
			stop: () => {
				loading.set({ isLoading: false });
			}
		}
	};
}

export const errorStore = createErrorStore();

// Derived stores for specific error types
export const hasErrors = derived(errorStore.errors, ($errors) => $errors.length > 0);

export const criticalErrors = derived(errorStore.errors, ($errors) =>
	$errors.filter((error) => error.type === 'error')
);

export const warnings = derived(errorStore.errors, ($errors) =>
	$errors.filter((error) => error.type === 'warning')
);

export const infoMessages = derived(errorStore.errors, ($errors) =>
	$errors.filter((error) => error.type === 'info')
);

// Helper functions for common error scenarios
export function handleGraphQLError(error: any, operation?: string) {
	console.error(`GraphQL Error${operation ? ` in ${operation}` : ''}:`, error);

	const message = error.message || 'A GraphQL operation failed';
	const userMessage = error.extensions?.userMessage || message;

	errorStore.errors.add({
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

export function handleServerError(error: any, context?: string) {
	console.error(`Server Error${context ? ` in ${context}` : ''}:`, error);

	const isNetworkError = !navigator.onLine || error.name === 'NetworkError';
	const message = isNetworkError
		? 'Network connection lost. Please check your internet connection.'
		: error.message || 'A server error occurred';

	errorStore.errors.add({
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

export function showSuccess(message: string, details?: any) {
	errorStore.errors.add({
		message,
		type: 'info',
		details
	});
}

export function showWarning(message: string, details?: any, action?: AppError['action']) {
	errorStore.errors.add({
		message,
		type: 'warning',
		details,
		action
	});
}
