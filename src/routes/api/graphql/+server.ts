import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GraphQL Proxy for SvelteHR
 *
 * Secure proxy that forwards GraphQL requests to Rust GraphQL backend with session authentication
 * - Forwards session cookies from browser to backend
 * - Implements security headers and validation
 * - Enables client-side GraphQL mutations with proper authentication
 */

import { env } from '$env/dynamic/private';

const POSTGRAPHILE_URL =
	env.POSTGRAPHILE_URL ||
	env.GRAPHQL_URL ||
	env.PUBLIC_API_URL ||
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
		const postgraphileResponse = await fetch(POSTGRAPHILE_URL, {
			method: 'POST',
			headers,
			credentials: 'include',
			body: JSON.stringify({
				query,
				variables: variables || {},
				operationName
			})
		});

		const result = await postgraphileResponse.json();

		// Return the result from PostGraphile
		return json(result, {
			status: postgraphileResponse.status,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	} catch (error) {
		console.error('GraphQL Proxy Error:', error);
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
		message: 'SvelteHR GraphQL API - PostGraphile Proxy',
		endpoint: '/api/graphql',
		postgraphileEndpoint: POSTGRAPHILE_URL,
		description: 'This endpoint proxies GraphQL requests to PostGraphile with JWT authentication',
		examples: {
			getAllUsers: 'query { allUsers { nodes { id email displayName } } }',
			getUserById: 'query($id: UUID!) { userById(id: $id) { id email displayName } }',
			createUser:
				'mutation($input: CreateUserInput!) { createUser(input: $input) { user { id email } } }'
		}
	});
};
