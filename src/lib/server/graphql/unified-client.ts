import type { RequestEvent } from '@sveltejs/kit';
import type { Client, TypedDocumentNode, AnyVariables } from '@urql/core';
import { createUrqlClient } from '$lib/graphql/client';
import { logger } from '$lib/utils/logger';

/**
 * Unified GraphQL client that standardizes query execution across the app
 *
 * Consolidates 3 different GraphQL client patterns into a single, consistent interface:
 * - Pattern 1: Direct fetch() to GraphQL endpoint (deprecated)
 * - Pattern 2: urql Client via createUrqlClient (standardized)
 * - Pattern 3: GraphQLClient wrapper (deprecated)
 *
 * @example
 * ```typescript
 * const client = createGraphQLClient(event);
 *
 * const tasks = await client.query(GET_TASKS, { limit: 20 }, {
 *   operationName: 'GetTasks',
 *   dataPath: 'tasks',
 *   errorMessage: 'Failed to load tasks'
 * });
 * ```
 */
export class UnifiedGraphQLClient {
	private client: Client;

	constructor(event: RequestEvent) {
		const cookieHeader = event.request.headers.get('cookie') || '';
		this.client = createUrqlClient(undefined, undefined, undefined, cookieHeader);
	}

	/**
	 * Execute a GraphQL query with standardized error handling
	 *
	 * @param query - GraphQL query string or TypedDocumentNode
	 * @param variables - Query variables
	 * @param options - Optional configuration
	 * @returns Query result data
	 * @throws Error if query fails or returns no data
	 */
	async query<TData = any, TVariables = any>(
		query: string | TypedDocumentNode<TData, TVariables>,
		variables?: TVariables,
		options?: {
			/** Operation name for logging (e.g., 'GetTasks') */
			operationName?: string;
			/** Custom error message to throw on failure */
			errorMessage?: string;
			/** Path to extract data from (e.g., 'tasks' for result.data.tasks) */
			dataPath?: string;
		}
	): Promise<TData> {
		const { operationName, errorMessage, dataPath } = options || {};

		try {
			const result = await this.client.query(query, variables ?? {}).toPromise();

			if (result.error) {
				logger.error(`[${operationName || 'GraphQL'}] Query error`, result.error);
				throw new Error(errorMessage || result.error.message);
			}

			if (!result.data) {
				throw new Error('No data returned from GraphQL query');
			}

			// Extract data from specified path or return full data
			return dataPath ? (result.data as any)[dataPath] : result.data;
		} catch (err) {
			logger.error(`[${operationName || 'GraphQL'}] Query failed`, err as Error);
			throw err;
		}
	}

	/**
	 * Execute a GraphQL mutation with standardized error handling
	 *
	 * @param mutation - GraphQL mutation string or TypedDocumentNode
	 * @param variables - Mutation variables
	 * @param options - Optional configuration
	 * @returns Mutation result data
	 * @throws Error if mutation fails or returns no data
	 */
	async mutate<TData = any, TVariables = any>(
		mutation: string | TypedDocumentNode<TData, TVariables>,
		variables?: TVariables,
		options?: {
			/** Operation name for logging (e.g., 'CreateTask') */
			operationName?: string;
			/** Custom error message to throw on failure */
			errorMessage?: string;
		}
	): Promise<TData> {
		const { operationName, errorMessage } = options || {};

		try {
			const result = await this.client.mutation(mutation, variables ?? {}).toPromise();

			if (result.error) {
				logger.error(`[${operationName || 'GraphQL'}] Mutation error`, result.error);
				throw new Error(errorMessage || result.error.message);
			}

			if (!result.data) {
				throw new Error('No data returned from GraphQL mutation');
			}

			return result.data;
		} catch (err) {
			logger.error(`[${operationName || 'GraphQL'}] Mutation failed`, err as Error);
			throw err;
		}
	}

	/**
	 * Get the underlying urql client for advanced usage
	 *
	 * Use this for operations that need direct access to the urql client,
	 * such as subscriptions or batch queries.
	 *
	 * @returns The underlying urql Client instance
	 */
	getClient(): Client {
		return this.client;
	}
}

/**
 * Factory function for route handlers
 *
 * Creates a new UnifiedGraphQLClient instance with cookies from the request event.
 * This ensures proper session-based authentication for server-side GraphQL calls.
 *
 * @param event - SvelteKit RequestEvent
 * @returns Configured UnifiedGraphQLClient instance
 *
 * @example
 * ```typescript
 * export const load: PageServerLoad = async (event) => {
 *   const client = createGraphQLClient(event);
 *   const tasks = await client.query(GET_TASKS, { limit: 20 });
 *   return { tasks };
 * };
 * ```
 */
export function createGraphQLClient(event: RequestEvent): UnifiedGraphQLClient {
	return new UnifiedGraphQLClient(event);
}
