// src/lib/services/vehicleServiceFactory.ts
import type { RequestEvent } from '@sveltejs/kit';
import type { Client } from '@urql/core';
import { VehicleService } from '$services/VehicleService';
import { GraphQLVehicleAdapter } from '$adapters/graphql/GraphQLVehicleAdapter';
import { GraphQLAdapter } from '$adapters/graphql/GraphQLAdapter';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

/**
 * Create VehicleService instance for the current request.
 *
 * Wires together:
 * - URQL client with authentication cookies
 * - GraphQLAdapter wrapper (implements GraphQLPort interface)
 * - GraphQLVehicleAdapter (implements VehicleRepository port)
 * - VehicleService (business logic layer)
 *
 * @param event - SvelteKit request event containing cookies for authentication
 * @returns Configured VehicleService instance
 *
 * @example
 * ```typescript
 * // In +page.server.ts
 * export const load: PageServerLoad = async (event) => {
 *   const vehicleService = createVehicleService(event);
 *   const result = await vehicleService.getByEmployeeId('employee-uuid');
 *
 *   if (result.isError) {
 *     throw error(500, result.error.message);
 *   }
 *
 *   return { vehicles: result.value };
 * };
 * ```
 */
export function createVehicleService(event: RequestEvent): VehicleService {
	// Extract cookies from request for server-side authentication
	const cookieHeader = serializeCookies(event.cookies);

	// Create urql client with session cookies for authentication
	const client = createUrqlClient(event.fetch, event.locals.accessToken, undefined, cookieHeader);

	// Wrap in GraphQLAdapter to properly implement GraphQLPort interface
	const graphql = new GraphQLAdapter(client);

	// Create vehicle repository adapter
	const repository = new GraphQLVehicleAdapter(graphql);

	// Return configured service
	return new VehicleService(repository);
}

/**
 * Create VehicleService with a pre-configured URQL client.
 *
 * Useful for testing or when you already have a configured client.
 *
 * @param client - Pre-configured urql Client instance
 * @returns Configured VehicleService instance
 *
 * @example
 * ```typescript
 * // In tests:
 * const mockClient = createMockUrqlClient();
 * const service = createVehicleServiceWithClient(mockClient);
 * ```
 */
export function createVehicleServiceWithClient(client: Client): VehicleService {
	const graphql = new GraphQLAdapter(client);
	const repository = new GraphQLVehicleAdapter(graphql);
	return new VehicleService(repository);
}
