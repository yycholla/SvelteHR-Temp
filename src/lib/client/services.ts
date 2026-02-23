/**
 * Client-side service factory utilities
 *
 * Provides convenience functions for creating service instances
 * in Svelte stores and browser-only contexts.
 *
 * All services are created using the JWT GraphQL client for authentication.
 */

import type { Client } from '@urql/core';
import { jwtGraphQLClient } from '$lib/graphql/jwt-client';
import { createRBACServiceFromClient } from '$lib/services/rbacServiceFactory';
import type { RBACService } from '$services/RBACService';

/**
 * Container for client-side services
 *
 * Services are created lazily when accessed, using the JWT GraphQL client
 * for authentication. This mirrors the server-side ServiceContainer but
 * works in browser context.
 */
export class ClientServiceContainer {
	private _rbacService?: RBACService;

	constructor(private readonly client: Client) {}

	/**
	 * Get the RBACService instance
	 *
	 * Creates and caches the service on first access.
	 * The service is configured with JWT authentication.
	 */
	get rbacService(): RBACService {
		if (!this._rbacService) {
			this._rbacService = createRBACServiceFromClient(this.client);
		}
		return this._rbacService;
	}
}

/**
 * Singleton container instance
 */
let _containerInstance: ClientServiceContainer | undefined;

/**
 * Get the client-side service container
 *
 * Creates a singleton instance using the JWT GraphQL client.
 * Call this from Svelte stores to access services.
 *
 * @returns ClientServiceContainer with all available services
 *
 * @example
 * ```typescript
 * // In a Svelte store:
 * import { createClientServices } from '$lib/client/services';
 *
 * class AuthStore {
 *   private services = createClientServices();
 *
 *   async loadUserRoles(userId: string): Promise<void> {
 *     const result = await this.services.rbacService.getAllRoles();
 *
 *     if (result.isError) {
 *       logger.error(result.error.message);
 *       return;
 *     }
 *
 *     this.roles = result.value;
 *   }
 * }
 * ```
 */
export function createClientServices(): ClientServiceContainer {
	// In dev mode, create new instance for HMR support
	if (import.meta.hot) {
		return new ClientServiceContainer(jwtGraphQLClient);
	}

	// In prod mode, use singleton
	if (!_containerInstance) {
		_containerInstance = new ClientServiceContainer(jwtGraphQLClient);
	}
	return _containerInstance;
}
