/**
 * Port interface for GraphQL operations
 *
 * Abstracts GraphQL client to enable dependency injection and testing.
 * Services depend on this interface, adapters implement it.
 */
export interface GraphQLPort<TData = unknown, TVariables = Record<string, unknown>> {
	/**
	 * Execute a GraphQL query
	 * @param operation - GraphQL query string
	 * @param variables - Query variables
	 * @returns Promise resolving to query data
	 * @throws {GraphQLError} on GraphQL errors
	 */
	query<T = TData>(operation: string, variables?: TVariables): Promise<T>;

	/**
	 * Execute a GraphQL mutation
	 * @param operation - GraphQL mutation string
	 * @param variables - Mutation variables
	 * @returns Promise resolving to mutation data
	 * @throws {GraphQLError} on GraphQL errors
	 */
	mutation<T = TData>(operation: string, variables?: TVariables): Promise<T>;
}
