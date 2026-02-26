// src/lib/services/skillServiceFactory.ts
import type { RequestEvent } from '@sveltejs/kit';
import type { Client } from '@urql/core';
import { SkillService } from '$services/SkillService';
import { GraphQLSkillAdapter } from '$adapters/graphql/GraphQLSkillAdapter';
import { GraphQLAdapter } from '$adapters/graphql/GraphQLAdapter';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

/**
 * Create SkillService instance for the current request.
 *
 * Wires together:
 * - URQL client with authentication cookies
 * - GraphQLAdapter wrapper (implements GraphQLPort interface)
 * - GraphQLSkillAdapter (implements SkillRepository port)
 * - SkillService (business logic layer)
 *
 * @param event - SvelteKit request event containing cookies for authentication
 * @returns Configured SkillService instance
 *
 * @example
 * ```typescript
 * // In +page.server.ts
 * export const load: PageServerLoad = async (event) => {
 *   const skillService = createSkillService(event);
 *   const result = await skillService.getByEmployeeId('employee-uuid');
 *
 *   if (result.isError) {
 *     throw error(500, result.error.message);
 *   }
 *
 *   return { skills: result.value };
 * };
 * ```
 */
export function createSkillService(event: RequestEvent): SkillService {
	// Extract cookies from request for server-side authentication
	const cookieHeader = serializeCookies(event.cookies);

	// Create urql client with session cookies for authentication
	const client = createUrqlClient(event.fetch, event.locals.accessToken, undefined, cookieHeader);

	// Wrap in GraphQLAdapter to properly implement GraphQLPort interface
	const graphql = new GraphQLAdapter(client);

	// Create skill repository adapter
	const repository = new GraphQLSkillAdapter(graphql);

	// Return configured service
	return new SkillService(repository);
}

/**
 * Create SkillService with a pre-configured GraphQLPort.
 *
 * Useful for testing or when you already have a configured port.
 *
 * @param graphql - Pre-configured GraphQLPort instance
 * @returns Configured SkillService instance
 *
 * @example
 * ```typescript
 * // In tests:
 * const mockGraphQL = createMockGraphQLPort();
 * const service = createSkillServiceWithClient(mockGraphQL);
 * ```
 */
export function createSkillServiceWithClient(client: Client): SkillService {
	const graphql = new GraphQLAdapter(client);
	const repository = new GraphQLSkillAdapter(graphql);
	return new SkillService(repository);
}

/**
 * Create SkillService with a pre-configured GraphQLPort directly.
 *
 * Useful for testing with mock GraphQL ports.
 *
 * @param graphql - Pre-configured GraphQLPort instance
 * @returns Configured SkillService instance
 */
export function createSkillServiceWithPort(graphql: GraphQLPort): SkillService {
	const repository = new GraphQLSkillAdapter(graphql);
	return new SkillService(repository);
}
