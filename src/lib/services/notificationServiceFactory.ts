/**
 * Factory for creating NotificationService instances
 *
 * Wires together:
 * - URQL client with authentication cookies
 * - GraphQL adapter (implements NotificationRepository port)
 * - NotificationService (business logic layer)
 */

import type { RequestEvent } from '@sveltejs/kit';
import type { Client } from '@urql/core';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import { GraphQLAdapter } from '$adapters/graphql/GraphQLAdapter';
import { GraphQLNotificationAdapter } from '$adapters/graphql/GraphQLNotificationAdapter';
import { NotificationService } from '$services/NotificationService';

/**
 * Create a NotificationService instance for the current request
 *
 * Wires together:
 * - URQL client with authentication cookies
 * - GraphQLAdapter wrapper (implements GraphQLPort interface)
 * - GraphQLNotificationAdapter (implements NotificationRepository port)
 * - NotificationService (business logic layer)
 *
 * @param event - SvelteKit RequestEvent with cookies and fetch
 * @returns Configured NotificationService instance
 *
 * @example
 * ```typescript
 * // In +page.server.ts:
 * export const load: PageServerLoad = async (event) => {
 *   const service = createNotificationService(event);
 *   const result = await service.getNotificationsForRecipient(userId);
 *
 *   if (result.isError) {
 *     throw error(500, result.error.message);
 *   }
 *
 *   return { notifications: result.value };
 * };
 * ```
 */
export function createNotificationService(event: RequestEvent): NotificationService {
	// Extract cookies from request for server-side authentication
	const cookieHeader = serializeCookies(event.cookies);

	// Create urql client with session cookies for authentication
	const client = createUrqlClient(event.fetch, undefined, undefined, cookieHeader);

	// Wrap in GraphQLAdapter to properly implement GraphQLPort interface
	const graphql = new GraphQLAdapter(client);

	// Create notification repository adapter
	const repository = new GraphQLNotificationAdapter(graphql);

	// Return configured service
	return new NotificationService(repository);
}

/**
 * Create a NotificationService with a pre-configured client
 *
 * Useful for testing or when you already have a configured client.
 *
 * @param client - Pre-configured urql Client instance
 * @returns Configured NotificationService instance
 *
 * @example
 * ```typescript
 * // In tests:
 * const mockClient = createMockUrqlClient();
 * const service = createNotificationServiceWithClient(mockClient);
 * ```
 */
export function createNotificationServiceWithClient(client: Client): NotificationService {
	const graphql = new GraphQLAdapter(client);
	const repository = new GraphQLNotificationAdapter(graphql);
	return new NotificationService(repository);
}
