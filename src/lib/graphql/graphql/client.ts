import { Client, cacheExchange, fetchExchange, errorExchange } from '@urql/core';
import { retryExchange } from '@urql/exchange-retry';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';
import { createPerformanceExchange } from '$lib/performance/graphql-performance-exchange';

/**
 * PostGraphile GraphQL Client Configuration for SvelteHR
 *
 * Provides session-based authenticated GraphQL client with:
 * - HTTP-only session cookies for authentication
 * - Intelligent caching and error handling
 * - Retry logic and rate limiting
 * - No client-side token management (handled server-side)
 */

// Default GraphQL endpoint for browser
const DEFAULT_GRAPHQL_URL = 'http://localhost:4000/graphql';

// Error exchange for handling GraphQL errors
const customErrorExchange = errorExchange({
	onError: (error, operation) => {
		// Handle authentication errors (session-based)
		if (error.graphQLErrors.some((e) => e.extensions?.code === 'UNAUTHENTICATED')) {
			console.warn('GraphQL UNAUTHENTICATED error:', error.graphQLErrors);

			// Redirect to login if session expired
			// Session authentication is handled server-side, no token cleanup needed
			if (
				browser &&
				!window.location.pathname.includes('/login') &&
				!window.location.pathname.includes('/admin')
			) {
				console.log('🔴 REDIRECT: Session expired, redirecting to login');
				goto('/login?returnUrl=' + encodeURIComponent(window.location.pathname));
			} else {
				console.log('Not redirecting - already on auth-related page or admin page');
			}
		}

		// Handle rate limiting
		if (error.graphQLErrors.some((e) => e.extensions?.code === 'RATE_LIMIT_EXCEEDED')) {
			console.warn('Rate limit exceeded for operation:', operation.key);
		}

		// Handle network errors
		if (error.networkError) {
			console.error('Network error:', error.networkError);

			// Dispatch custom event for offline handling
			if (browser) {
				window.dispatchEvent(
					new CustomEvent('network-error', {
						detail: { error: error.networkError, operation }
					})
				);
			}
		}

		// Log other GraphQL errors
		error.graphQLErrors.forEach(({ message, extensions }) => {
			console.error('GraphQL error:', message, extensions);
		});
	}
});

// Session-based authentication - no auth exchange needed
// Authentication handled via HTTP-only cookies sent automatically by browser

// Retry exchange configuration
const retryConfig = retryExchange({
	initialDelayMs: 1000,
	maxDelayMs: 15000,
	randomDelay: true,
	maxNumberAttempts: 3,
	retryIf: (error, _operation) => {
		// Retry on network errors and server errors (not client errors)
		return !!(
			error.networkError ||
			error.graphQLErrors.some(
				(e) =>
					e.extensions?.code === 'INTERNAL_ERROR' || e.extensions?.code === 'RATE_LIMIT_EXCEEDED'
			)
		);
	}
});

// Create the main GraphQL client
export const createUrqlClient = (fetchFn?: typeof fetch, url?: string) => {
	// Determine GraphQL URL
	let graphqlUrl = url || DEFAULT_GRAPHQL_URL;

	// If running on server without explicit URL, try to get from environment
	if (!browser && !url) {
		try {
			// Use VITE_API_URL if available (containerized environment)
			const viteApiUrl = process.env.VITE_API_URL;
			if (viteApiUrl) {
				graphqlUrl = `${viteApiUrl}/graphql`;
			}
		} catch {
			// Use default if environment check fails
		}
	}

	const exchanges = [
		cacheExchange,
		customErrorExchange,
		retryConfig,
		createPerformanceExchange({
			enabled: true,
			trackAllOperations: true,
			slowQueryThreshold: 200, // 200ms budget
			enableCacheTracking: true,
			enableComplexityAnalysis: true
		}),
		fetchExchange
	];

	// Add subscription exchange for browser environment (disabled for PostGraphile)
	// PostGraphile doesn't support WebSocket subscriptions by default
	// if (browser && wsClient) {
	//   exchanges.splice(-1, 0, subscriptionExchange({
	//     forwardSubscription(request) {
	//       const input = { ...request, query: request.query || '' };
	//       return {
	//         subscribe: (sink) => {
	//           const unsubscribe = wsClient!.subscribe(input, sink);
	//           return { unsubscribe };
	//         },
	//       };
	//     },
	//   }));
	// }

	return new Client({
		url: graphqlUrl,
		exchanges,
		fetch: fetchFn,
		fetchOptions: () => {
			return {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include' // Include cookies for session authentication
			};
		},
		preferGetMethod: false
	});
};

// Default client instance
export const client = createUrqlClient();

// Network status monitoring
export const networkStatus = {
	isOnline: browser ? navigator.onLine : true,
	lastError: null as Error | null
};

if (browser) {
	window.addEventListener('online', () => {
		networkStatus.isOnline = true;
		window.dispatchEvent(
			new CustomEvent('network-status-change', {
				detail: { isOnline: true }
			})
		);
	});

	window.addEventListener('offline', () => {
		networkStatus.isOnline = false;
		window.dispatchEvent(
			new CustomEvent('network-status-change', {
				detail: { isOnline: false }
			})
		);
	});

	window.addEventListener('network-error', ((event: CustomEvent) => {
		networkStatus.lastError = event.detail.error;
	}) as EventListener);
}

// Export types for TypeScript support
export type { Client, CombinedError, Operation, OperationResult } from '@urql/core';

// Export common query/mutation helpers
export const executeQuery = async (client: Client, query: string, variables?: any) => {
	const result = await client.query(query, variables).toPromise();

	if (result.error) {
		throw result.error;
	}

	return result.data;
};

export const executeMutation = async (client: Client, mutation: string, variables?: any) => {
	const result = await client.mutation(mutation, variables).toPromise();

	if (result.error) {
		throw result.error;
	}

	return result.data;
};

export const executeSubscription = (client: Client, subscription: string, variables?: any) => {
	return client.subscription(subscription, variables);
};
