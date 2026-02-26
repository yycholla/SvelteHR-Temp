/**
 * Factory for creating HrReportService instances
 *
 * Wires together:
 * - URQL client with authentication cookies
 * - GraphQL adapter (implements HrReportRepository port)
 * - HrReportService (business logic layer)
 */

import type { RequestEvent } from '@sveltejs/kit';
import type { Client } from '@urql/core';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import { GraphQLAdapter } from '$adapters/graphql/GraphQLAdapter';
import { GraphQLHrReportAdapter } from '$adapters/graphql/GraphQLHrReportAdapter';
import { HrReportService } from '$services/HrReportService';

/**
 * Create an HrReportService instance for the current request.
 *
 * Wires together:
 * - URQL client with authentication cookies
 * - GraphQLAdapter wrapper (implements GraphQLPort interface)
 * - GraphQLHrReportAdapter (implements HrReportRepository port)
 * - HrReportService (business logic layer)
 *
 * @param event - SvelteKit RequestEvent with cookies and fetch
 * @returns Configured HrReportService instance
 *
 * @example
 * ```typescript
 * // In +page.server.ts:
 * export const load: PageServerLoad = async (event) => {
 *   const service = createHrReportService(event);
 *   const result = await service.getAll();
 *
 *   if (result.isError) {
 *     throw error(500, result.error.message);
 *   }
 *
 *   return { reports: result.value };
 * };
 * ```
 */
export function createHrReportService(event: RequestEvent): HrReportService {
	// Extract cookies from request for server-side authentication
	const cookieHeader = serializeCookies(event.cookies);

	// Create urql client with session cookies for authentication
	const client = createUrqlClient(event.fetch, event.locals?.accessToken, undefined, cookieHeader);

	// Wrap in GraphQLAdapter to properly implement GraphQLPort interface
	const graphql = new GraphQLAdapter(client);

	// Create report repository adapter
	const repository = new GraphQLHrReportAdapter(graphql);

	// Return configured service
	return new HrReportService(repository);
}

/**
 * Create an HrReportService with a pre-configured client.
 *
 * Useful for testing or when you already have a configured client.
 *
 * @param client - Pre-configured urql Client instance
 * @returns Configured HrReportService instance
 *
 * @example
 * ```typescript
 * // In tests:
 * const mockClient = createClient({ url: 'http://localhost:4000/graphql', exchanges: [] });
 * const service = createHrReportServiceWithClient(mockClient);
 * ```
 */
export function createHrReportServiceWithClient(client: Client): HrReportService {
	const graphql = new GraphQLAdapter(client);
	const repository = new GraphQLHrReportAdapter(graphql);
	return new HrReportService(repository);
}
