// src/lib/services/employeeServiceFactory.ts
import type { RequestEvent } from '@sveltejs/kit';
import { EmployeeService } from '$services/EmployeeService';
import { GraphQLEmployeeAdapter } from '$adapters/GraphQLEmployeeAdapter';
import { GraphQLAdapter } from '$adapters/graphql/GraphQLAdapter';
import { createUrqlClient } from '$lib/graphql/client';
import type { Client } from '@urql/core';

/**
 * Factory function to create an EmployeeService with GraphQL repository adapter
 *
 * This function creates a properly configured EmployeeService instance with:
 * - GraphQL client configured with session cookies for authentication
 * - GraphQLEmployeeAdapter as the repository implementation
 *
 * @param event - SvelteKit RequestEvent (provides cookies for auth)
 * @returns Configured EmployeeService instance
 *
 * @example
 * ```typescript
 * // In +page.server.ts:
 * export const load: PageServerLoad = async (event) => {
 *   const employeeService = createEmployeeService(event);
 *   const result = await employeeService.getEmployees();
 *
 *   if (result.isError) {
 *     throw error(500, result.error.message);
 *   }
 *
 *   return { employees: result.value };
 * };
 * ```
 */
export function createEmployeeService(event: RequestEvent): EmployeeService {
	// Extract cookies from request for server-side authentication
	const cookieHeader = event.request.headers.get('cookie') || '';

	// Create urql client with session cookies for authentication
	const client = createUrqlClient(event.fetch, event.locals?.accessToken, undefined, cookieHeader);

	// Wrap urql client to match GraphQLPort contract expected by repository adapters
	const repository = new GraphQLEmployeeAdapter(new GraphQLAdapter(client));

	// Return configured service
	return new EmployeeService(repository);
}

/**
 * Factory function to create an EmployeeService with a custom urql Client
 *
 * Useful for testing or when you already have a configured client instance.
 *
 * @param client - Pre-configured urql Client instance
 * @returns Configured EmployeeService instance
 *
 * @example
 * ```typescript
 * // In tests:
 * const mockClient = createMockUrqlClient();
 * const service = createEmployeeServiceWithClient(mockClient);
 * ```
 */
export function createEmployeeServiceWithClient(client: Client): EmployeeService {
	const repository = new GraphQLEmployeeAdapter(new GraphQLAdapter(client));
	return new EmployeeService(repository);
}
