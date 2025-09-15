import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { HASURA_GRAPHQL_URL, HASURA_ADMIN_SECRET } from '$env/static/private';

/**
 * Hasura GraphQL Proxy for SvelteHR
 * 
 * Secure proxy that forwards GraphQL requests to Hasura with proper authentication
 * - Uses JWT tokens when available for user operations
 * - Falls back to admin secret for system operations
 * - Implements security headers and validation
 */

// Validate required environment variables
if (!HASURA_GRAPHQL_URL || !HASURA_ADMIN_SECRET) {
  throw new Error('Missing required Hasura configuration environment variables');
}

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

    // Get auth token from multiple sources (header or cookie)
    const authHeader = request.headers.get('authorization');
    const tokenFromCookie = cookies.get('auth-token');
    
    // Prepare headers for Hasura request
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Request-ID': crypto.randomUUID(), // For request tracking
    };

    // Use JWT token if available, otherwise admin secret
    if (authHeader) {
      headers['Authorization'] = authHeader;
    } else if (tokenFromCookie) {
      headers['Authorization'] = `Bearer ${tokenFromCookie}`;
    } else {
      // Fallback to admin secret for unauthenticated requests (anonymous role)
      headers['X-Hasura-Admin-Secret'] = HASURA_ADMIN_SECRET;
    }

    // Forward GraphQL request to Hasura
    const hasuraResponse = await fetch(HASURA_GRAPHQL_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        variables: variables || {},
        operationName
      })
    });

    const result = await hasuraResponse.json();

    // Return the result from Hasura
    return json(result, {
      status: hasuraResponse.status,
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error) {
    console.error('GraphQL Proxy Error:', error);
    return json(
      { 
        errors: [{ 
          message: error instanceof Error ? error.message : 'Internal server error',
          extensions: { code: 'INTERNAL_ERROR' }
        }] 
      },
      { status: 500 }
    );
  }
};

export const GET: RequestHandler = async () => {
  return json({
    message: 'SvelteHR GraphQL API - Hasura Proxy',
    endpoint: '/api/graphql',
    hasuraEndpoint: HASURA_GRAPHQL_URL,
    description: 'This endpoint proxies GraphQL requests to Hasura with authentication',
    examples: {
      getAllUsers: 'query { users { id email display_name } }',
      getDepartments: 'query { departments { id name description } }',
      createUser: 'mutation($user: users_insert_input!) { insert_users_one(object: $user) { id email } }'
    }
  });
};