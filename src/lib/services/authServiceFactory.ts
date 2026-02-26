// src/lib/services/authServiceFactory.ts
import type { RequestEvent } from '@sveltejs/kit';
import { AuthService } from '$services/AuthService';
import { GraphQLAuthTokenAdapter } from '$adapters/graphql/GraphQLAuthTokenAdapter';
import { GraphQLAdapter } from '$adapters/graphql/GraphQLAdapter';
import { createUrqlClient } from '$lib/graphql/client';

/**
 * Factory function to create an AuthService with GraphQL repository adapter
 *
 * Creates a properly configured AuthService instance with:
 * - GraphQL client configured with session cookies for authentication
 * - GraphQLAuthTokenAdapter as the repository implementation
 *
 * @param event - SvelteKit RequestEvent (provides cookies for auth)
 * @returns Configured AuthService instance
 *
 * @example
 * ```typescript
 * // In +page.server.ts:
 * export const load: PageServerLoad = async (event) => {
 *   const authService = createAuthService(event);
 *   const result = await authService.refreshAccessToken();
 *
 *   if (result.isError) {
 *     throw redirect(303, '/login');
 *   }
 *
 *   return { tokens: result.value };
 * };
 * ```
 */
export function createAuthService(event: RequestEvent): AuthService {
	// Extract cookies from request for server-side authentication
	const cookieHeader = event.request.headers.get('cookie') || '';

	// Create urql client with session cookies
	const client = createUrqlClient(event.fetch, event.locals?.accessToken, undefined, cookieHeader);

	// Wrap in GraphQLAdapter to properly implement GraphQLPort interface
	const graphql = new GraphQLAdapter(client);

	// Create auth token repository adapter
	const repository = new GraphQLAuthTokenAdapter(graphql);

	// Return configured service
	return new AuthService(repository);
}
