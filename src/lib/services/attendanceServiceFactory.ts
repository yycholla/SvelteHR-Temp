// src/lib/services/attendanceServiceFactory.ts
import type { RequestEvent } from '@sveltejs/kit';
import type { Client } from '@urql/core';
import { AttendanceService } from '$services/AttendanceService';
import { GraphQLAttendanceAdapter } from '$adapters/graphql/GraphQLAttendanceAdapter';
import { GraphQLAdapter } from '$adapters/graphql/GraphQLAdapter';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

/**
 * Create AttendanceService instance for the current request
 *
 * Wires together:
 * - URQL client with authentication cookies
 * - GraphQLAdapter wrapper (implements GraphQLPort interface)
 * - GraphQLAttendanceAdapter (implements AttendanceRepository port)
 * - AttendanceService (business logic layer)
 *
 * @param event - SvelteKit request event containing cookies for authentication
 * @returns Configured AttendanceService instance
 *
 * @example
 * ```typescript
 * // In +page.server.ts
 * export const load: PageServerLoad = async (event) => {
 *   const attendanceService = createAttendanceService(event);
 *   const result = await attendanceService.getAllAttendance();
 *
 *   if (result.isError) {
 *     throw error(500, result.error.message);
 *   }
 *
 *   return { attendances: result.value };
 * };
 * ```
 */
export function createAttendanceService(event: RequestEvent): AttendanceService {
	// Extract cookies from request for server-side authentication
	const cookieHeader = serializeCookies(event.cookies);

	// Create urql client with session cookies for authentication
	const client = createUrqlClient(event.fetch, undefined, undefined, cookieHeader);

	// Wrap in GraphQLAdapter to properly implement GraphQLPort interface
	const graphql = new GraphQLAdapter(client);

	// Create attendance repository adapter
	const repository = new GraphQLAttendanceAdapter(graphql);

	// Return configured service
	return new AttendanceService(repository);
}

/**
 * Create AttendanceService with a pre-configured client
 *
 * Useful for testing or when you already have a configured client.
 *
 * @param client - Pre-configured urql Client instance
 * @returns Configured AttendanceService instance
 *
 * @example
 * ```typescript
 * // In tests:
 * const mockClient = createMockUrqlClient();
 * const service = createAttendanceServiceWithClient(mockClient);
 * ```
 */
export function createAttendanceServiceWithClient(client: Client): AttendanceService {
	const graphql = new GraphQLAdapter(client);
	const repository = new GraphQLAttendanceAdapter(graphql);
	return new AttendanceService(repository);
}
