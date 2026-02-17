// src/lib/services/emergencyContactServiceFactory.ts
import type { RequestEvent } from '@sveltejs/kit';
import type { Client } from '@urql/core';
import { EmergencyContactService } from '$services/EmergencyContactService';
import { GraphQLEmergencyContactAdapter } from '$adapters/graphql/GraphQLEmergencyContactAdapter';
import { GraphQLAdapter } from '$adapters/graphql/GraphQLAdapter';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

/**
 * Create EmergencyContactService instance for the current request.
 *
 * Wires together:
 * - URQL client with authentication cookies
 * - GraphQLAdapter wrapper (implements GraphQLPort interface)
 * - GraphQLEmergencyContactAdapter (implements EmergencyContactRepository port)
 * - EmergencyContactService (business logic layer)
 *
 * @param event - SvelteKit request event containing cookies for authentication
 * @returns Configured EmergencyContactService instance
 *
 * @example
 * ```typescript
 * // In +page.server.ts
 * export const load: PageServerLoad = async (event) => {
 *   const emergencyContactService = createEmergencyContactService(event);
 *   const result = await emergencyContactService.getByEmployeeId('employee-uuid');
 *
 *   if (result.isError) {
 *     throw error(500, result.error.message);
 *   }
 *
 *   return { contacts: result.value };
 * };
 * ```
 */
export function createEmergencyContactService(event: RequestEvent): EmergencyContactService {
	// Extract cookies from request for server-side authentication
	const cookieHeader = serializeCookies(event.cookies);

	// Create urql client with session cookies for authentication
	const client = createUrqlClient(event.fetch, undefined, undefined, cookieHeader);

	// Wrap in GraphQLAdapter to properly implement GraphQLPort interface
	const graphql = new GraphQLAdapter(client);

	// Create emergency contact repository adapter
	const repository = new GraphQLEmergencyContactAdapter(graphql);

	// Return configured service
	return new EmergencyContactService(repository);
}

/**
 * Create EmergencyContactService with a pre-configured URQL client.
 *
 * Useful for testing or when you already have a configured client.
 *
 * @param client - Pre-configured urql Client instance
 * @returns Configured EmergencyContactService instance
 *
 * @example
 * ```typescript
 * // In tests:
 * const mockClient = createMockUrqlClient();
 * const service = createEmergencyContactServiceWithClient(mockClient);
 * ```
 */
export function createEmergencyContactServiceWithClient(client: Client): EmergencyContactService {
	const graphql = new GraphQLAdapter(client);
	const repository = new GraphQLEmergencyContactAdapter(graphql);
	return new EmergencyContactService(repository);
}
