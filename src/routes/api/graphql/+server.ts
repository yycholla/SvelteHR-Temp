import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * PostGraphile GraphQL Proxy for SvelteHR
 *
 * Secure proxy that forwards GraphQL requests to PostGraphile with proper JWT authentication
 * - Extracts JWT tokens from httpOnly cookies for security
 * - Forwards requests with Authorization header to PostGraphile
 * - Implements security headers and validation
 */

const POSTGRAPHILE_URL = 'http://localhost:4001/graphql';

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

		// Get JWT token from httpOnly cookie (more secure than localStorage)
		const token = cookies.get('jwt-token');

		// Prepare headers for PostGraphile request
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		// Add JWT token to Authorization header if available
		if (token) {
			headers['Authorization'] = `Bearer ${token}`;
		}

		// Forward GraphQL request to PostGraphile
		const postgraphileResponse = await fetch(POSTGRAPHILE_URL, {
			method: 'POST',
			headers,
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
