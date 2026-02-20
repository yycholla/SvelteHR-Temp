/**
 * JWT-Authenticated GraphQL Client (URQL)
 *
 * Provides a URQL client with automatic JWT token injection,
 * token refresh on authentication errors, and seamless retry logic.
 *
 * Features:
 * - Automatic Authorization header injection
 * - Transparent token refresh on UNAUTHENTICATED errors
 * - Automatic retry of failed requests after refresh
 * - Integration with jwt-auth.svelte.ts store
 */

import { Client, cacheExchange, fetchExchange, type Exchange } from '@urql/core';
import { authExchange, type AuthConfig } from '@urql/exchange-auth';
import { browser } from '$app/environment';
import { jwtAuth } from '$lib/stores/jwt-auth.svelte';

// ============================================================================
// Auth Exchange Configuration
// ============================================================================

interface AuthState {
	token: string | null;
}

const jwtAuthExchange: Exchange = authExchange<AuthState>(async (utils) => {
	return {
		/**
		 * Add JWT token to Authorization header
		 */
		addAuthToOperation(operation) {
			const token = jwtAuth.accessToken;

			if (!token) {
				return operation;
			}

			return utils.appendHeaders(operation, {
				Authorization: `Bearer ${token}`
			});
		},

		/**
		 * Detect if error is due to authentication failure
		 */
		didAuthError(error, _operation) {
			// Check for GraphQL authentication errors
			if (error.graphQLErrors) {
				return error.graphQLErrors.some((err) => {
					const errorCode = err.extensions?.code;
					return (
						errorCode === 'UNAUTHENTICATED' ||
						errorCode === 'TOKEN_EXPIRED' ||
						errorCode === 'INVALID_TOKEN'
					);
				});
			}

			// Check for network errors with 401 status
			if (error.networkError) {
				const statusCode = (error.networkError as any)?.statusCode;
				return statusCode === 401;
			}

			return false;
		},

		/**
		 * Check if token will expire soon (within 30 seconds)
		 */
		willAuthError(_operation) {
			// For JWT, expiration is managed by the auth store's automatic refresh
			// No need to proactively check expiration here - let the request proceed
			// and handle auth errors reactively in didAuthError
			return false;
		},

		/**
		 * Attempt to refresh authentication
		 */
		async refreshAuth() {
			if (!browser) {
				return { token: null };
			}

			console.log('[JWT Client] Attempting token refresh due to auth error');

			const success = await jwtAuth.refreshAccessToken();

			if (success && jwtAuth.accessToken) {
				console.log('[JWT Client] Token refresh successful');
				return { token: jwtAuth.accessToken };
			}

			console.error('[JWT Client] Token refresh failed, clearing auth');
			await jwtAuth.logout();
			return { token: null };
		}
	};
});

// ============================================================================
// GraphQL Client Factory
// ============================================================================

/**
 * Create a JWT-authenticated URQL client
 *
 * @param graphqlEndpoint - GraphQL API endpoint URL
 * @returns Configured URQL client with JWT authentication
 */
export function createJwtGraphQLClient(graphqlEndpoint: string): Client {
	const client = new Client({
		url: graphqlEndpoint,
		exchanges: [
			cacheExchange,
			jwtAuthExchange, // Handles JWT injection and refresh
			fetchExchange
		],
		// Include credentials for cookie-based refresh tokens
		fetchOptions: () => ({
			credentials: 'include',
			method: 'POST' // Force POST for all operations (backend returns GraphiQL HTML for GET)
		})
	});

	// Initialize the JWT auth store with the client
	jwtAuth.initialize(client);

	return client;
}

// ============================================================================
// Default Client Instance
// ============================================================================

/**
 * Default JWT-authenticated GraphQL client for browser
 */
export const jwtGraphQLClient = browser
	? createJwtGraphQLClient('http://localhost:4000/graphql')
	: ({} as Client); // Placeholder for SSR

// ============================================================================
// Server-Side GraphQL Client Factory
// ============================================================================

/**
 * Create a server-side GraphQL client with JWT from cookies
 *
 * Used in +page.server.ts load functions to make authenticated
 * GraphQL requests with JWT tokens from cookies.
 *
 * @param fetch - SvelteKit fetch function (has cookie context)
 * @param accessToken - Optional JWT access token from cookies
 * @returns Configured URQL client for server-side use
 */
export function createServerJwtClient(
	fetch: typeof globalThis.fetch,
	accessToken?: string
): Client {
	return new Client({
		url: 'http://localhost:4000/graphql',
		exchanges: [cacheExchange, fetchExchange],
		fetch,
		fetchOptions: {
			credentials: 'include',
			headers: accessToken
				? {
						Authorization: `Bearer ${accessToken}`
					}
				: {}
		}
	});
}

// ============================================================================
// Export Alias (for convenience)
// ============================================================================

/**
 * Alias for createJwtGraphQLClient (for convenience in imports)
 */
export const createJwtClient = createJwtGraphQLClient;
