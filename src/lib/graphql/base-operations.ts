import type { AnyVariables, Client, TypedDocumentNode } from '@urql/core';
import type { UserCredentials } from '$lib/models/data-request';

// Dynamic import for createDataRequest and createErrorResponse to avoid circular dependencies
// if they import types from other files that might import this base class.
// For now, we'll assume they are safe or use the pattern from the existing files.

export interface GraphQLRequestOptions<Data = any, Variables extends AnyVariables = AnyVariables> {
	client: Client;
	query: TypedDocumentNode<Data, Variables>;
	variables: Variables;
	userCredentials: UserCredentials;
	operationName: string;
	timeoutMs?: number;
	errorMessage?: string;
	dataPath?: string | string[]; // Path to data in response (e.g. 'events' or ['createEvent', 'event'])
}

/**
 * Executes a GraphQL query or mutation with standardized error handling and data extraction.
 */
export async function makeGraphQLRequest<Data = any, Variables extends AnyVariables = AnyVariables>(
	options: GraphQLRequestOptions<Data, Variables>
): Promise<Data> {
	const {
		client,
		query,
		variables,
		userCredentials,
		operationName,
		timeoutMs = 5000,
		errorMessage = 'Operation failed. Please try again.',
		dataPath
	} = options;

	const { createDataRequest } = await import('$lib/models/data-request');
	const { createErrorResponse } = await import('$lib/models/error-response');

	const dataRequest = createDataRequest({
		operationName,
		variables,
		userCredentials,
		timeoutMs
	});

	try {
		// Determine if it's a mutation or query based on operation definition or context
		// urql client.query and client.mutation both return an operation result.
		// We can try to infer, but urql 'query' method works for both if the document is correct?
		// No, client.mutation is preferred for mutations to update cache.
		// For simplicity in this helper, we might need a flag or check the query string.
		// However, standardizing on 'query' for reads and 'mutation' for writes is better.
		// Let's assume the caller passes the right method or we default to query/mutation based on options.
		// A cleaner way is to check if it's a mutation.
		const isMutation =
			(query as any)?.kind === 'Document' &&
			(query as any)?.definitions?.some(
				(def: any) => def.kind === 'OperationDefinition' && def.operation === 'mutation'
			);

		const operation = isMutation
			? client.mutation(query, dataRequest.variables)
			: client.query(query, dataRequest.variables);

		const result = await operation.toPromise();

		if (result.error) {
			const errorResponse = createErrorResponse(result.error, {
				type: 'graphql',
				userMessage: errorMessage
			});
			throw errorResponse;
		}

		if (!result.data) {
			throw createErrorResponse(new Error('No data returned'), {
				type: 'graphql',
				userMessage: 'No data returned. Please try again.'
			});
		}

		// Extract data based on path
		if (dataPath) {
			if (Array.isArray(dataPath)) {
				let current: any = result.data;
				for (const key of dataPath) {
					if (current === null || current === undefined) break;
					current = current[key];
				}
				if (current === undefined) {
					// It's possible the data is legitimately null (e.g. find one by ID)
					// But if the path itself is missing, that's an issue.
					// For now, return what we found.
				}
				return current;
			} else {
				return (result.data as any)[dataPath];
			}
		}

		return result.data;
	} catch (error: any) {
		if (error.userMessage) {
			throw error;
		}
		throw createErrorResponse(error, {
			type: 'graphql',
			userMessage: errorMessage
		});
	}
}

/**
 * Base Operations class to be extended by domain-specific services.
 * Provides the `execute` method to run GraphQL requests.
 */
export class BaseOperations {
	protected client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	protected async execute<Data = any, Variables extends AnyVariables = AnyVariables>(
		options: Omit<GraphQLRequestOptions<Data, Variables>, 'client'>
	): Promise<Data> {
		return makeGraphQLRequest({
			client: this.client,
			...options
		});
	}
}
