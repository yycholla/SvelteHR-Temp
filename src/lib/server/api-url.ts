/**
 * Server-side API URL configuration
 * Automatically detects containerized environment and uses appropriate backend URL
 */

import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

/**
 * Get the GraphQL API URL for server-side requests
 *
 * In containerized environment: Uses backend-dev:4000 (Docker container name)
 * On host: Uses localhost:4000
 */
export function getGraphQLEndpoint(): string {
	// Check if we're running in a container (PUBLIC_API_URL is set in docker-compose)
	const containerApiUrl = publicEnv.PUBLIC_API_URL;

	if (containerApiUrl) {
		// Running in container - use container network
		return `${containerApiUrl}/graphql`;
	}

	// Running on host - use localhost (Rust GraphQL API on port 4000)
	return 'http://localhost:4000/graphql';
}

/**
 * Get the base API URL (without /graphql path)
 */
export function getApiBaseUrl(): string {
	const containerApiUrl = env.VITE_API_URL;

	if (containerApiUrl) {
		return containerApiUrl;
	}

	return publicEnv.PUBLIC_API_URL || 'http://localhost:4000';
}

/**
 * Check if running in containerized environment
 */
export function isContainerized(): boolean {
	return Boolean(env.VITE_API_URL);
}

/**
 * Make an authenticated GraphQL request with session cookies forwarded
 */
export async function authenticatedGraphQLRequest(
	endpoint: string,
	query: string,
	variables?: any,
	request?: Request
): Promise<Response> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	};

	// Forward session cookies for authentication
	// Defensive check: ensure request has headers property with get method
	if (request?.headers && typeof request.headers.get === 'function') {
		const cookieHeader = request.headers.get('cookie');
		if (cookieHeader) {
			headers['Cookie'] = cookieHeader;
		}
	}

	return fetch(endpoint, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			query,
			variables: variables || {}
		})
	});
}
