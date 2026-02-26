/**
 * Factory for creating TrainingService instances
 *
 * Wires together:
 * - URQL client with authentication cookies
 * - GraphQL adapter (implements TrainingRepository port)
 * - TrainingService (business logic layer)
 */

import type { RequestEvent } from '@sveltejs/kit';
import type { Client } from '@urql/core';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import { GraphQLAdapter } from '$adapters/graphql/GraphQLAdapter';
import { GraphQLTrainingAdapter } from '$adapters/graphql/GraphQLTrainingAdapter';
import { TrainingService } from '$services/TrainingService';

/**
 * Create a TrainingService instance for the current request.
 *
 * Wires together:
 * - URQL client with authentication cookies
 * - GraphQLAdapter wrapper (implements GraphQLPort interface)
 * - GraphQLTrainingAdapter (implements TrainingRepository port)
 * - TrainingService (business logic layer)
 *
 * @param event - SvelteKit RequestEvent with cookies and fetch
 * @returns Configured TrainingService instance
 *
 * @example
 * ```typescript
 * // In +page.server.ts:
 * export const load: PageServerLoad = async (event) => {
 *   const service = createTrainingService(event);
 *   const result = await service.getAll();
 *
 *   if (result.isError) {
 *     throw error(500, result.error.message);
 *   }
 *
 *   return { trainings: result.value };
 * };
 * ```
 */
export function createTrainingService(event: RequestEvent): TrainingService {
	// Extract cookies from request for server-side authentication
	const cookieHeader = serializeCookies(event.cookies);

	// Create urql client with session cookies for authentication
	const client = createUrqlClient(event.fetch, event.locals.accessToken, undefined, cookieHeader);

	// Wrap in GraphQLAdapter to properly implement GraphQLPort interface
	const graphql = new GraphQLAdapter(client);

	// Create training repository adapter
	const repository = new GraphQLTrainingAdapter(graphql);

	// Return configured service
	return new TrainingService(repository);
}

/**
 * Create a TrainingService with a pre-configured client.
 *
 * Useful for testing or when you already have a configured client.
 *
 * @param client - Pre-configured urql Client instance
 * @returns Configured TrainingService instance
 *
 * @example
 * ```typescript
 * // In tests:
 * const mockClient = createMockUrqlClient();
 * const service = createTrainingServiceWithClient(mockClient);
 * ```
 */
export function createTrainingServiceWithClient(client: Client): TrainingService {
	const graphql = new GraphQLAdapter(client);
	const repository = new GraphQLTrainingAdapter(graphql);
	return new TrainingService(repository);
}
