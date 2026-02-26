// src/lib/services/userSettingsServiceFactory.ts
import type { RequestEvent } from '@sveltejs/kit';
import type { Client } from '@urql/core';
import { UserSettingsService } from '$services/UserSettingsService';
import { GraphQLUserSettingsAdapter } from '$adapters/graphql/GraphQLUserSettingsAdapter';
import { GraphQLAdapter } from '$adapters/graphql/GraphQLAdapter';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

/**
 * Create UserSettingsService instance for the current request.
 *
 * Wires together:
 * - URQL client with authentication cookies
 * - GraphQLAdapter wrapper (implements GraphQLPort interface)
 * - GraphQLUserSettingsAdapter (implements UserSettingsRepository port)
 * - UserSettingsService (business logic layer)
 *
 * @param event - SvelteKit request event containing cookies for authentication
 * @returns Configured UserSettingsService instance
 *
 * @example
 * ```typescript
 * // In +page.server.ts
 * export const load: PageServerLoad = async (event) => {
 *   const userSettingsService = createUserSettingsService(event);
 *   const result = await userSettingsService.getByUserId(event.locals.user.id);
 *
 *   if (result.isError) {
 *     throw error(500, result.error.message);
 *   }
 *
 *   return { settings: result.value };
 * };
 * ```
 */
export function createUserSettingsService(event: RequestEvent): UserSettingsService {
	// Extract cookies from request for server-side authentication
	const cookieHeader = serializeCookies(event.cookies);

	// Create urql client with session cookies for authentication
	const client = createUrqlClient(event.fetch, event.locals.accessToken, undefined, cookieHeader);

	// Wrap in GraphQLAdapter to properly implement GraphQLPort interface
	const graphql = new GraphQLAdapter(client);

	// Create user settings repository adapter
	const repository = new GraphQLUserSettingsAdapter(graphql);

	// Return configured service
	return new UserSettingsService(repository);
}

/**
 * Create UserSettingsService with a pre-configured URQL client.
 *
 * Useful for testing or when you already have a configured client.
 *
 * @param client - Pre-configured urql Client instance
 * @returns Configured UserSettingsService instance
 *
 * @example
 * ```typescript
 * // In tests:
 * const mockClient = createMockUrqlClient();
 * const service = createUserSettingsServiceWithClient(mockClient);
 * ```
 */
export function createUserSettingsServiceWithClient(client: Client): UserSettingsService {
	const graphql = new GraphQLAdapter(client);
	const repository = new GraphQLUserSettingsAdapter(graphql);
	return new UserSettingsService(repository);
}

/**
 * Create UserSettingsService with a pre-configured GraphQLPort.
 *
 * Useful for testing with mock GraphQL ports.
 *
 * @param graphqlPort - Pre-configured GraphQLPort instance
 * @returns Configured UserSettingsService instance
 *
 * @example
 * ```typescript
 * // In tests:
 * const mockPort = new MockGraphQLPort();
 * const service = createUserSettingsServiceWithPort(mockPort);
 * ```
 */
export function createUserSettingsServiceWithPort(graphqlPort: GraphQLPort): UserSettingsService {
	const repository = new GraphQLUserSettingsAdapter(graphqlPort);
	return new UserSettingsService(repository);
}
