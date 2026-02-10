import { logger } from '$lib/utils/logger';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

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
	(process.env.PUBLIC_API_URL ? `${process.env.PUBLIC_API_URL}/graphql` : null) ||
	'http://hr-graphql-rust:4000/graphql';

export const POST: RequestHandler = async ({ request, cookies }) => {
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

		// Forward cookies to backend for session authentication
		if (cookieHeader) {
			headers['Cookie'] = cookieHeader;
		}

		// Forward GraphQL request to Rust GraphQL backend
		const backendResponse = await fetch(GRAPHQL_BACKEND_URL, {
			method: 'POST',
			headers,
			credentials: 'include',
			body: JSON.stringify({
				query,
				variables: variables || {},
				operationName
			})
		});

		const result = await backendResponse.json();

		// Log errors for debugging
		if (result.errors || !backendResponse.ok) {
			logger.error('[GraphQL Proxy] Backend returned error:', {
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
		logger.error('GraphQL Proxy Error:', error as Error);
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
