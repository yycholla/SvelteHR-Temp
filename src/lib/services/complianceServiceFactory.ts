// src/lib/services/complianceServiceFactory.ts
import type { RequestEvent } from '@sveltejs/kit';
import type { Client } from '@urql/core';
import { ComplianceService } from '$services/ComplianceService';
import { GraphQLComplianceAdapter } from '$adapters/graphql/GraphQLComplianceAdapter';
import { GraphQLAdapter } from '$adapters/graphql/GraphQLAdapter';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

/**
 * Create ComplianceService instance for the current request.
 *
 * Wires together:
 * - URQL client with authentication cookies
 * - GraphQLAdapter wrapper (implements GraphQLPort interface)
 * - GraphQLComplianceAdapter (implements ComplianceRepository port)
 * - ComplianceService (business logic layer)
 *
 * @param event - SvelteKit request event containing cookies for authentication
 * @returns Configured ComplianceService instance
 *
 * @example
 * ```typescript
 * // In +page.server.ts
 * export const load: PageServerLoad = async (event) => {
 *   const complianceService = createComplianceService(event);
 *   const result = await complianceService.getAll();
 *
 *   if (result.isError) {
 *     throw error(500, result.error.message);
 *   }
 *
 *   return { areas: result.value };
 * };
 * ```
 */
export function createComplianceService(event: RequestEvent): ComplianceService {
	// Extract cookies from request for server-side authentication
	const cookieHeader = serializeCookies(event.cookies);

	// Create urql client with session cookies for authentication
	const client = createUrqlClient(event.fetch, undefined, undefined, cookieHeader);

	// Wrap in GraphQLAdapter to properly implement GraphQLPort interface
	const graphql = new GraphQLAdapter(client);

	// Create compliance repository adapter
	const repository = new GraphQLComplianceAdapter(graphql);

	// Return configured service
	return new ComplianceService(repository);
}

/**
 * Create ComplianceService with a pre-configured URQL client.
 *
 * Useful for testing or when you already have a configured client.
 *
 * @param client - Pre-configured urql Client instance
 * @returns Configured ComplianceService instance
 *
 * @example
 * ```typescript
 * // In tests:
 * const mockClient = createClient({ url: 'http://localhost:4000/graphql', exchanges: [] });
 * const service = createComplianceServiceWithClient(mockClient);
 * ```
 */
export function createComplianceServiceWithClient(client: Client): ComplianceService {
	const graphql = new GraphQLAdapter(client);
	const repository = new GraphQLComplianceAdapter(graphql);
	return new ComplianceService(repository);
}
