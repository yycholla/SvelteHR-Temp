/**
 * Factory for creating TimeOffBalanceService instances
 *
 * Wires together:
 * - URQL client with authentication cookies
 * - GraphQL adapter (implements TimeOffBalanceRepository port)
 * - TimeOffBalanceService (business logic layer)
 */

import type { RequestEvent } from '@sveltejs/kit';
import type { Client } from '@urql/core';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import { GraphQLAdapter } from '$adapters/graphql/GraphQLAdapter';
import { GraphQLTimeOffBalanceAdapter } from '$adapters/graphql/GraphQLTimeOffBalanceAdapter';
import { TimeOffBalanceService } from '$services/TimeOffBalanceService';

/**
 * Create a TimeOffBalanceService instance for the current request
 *
 * Wires together:
 * - URQL client with authentication cookies
 * - GraphQLAdapter wrapper (implements GraphQLPort interface)
 * - GraphQLTimeOffBalanceAdapter (implements TimeOffBalanceRepository port)
 * - TimeOffBalanceService (business logic layer)
 *
 * @param event - SvelteKit RequestEvent with cookies and fetch
 * @returns Configured TimeOffBalanceService instance
 *
 * @example
 * ```typescript
 * // In +page.server.ts:
 * export const load: PageServerLoad = async (event) => {
 *   const service = createTimeOffBalanceService(event);
 *   const result = await service.getByEmployeeId(userId);
 *
 *   if (result.isError) {
 *     throw error(500, result.error.message);
 *   }
 *
 *   return { balances: result.value };
 * };
 * ```
 */
export function createTimeOffBalanceService(event: RequestEvent): TimeOffBalanceService {
	// Extract cookies from request for server-side authentication
	const cookieHeader = serializeCookies(event.cookies);

	// Create urql client with session cookies for authentication
	const client = createUrqlClient(event.fetch, event.locals.accessToken, undefined, cookieHeader);

	// Wrap in GraphQLAdapter to properly implement GraphQLPort interface
	const graphql = new GraphQLAdapter(client);

	// Create time off balance repository adapter
	const repository = new GraphQLTimeOffBalanceAdapter(graphql);

	// Return configured service
	return new TimeOffBalanceService(repository);
}

/**
 * Create a TimeOffBalanceService with a pre-configured client
 *
 * Useful for testing or when you already have a configured client.
 *
 * @param client - Pre-configured urql Client instance
 * @returns Configured TimeOffBalanceService instance
 *
 * @example
 * ```typescript
 * // In tests:
 * const mockClient = createMockUrqlClient();
 * const service = createTimeOffBalanceServiceWithClient(mockClient);
 * ```
 */
export function createTimeOffBalanceServiceWithClient(client: Client): TimeOffBalanceService {
	const graphql = new GraphQLAdapter(client);
	const repository = new GraphQLTimeOffBalanceAdapter(graphql);
	return new TimeOffBalanceService(repository);
}
