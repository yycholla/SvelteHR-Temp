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
import { authExchange } from '@urql/exchange-auth';
import { browser } from '$app/environment';
import { jwtAuth } from '$lib/stores/jwt-auth.svelte';

function getDefaultGraphQLEndpoint(isBrowser: boolean): string {
	if (isBrowser) {
		// Route browser GraphQL traffic through SvelteKit proxy for consistent auth/cookie handling.
		return '/api/graphql';
	}

	return (
		process.env.GRAPHQL_URL ||
		(process.env.PUBLIC_API_URL ? `${process.env.PUBLIC_API_URL}/graphql` : '') ||
		'http://localhost:4000/graphql'
	);
}

// ============================================================================
// Auth Exchange Configuration
// ============================================================================

const jwtAuthExchange: Exchange = authExchange(async (utils) => {
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
				const statusCode = (error.networkError as { statusCode?: number })?.statusCode;
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
				return;
			}

			console.log('[JWT Client] Attempting token refresh due to auth error');

			const success = await jwtAuth.refreshAccessToken();

			if (success && jwtAuth.accessToken) {
				console.log('[JWT Client] Token refresh successful');
				return;
			}

			console.error('[JWT Client] Token refresh failed, clearing auth');
			await jwtAuth.logout();
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
		// Backend serves GraphiQL HTML on GET /graphql; force POST for all operations.
		preferGetMethod: false,
		exchanges: [
			cacheExchange,
			jwtAuthExchange, // Handles JWT injection and refresh
			fetchExchange
		],
		// Include credentials for cookie-based refresh tokens
		fetchOptions: () => ({
			credentials: 'include',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			}
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
	? createJwtGraphQLClient(getDefaultGraphQLEndpoint(true))
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
	const endpoint = getDefaultGraphQLEndpoint(false);

	return new Client({
		url: endpoint,
		preferGetMethod: false,
		exchanges: [cacheExchange, fetchExchange],
		fetch,
		fetchOptions: {
			method: 'POST',
			credentials: 'include',
			headers: accessToken
				? {
						Authorization: `Bearer ${accessToken}`,
						'Content-Type': 'application/json'
					}
				: {
						'Content-Type': 'application/json'
					}
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
