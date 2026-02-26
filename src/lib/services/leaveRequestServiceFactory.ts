// src/lib/services/leaveRequestServiceFactory.ts
import type { RequestEvent } from '@sveltejs/kit';
import { LeaveRequestService } from '$services/LeaveRequestService';
import { GraphQLLeaveRequestAdapter } from '$adapters/GraphQLLeaveRequestAdapter';
import { GraphQLAdapter } from '$adapters/graphql/GraphQLAdapter';
import { createUrqlClient } from '$lib/graphql/client';
import type { Client } from '@urql/core';

/**
 * Factory function to create a LeaveRequestService with GraphQL repository adapter
 *
 * This function creates a properly configured LeaveRequestService instance with:
 * - GraphQL client configured with session cookies for authentication
 * - GraphQLLeaveRequestAdapter as the repository implementation
 *
 * @param event - SvelteKit RequestEvent (provides cookies for auth)
 * @returns Configured LeaveRequestService instance
 *
 * @example
 * ```typescript
 * // In +page.server.ts:
 * export const load: PageServerLoad = async (event) => {
 *   const leaveRequestService = createLeaveRequestService(event);
 *   const result = await leaveRequestService.getLeaveRequests();
 *
 *   if (result.isError) {
 *     throw error(500, result.error.message);
 *   }
 *
 *   return { leaveRequests: result.value };
 * };
 * ```
 */
export function createLeaveRequestService(event: RequestEvent): LeaveRequestService {
	// Extract cookies from request for server-side authentication
	const cookieHeader = event.request.headers.get('cookie') || '';

	// Create urql client with session cookies for authentication
	const client = createUrqlClient(event.fetch, event.locals?.accessToken, undefined, cookieHeader);

	// Wrap urql client to match GraphQLPort contract expected by repository adapters
	const repository = new GraphQLLeaveRequestAdapter(new GraphQLAdapter(client));

	// Return configured service
	return new LeaveRequestService(repository);
}

/**
 * Factory function to create a LeaveRequestService with a custom urql Client
 *
 * Useful for testing or when you already have a configured client instance.
 *
 * @param client - Pre-configured urql Client instance
 * @returns Configured LeaveRequestService instance
 *
 * @example
 * ```typescript
 * // In tests:
 * const mockClient = createMockUrqlClient();
 * const service = createLeaveRequestServiceWithClient(mockClient);
 * ```
 */
export function createLeaveRequestServiceWithClient(client: Client): LeaveRequestService {
	const repository = new GraphQLLeaveRequestAdapter(new GraphQLAdapter(client));
	return new LeaveRequestService(repository);
}
