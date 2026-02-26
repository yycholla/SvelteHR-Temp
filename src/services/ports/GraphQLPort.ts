/**
 * Port interface for GraphQL operations
 *
 * Abstracts GraphQL client to enable dependency injection and testing.
 * Services depend on this interface, adapters implement it.
 */
import type { DocumentNode } from 'graphql';

export type GraphQLOperation = string | DocumentNode;

export interface GraphQLPort<TData = unknown, TVariables = object> {
	/**
	 * Execute a GraphQL query
	 * @param operation - GraphQL query string
	 * @param variables - Query variables
	 * @returns Promise resolving to query data
	 * @throws {GraphQLError} on GraphQL errors
	 */
	query<T = TData>(operation: GraphQLOperation, variables?: TVariables): Promise<T>;

	/**
	 * Execute a GraphQL mutation
	 * @param operation - GraphQL mutation string
	 * @param variables - Mutation variables
	 * @returns Promise resolving to mutation data
	 * @throws {GraphQLError} on GraphQL errors
	 */
	mutation<T = TData>(operation: GraphQLOperation, variables?: TVariables): Promise<T>;

	/**
	 * Alias for mutation() kept for compatibility with older service code.
	 */
	mutate?<T = TData>(operation: GraphQLOperation, variables?: TVariables): Promise<T>;
}
