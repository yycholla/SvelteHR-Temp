// src/lib/services/activityLogServiceFactory.ts
import type { RequestEvent } from '@sveltejs/kit';
import type { Client } from '@urql/core';
import { ActivityLogService } from '$services/ActivityLogService';
import { GraphQLActivityLogAdapter } from '$adapters/graphql/GraphQLActivityLogAdapter';
import { GraphQLAdapter } from '$adapters/graphql/GraphQLAdapter';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

/**
 * Create ActivityLogService instance for the current request.
 *
 * Wires together:
 * - URQL client with authentication cookies
 * - GraphQLAdapter wrapper (implements GraphQLPort interface)
 * - GraphQLActivityLogAdapter (implements ActivityLogRepository port)
 * - ActivityLogService (business logic layer)
 *
 * @param event - SvelteKit request event containing cookies for authentication
 * @returns Configured ActivityLogService instance
 *
 * @example
 * ```typescript
 * // In +page.server.ts
 * export const load: PageServerLoad = async (event) => {
 *   const activityLogService = createActivityLogService(event);
 *   const result = await activityLogService.getAll(50);
 *
 *   if (result.isError) {
 *     throw error(500, result.error.message);
 *   }
 *
 *   return { logs: result.value };
 * };
 * ```
 */
export function createActivityLogService(event: RequestEvent): ActivityLogService {
	// Extract cookies from request for server-side authentication
	const cookieHeader = serializeCookies(event.cookies);

	// Create urql client with session cookies for authentication
	const client = createUrqlClient(event.fetch, event.locals.accessToken, undefined, cookieHeader);

	// Wrap in GraphQLAdapter to properly implement GraphQLPort interface
	const graphql = new GraphQLAdapter(client);

	// Create activity log repository adapter
	const repository = new GraphQLActivityLogAdapter(graphql);

	// Return configured service
	return new ActivityLogService(repository);
}

/**
 * Create ActivityLogService with a pre-configured URQL client.
 *
 * Useful for testing or when you already have a configured client.
 *
 * @param client - Pre-configured urql Client instance
 * @returns Configured ActivityLogService instance
 *
 * @example
 * ```typescript
 * // In tests:
 * const mockClient = createMockUrqlClient();
 * const service = createActivityLogServiceWithClient(mockClient);
 * ```
 */
export function createActivityLogServiceWithClient(client: Client): ActivityLogService {
	const graphql = new GraphQLAdapter(client);
	const repository = new GraphQLActivityLogAdapter(graphql);
	return new ActivityLogService(repository);
}
