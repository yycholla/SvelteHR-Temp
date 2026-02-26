/**
 * Factory for creating CompensationService instances
 *
 * Wires together:
 * - URQL client with authentication cookies
 * - GraphQL adapter (implements CompensationRepository port)
 * - CompensationService (business logic layer)
 */

import type { RequestEvent } from '@sveltejs/kit';
import type { Client } from '@urql/core';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import { GraphQLAdapter } from '$adapters/graphql/GraphQLAdapter';
import { GraphQLCompensationAdapter } from '$adapters/graphql/GraphQLCompensationAdapter';
import { CompensationService } from '$services/CompensationService';

/**
 * Create a CompensationService instance for the current request
 *
 * Wires together:
 * - URQL client with authentication cookies
 * - GraphQLAdapter wrapper (implements GraphQLPort interface)
 * - GraphQLCompensationAdapter (implements CompensationRepository port)
 * - CompensationService (business logic layer)
 *
 * @param event - SvelteKit RequestEvent with cookies and fetch
 * @returns Configured CompensationService instance
 *
 * @example
 * ```typescript
 * // In +page.server.ts:
 * export const load: PageServerLoad = async (event) => {
 *   const service = createCompensationService(event);
 *   const result = await service.getByEmployeeId(userId);
 *
 *   if (result.isError) {
 *     throw error(500, result.error.message);
 *   }
 *
 *   return { compensations: result.value };
 * };
 * ```
 */
export function createCompensationService(event: RequestEvent): CompensationService {
	// Extract cookies from request for server-side authentication
	const cookieHeader = serializeCookies(event.cookies);

	// Create urql client with session cookies for authentication
	const client = createUrqlClient(event.fetch, event.locals.accessToken, undefined, cookieHeader);

	// Wrap in GraphQLAdapter to properly implement GraphQLPort interface
	const graphql = new GraphQLAdapter(client);

	// Create compensation repository adapter
	const repository = new GraphQLCompensationAdapter(graphql);

	// Return configured service
	return new CompensationService(repository);
}

/**
 * Create a CompensationService with a pre-configured client
 *
 * Useful for testing or when you already have a configured client.
 *
 * @param client - Pre-configured urql Client instance
 * @returns Configured CompensationService instance
 *
 * @example
 * ```typescript
 * // In tests:
 * const mockClient = createMockUrqlClient();
 * const service = createCompensationServiceWithClient(mockClient);
 * ```
 */
export function createCompensationServiceWithClient(client: Client): CompensationService {
	const graphql = new GraphQLAdapter(client);
	const repository = new GraphQLCompensationAdapter(graphql);
	return new CompensationService(repository);
}
