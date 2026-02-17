// src/lib/services/certificationServiceFactory.ts
import type { RequestEvent } from '@sveltejs/kit';
import type { Client } from '@urql/core';
import { CertificationService } from '$services/CertificationService';
import { GraphQLCertificationAdapter } from '$adapters/graphql/GraphQLCertificationAdapter';
import { GraphQLAdapter } from '$adapters/graphql/GraphQLAdapter';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

/**
 * Create CertificationService instance for the current request.
 *
 * Wires together:
 * - URQL client with authentication cookies
 * - GraphQLAdapter wrapper (implements GraphQLPort interface)
 * - GraphQLCertificationAdapter (implements CertificationRepository port)
 * - CertificationService (business logic layer)
 *
 * @param event - SvelteKit request event containing cookies for authentication
 * @returns Configured CertificationService instance
 *
 * @example
 * ```typescript
 * // In +page.server.ts
 * export const load: PageServerLoad = async (event) => {
 *   const certificationService = createCertificationService(event);
 *   const result = await certificationService.getByEmployeeId('employee-uuid');
 *
 *   if (result.isError) {
 *     throw error(500, result.error.message);
 *   }
 *
 *   return { certifications: result.value };
 * };
 * ```
 */
export function createCertificationService(event: RequestEvent): CertificationService {
	// Extract cookies from request for server-side authentication
	const cookieHeader = serializeCookies(event.cookies);

	// Create urql client with session cookies for authentication
	const client = createUrqlClient(event.fetch, undefined, undefined, cookieHeader);

	// Wrap in GraphQLAdapter to properly implement GraphQLPort interface
	const graphql = new GraphQLAdapter(client);

	// Create certification repository adapter
	const repository = new GraphQLCertificationAdapter(graphql);

	// Return configured service
	return new CertificationService(repository);
}

/**
 * Create CertificationService with a pre-configured URQL client.
 *
 * Useful for testing or when you already have a configured client.
 *
 * @param client - Pre-configured urql Client instance
 * @returns Configured CertificationService instance
 *
 * @example
 * ```typescript
 * // In tests:
 * const mockClient = createMockUrqlClient();
 * const service = createCertificationServiceWithClient(mockClient);
 * ```
 */
export function createCertificationServiceWithClient(client: Client): CertificationService {
	const graphql = new GraphQLAdapter(client);
	const repository = new GraphQLCertificationAdapter(graphql);
	return new CertificationService(repository);
}

/**
 * Create CertificationService with a pre-configured GraphQLPort directly.
 *
 * Useful for testing with mock GraphQL ports.
 *
 * @param graphql - Pre-configured GraphQLPort instance
 * @returns Configured CertificationService instance
 */
export function createCertificationServiceWithPort(graphql: GraphQLPort): CertificationService {
	const repository = new GraphQLCertificationAdapter(graphql);
	return new CertificationService(repository);
}
