// src/lib/services/rbacServiceFactory.ts
import type { RequestEvent } from '@sveltejs/kit';
import type { Client } from '@urql/core';
import { RBACService } from '$services/RBACService';
import { GraphQLRoleAdapter } from '$adapters/graphql/GraphQLRoleAdapter';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

export function createRBACService(event: RequestEvent): RBACService {
	const client = createUrqlClient(
		event.fetch,
		event.locals?.accessToken,
		undefined,
		serializeCookies(event.cookies)
	);

	const adapter = new GraphQLRoleAdapter(client);
	return new RBACService(adapter);
}

/**
 * Create RBACService for client-side use
 *
 * Uses the provided URQL client (typically jwtGraphQLClient) for authentication.
 * This is used in Svelte stores and browser-only contexts.
 *
 * @param client - URQL Client with JWT authentication
 * @returns Configured RBACService instance
 *
 * @example
 * ```typescript
 * // In a Svelte store:
 * import { jwtGraphQLClient } from '$lib/graphql/jwt-client';
 * import { createRBACServiceFromClient } from '$lib/services/rbacServiceFactory';
 *
 * const rbacService = createRBACServiceFromClient(jwtGraphQLClient);
 * const result = await rbacService.getAllRoles();
 * ```
 */
export function createRBACServiceFromClient(client: Client): RBACService {
	const adapter = new GraphQLRoleAdapter(client);
	return new RBACService(adapter);
}
