/**
 * Factory for creating OnboardingService instances
 *
 * Wires together:
 * - URQL client with authentication cookies
 * - GraphQL adapter (implements OnboardingRepository port)
 * - OnboardingService (business logic layer)
 */

import type { RequestEvent } from '@sveltejs/kit';
import type { Client } from '@urql/core';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import { GraphQLAdapter } from '$adapters/graphql/GraphQLAdapter';
import { GraphQLOnboardingAdapter } from '$adapters/graphql/GraphQLOnboardingAdapter';
import { OnboardingService } from '$services/OnboardingService';

/**
 * Create an OnboardingService instance for the current request
 *
 * Wires together:
 * - URQL client with authentication cookies
 * - GraphQLAdapter wrapper (implements GraphQLPort interface)
 * - GraphQLOnboardingAdapter (implements OnboardingRepository port)
 * - OnboardingService (business logic layer)
 *
 * @param event - SvelteKit RequestEvent with cookies and fetch
 * @returns Configured OnboardingService instance
 *
 * @example
 * ```typescript
 * // In +page.server.ts:
 * export const load: PageServerLoad = async (event) => {
 *   const service = createOnboardingService(event);
 *   const result = await service.getAllModules({ isActive: true });
 *
 *   if (result.isError) {
 *     throw error(500, result.error.message);
 *   }
 *
 *   return { modules: result.value };
 * };
 * ```
 */
export function createOnboardingService(event: RequestEvent): OnboardingService {
	// Extract cookies from request for server-side authentication
	const cookieHeader = serializeCookies(event.cookies);

	// Create urql client with session cookies for authentication
	const client = createUrqlClient(event.fetch, undefined, undefined, cookieHeader);

	// Wrap in GraphQLAdapter to properly implement GraphQLPort interface
	const graphql = new GraphQLAdapter(client);

	// Create onboarding repository adapter
	const repository = new GraphQLOnboardingAdapter(graphql);

	// Return configured service
	return new OnboardingService(repository);
}

/**
 * Create an OnboardingService with a pre-configured client
 *
 * Useful for testing or when you already have a configured client.
 *
 * @param client - Pre-configured urql Client instance
 * @returns Configured OnboardingService instance
 *
 * @example
 * ```typescript
 * // In tests:
 * const mockClient = createMockUrqlClient();
 * const service = createOnboardingServiceWithClient(mockClient);
 * ```
 */
export function createOnboardingServiceWithClient(client: Client): OnboardingService {
	const graphql = new GraphQLAdapter(client);
	const repository = new GraphQLOnboardingAdapter(graphql);
	return new OnboardingService(repository);
}
