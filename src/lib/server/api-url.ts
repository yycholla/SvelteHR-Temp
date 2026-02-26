/**
 * Server-side API URL configuration
 * Automatically detects containerized environment and uses appropriate backend URL
 */

import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { print } from 'graphql';
import type { TypedDocumentNode } from '@urql/core';
import { existsSync } from 'node:fs';

const RUNNING_IN_CONTAINER = existsSync('/.dockerenv');
const DOCKER_ONLY_HOSTS = new Set(['hr-graphql-rust']);

function normalizeUrl(rawUrl: string): string {
	const parsed = new URL(rawUrl);

	// Local host development can fail on IPv6 localhost resolution in some setups.
	if (!RUNNING_IN_CONTAINER && parsed.hostname === 'localhost') {
		parsed.hostname = '127.0.0.1';
	}

	// Docker service DNS names are not resolvable from host-native processes.
	if (!RUNNING_IN_CONTAINER && DOCKER_ONLY_HOSTS.has(parsed.hostname)) {
		parsed.hostname = '127.0.0.1';
	}

	return parsed.toString().replace(/\/$/, '');
}

function ensureGraphQLEndpoint(rawUrl: string): string {
	const parsed = new URL(normalizeUrl(rawUrl));
	const path = parsed.pathname.replace(/\/$/, '');

	if (!path || path === '') {
		parsed.pathname = '/graphql';
	} else if (path !== '/graphql' && !path.endsWith('/graphql')) {
		parsed.pathname = `${path}/graphql`;
	} else {
		parsed.pathname = path;
	}

	return parsed.toString().replace(/\/$/, '');
}

function toApiBaseUrl(rawUrl: string): string {
	const parsed = new URL(normalizeUrl(rawUrl));
	const path = parsed.pathname.replace(/\/$/, '');

	if (path === '/graphql') {
		parsed.pathname = '';
	} else {
		parsed.pathname = path;
	}

	return parsed.toString().replace(/\/$/, '');
}

/**
 * Get the GraphQL API URL for server-side requests
 *
 * In containerized environment: Uses hr-graphql-rust:4000 (Docker service name)
 * On host: Uses localhost:4000
 */
export function getGraphQLEndpoint(): string {
	const explicitGraphqlUrl = env.GRAPHQL_URL || process.env.GRAPHQL_URL;
	if (explicitGraphqlUrl) {
		return ensureGraphQLEndpoint(explicitGraphqlUrl);
	}

	const containerApiUrl = env.VITE_API_URL || publicEnv.PUBLIC_API_URL;
	if (containerApiUrl) {
		return ensureGraphQLEndpoint(containerApiUrl);
	}

	return 'http://127.0.0.1:4000/graphql';
}

/**
 * Get the base API URL (without /graphql path)
 */
export function getApiBaseUrl(): string {
	const containerApiUrl = env.VITE_API_URL || publicEnv.PUBLIC_API_URL;
	if (containerApiUrl) {
		return toApiBaseUrl(containerApiUrl);
	}

	const explicitGraphqlUrl = env.GRAPHQL_URL || process.env.GRAPHQL_URL;
	if (explicitGraphqlUrl) {
		return toApiBaseUrl(explicitGraphqlUrl);
	}

	return 'http://127.0.0.1:4000';
}

/**
 * Check if running in containerized environment
 */
export function isContainerized(): boolean {
	return RUNNING_IN_CONTAINER;
}

/**
 * Make an authenticated GraphQL request with session cookies forwarded
 */
export async function authenticatedGraphQLRequest(
	endpoint: string,
	query: TypedDocumentNode | string,
	variables?: Record<string, unknown>,
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

	// Convert TypedDocumentNode to string if needed
	const queryString = typeof query === 'string' ? query : print(query);

	return fetch(endpoint, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			query: queryString,
			variables: variables ?? {}
		})
	});
}
