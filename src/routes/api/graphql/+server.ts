import { logger } from '$lib/utils/logger';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getGraphQLEndpoint } from '$lib/server/api-url.js';
import { refreshWithBackend } from '$lib/server/auth/jwt-backend.js';

/**
 * GraphQL Proxy for SvelteHR
 *
 * Secure proxy that forwards GraphQL requests to Rust GraphQL backend (Sea-ORM + async-graphql) with session authentication
 * - Forwards session cookies from browser to backend
 * - Implements security headers and validation
 * - Enables client-side GraphQL mutations with proper authentication
 */

const GRAPHQL_BACKEND_URL =
	process.env.POSTGRAPHILE_URL || // Legacy support
	process.env.GRAPHQL_URL ||
	getGraphQLEndpoint();

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function getBackendCandidates(): string[] {
	const candidates = [GRAPHQL_BACKEND_URL];

	if (GRAPHQL_BACKEND_URL.includes('localhost')) {
		candidates.push(GRAPHQL_BACKEND_URL.replace('localhost', '127.0.0.1'));
	}
	if (GRAPHQL_BACKEND_URL.includes('127.0.0.1')) {
		candidates.push(GRAPHQL_BACKEND_URL.replace('127.0.0.1', 'localhost'));
	}

	const hostFallback = 'http://127.0.0.1:4000/graphql';
	if (!candidates.includes(hostFallback)) {
		candidates.push(hostFallback);
	}

	return candidates;
}

async function fetchGraphQLBackend(
	headers: Record<string, string>,
	body: string
): Promise<{ response: Response; endpoint: string }> {
	let lastError: unknown;

	for (const endpoint of getBackendCandidates()) {
		try {
			const response = await fetch(endpoint, {
				method: 'POST',
				headers,
				credentials: 'include',
				body
			});
			return { response, endpoint };
		} catch (error) {
			lastError = error;
			logger.warn('[GraphQL Proxy] Backend endpoint unreachable', {
				endpoint,
				message: error instanceof Error ? error.message : String(error)
			});
		}
	}

	throw lastError instanceof Error ? lastError : new Error('All GraphQL backend endpoints failed');
}

function getCookieValue(cookieHeader: string, cookieName: string): string | null {
	const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`));
	return match ? decodeURIComponent(match[1]) : null;
}

export const POST: RequestHandler = async ({ request, cookies, url, getClientAddress }) => {
	try {
		const { query, variables, operationName } = await request.json();

		// Input validation
		if (!query || typeof query !== 'string') {
			return json({ errors: [{ message: 'Valid GraphQL query is required' }] }, { status: 400 });
		}

		// Security: Basic query validation (prevent malicious queries)
		if (query.length > 10000) {
			return json({ errors: [{ message: 'Query too large' }] }, { status: 413 });
		}

		// Get all cookies from the request to forward to backend
		const cookieHeader = request.headers.get('cookie');

		// Prepare headers for GraphQL backend request
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		// Forward Authorization header for JWT bearer token auth (if present)
		const authorizationHeader = request.headers.get('authorization');
		if (authorizationHeader) {
			headers['Authorization'] = authorizationHeader;
		} else {
			const cookieToken = getCookieValue(cookieHeader || '', 'access_token');
			if (cookieToken) {
				headers['Authorization'] = `Bearer ${cookieToken}`;
			}
		}

		// Forward cookies to backend for session authentication
		if (cookieHeader) {
			headers['Cookie'] = cookieHeader;
		}

		const backendBody = JSON.stringify({
			query,
			variables: variables || {},
			operationName
		});

		// Forward GraphQL request to Rust GraphQL backend (with endpoint fallback for host/container DNS differences)
		let { response: backendResponse, endpoint: usedEndpoint } = await fetchGraphQLBackend(
			headers,
			backendBody
		);

		// Attempt one silent refresh on unauthorized responses, then retry once.
		if (backendResponse.status === 401) {
			const refreshToken = cookies.get('refresh_token');
			const refreshTokenPlaintext = cookies.get('refresh_token_plaintext');

			if (refreshToken && refreshTokenPlaintext) {
				const refreshResult = await refreshWithBackend({
					refreshToken,
					refreshTokenPlaintext,
					deviceInfo: request.headers.get('user-agent') || undefined,
					ipAddress: getClientAddress()
				});

				if (refreshResult.success) {
					const secure = url.protocol === 'https:';
					const sameSite: 'lax' = 'lax';
					const refreshMaxAge = 7 * 24 * 60 * 60;

					cookies.set('refresh_token', refreshResult.tokens.refreshToken, {
						path: '/',
						maxAge: refreshMaxAge,
						httpOnly: true,
						secure,
						sameSite
					});
					cookies.set('refresh_token_plaintext', refreshResult.tokens.refreshTokenPlaintext, {
						path: '/',
						maxAge: refreshMaxAge,
						httpOnly: true,
						secure,
						sameSite
					});

					headers['Authorization'] = `Bearer ${refreshResult.tokens.accessToken}`;
					const retryResult = await fetchGraphQLBackend(headers, backendBody);
					backendResponse = retryResult.response;
					usedEndpoint = retryResult.endpoint;
				}
			}
		}

		const rawResponse = await backendResponse.text();
		let result: Record<string, unknown>;
		try {
			const parsed: unknown = rawResponse ? JSON.parse(rawResponse) : {};
			result = isRecord(parsed) ? parsed : { data: parsed };
		} catch {
			result = {
				errors: [
					{
						message: 'Invalid JSON response from GraphQL backend',
						extensions: { code: 'INVALID_BACKEND_RESPONSE' }
					}
				]
			};
		}

		// Log errors for debugging
		if (result.errors || !backendResponse.ok) {
			logger.error('[GraphQL Proxy] Backend returned error', undefined, {
				endpoint: usedEndpoint,
				status: backendResponse.status,
				errors: result.errors,
				query: query.substring(0, 200), // First 200 chars of query
				operationName
			});
		}

		// Return the result from Rust GraphQL backend
		return json(result, {
			status: backendResponse.status,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	} catch (error) {
		const cause = error instanceof Error ? error.cause : undefined;
		logger.error('GraphQL Proxy Error:', error as Error, {
			backendEndpoint: GRAPHQL_BACKEND_URL,
			cause: cause instanceof Error ? cause.message : String(cause ?? '')
		});
		return json(
			{
				errors: [
					{
						message: error instanceof Error ? error.message : 'Internal server error',
						extensions: { code: 'INTERNAL_ERROR' }
					}
				]
			},
			{ status: 500 }
		);
	}
};

export const GET: RequestHandler = async () => {
	return json({
		message: 'SvelteHR GraphQL API - Rust GraphQL Backend Proxy',
		endpoint: '/api/graphql',
		backendEndpoint: GRAPHQL_BACKEND_URL,
		description:
			'This endpoint proxies GraphQL requests to Rust GraphQL backend with session authentication',
		examples: {
			getAllUsers: 'query { allUsers { nodes { id email displayName } } }',
			getUserById: 'query($id: UUID!) { userById(id: $id) { id email displayName } }',
			createUser:
				'mutation($input: CreateUserInput!) { createUser(input: $input) { user { id email } } }'
		}
	});
};
