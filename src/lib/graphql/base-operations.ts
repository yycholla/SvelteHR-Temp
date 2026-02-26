import type { AnyVariables, Client, DocumentInput, TypedDocumentNode } from '@urql/core';
import type { DocumentNode, OperationDefinitionNode } from 'graphql';
import type { UserCredentials } from '$lib/models/data-request';
import { logger } from '$lib/utils/logger';

function asError(error: unknown): Error {
	if (error instanceof Error) return error;
	if (typeof error === 'string') return new Error(error);
	return new Error('Unknown error');
}

function hasUserMessage(error: unknown): error is { userMessage?: string } {
	return typeof error === 'object' && error !== null && 'userMessage' in error;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function getDataAtPath(data: unknown, path: string | string[]): unknown {
	const keys = Array.isArray(path) ? path : path.split('.');
	let current: unknown = data;

	for (const key of keys) {
		if (!isRecord(current)) return undefined;
		current = current[key];
	}

	return current;
}

function isMutationQuery(query: TypedDocumentNode<unknown, AnyVariables> | DocumentNode): boolean {
	return query.definitions.some(
		(def): def is OperationDefinitionNode =>
			def.kind === 'OperationDefinition' && def.operation === 'mutation'
	);
}

// Dynamic import for createDataRequest and createErrorResponse to avoid circular dependencies
// if they import types from other files that might import this base class.
// For now, we'll assume they are safe or use the pattern from the existing files.

export interface GraphQLRequestOptions<
	Data = unknown,
	Variables extends AnyVariables = AnyVariables
> {
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
export async function makeGraphQLRequest<
	Data = unknown,
	Variables extends AnyVariables = AnyVariables
>(options: GraphQLRequestOptions<Data, Variables>): Promise<Data> {
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
		const operation = isMutationQuery(query)
			? client.mutation<Data, Variables>(query, dataRequest.variables)
			: client.query<Data, Variables>(query, dataRequest.variables);

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
			return getDataAtPath(result.data, dataPath) as Data;
		}

		return result.data;
	} catch (error: unknown) {
		if (hasUserMessage(error)) {
			throw error;
		}
		throw createErrorResponse(asError(error), {
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

	protected async execute<Data = unknown, Variables extends AnyVariables = AnyVariables>(
		options: Omit<GraphQLRequestOptions<Data, Variables>, 'client'>
	): Promise<Data> {
		return makeGraphQLRequest({
			client: this.client,
			...options
		});
	}

	/**
	 * Execute a GraphQL query with standardized error handling
	 *
	 * Simplified API for queries that doesn't require UserCredentials.
	 * Provides consistent error handling and optional data path extraction.
	 *
	 * @param query - GraphQL query (DocumentNode or string)
	 * @param variables - Query variables (optional)
	 * @param options - Operation metadata and error customization
	 * @returns Extracted data from the query response
	 *
	 * @example
	 * ```typescript
	 * const users = await this.executeQuery(
	 *   GET_USERS_QUERY,
	 *   { limit: 20 },
	 *   {
	 *     operationName: 'GetUsers',
	 *     errorMessage: 'Failed to load users',
	 *     dataPath: 'allUsers'
	 *   }
	 * );
	 * ```
	 */
	protected async executeQuery<TData = unknown, TVariables extends AnyVariables = AnyVariables>(
		query: DocumentInput<TData, TVariables> | DocumentNode | string,
		variables?: TVariables,
		options?: {
			operationName?: string;
			errorMessage?: string;
			dataPath?: string;
		}
	): Promise<TData> {
		const { operationName, errorMessage, dataPath } = options || {};
		const { createErrorResponse } = await import('$lib/models/error-response');

		try {
			const result = await this.client
				.query<
					TData,
					TVariables
				>(query as DocumentInput<TData, TVariables>, variables ?? ({} as TVariables))
				.toPromise();

			if (result.error) {
				logger.error(`[${operationName || 'GraphQL Query'}] Query error`, result.error, {
					operationName,
					variables
				});
				throw createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: errorMessage || 'Query failed. Please try again.'
				});
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No data returned from server. Please try again.'
				});
			}

			// Extract data from specified path or return full data
			return dataPath ? (getDataAtPath(result.data, dataPath) as TData) : result.data;
		} catch (error: unknown) {
			if (hasUserMessage(error)) {
				throw error; // Already formatted error response
			}
			const normalizedError = asError(error);
			logger.error(`[${operationName || 'GraphQL Query'}] Query failed`, normalizedError, {
				operationName,
				variables
			});
			throw createErrorResponse(normalizedError, {
				type: 'graphql',
				userMessage: errorMessage || 'Operation failed. Please try again.'
			});
		}
	}

	/**
	 * Execute a GraphQL mutation with standardized error handling
	 *
	 * Simplified API for mutations that doesn't require UserCredentials.
	 * Provides consistent error handling and optional data path extraction.
	 *
	 * @param mutation - GraphQL mutation (DocumentNode or string)
	 * @param variables - Mutation variables (optional)
	 * @param options - Operation metadata and error customization
	 * @returns Extracted data from the mutation response
	 *
	 * @example
	 * ```typescript
	 * const updatedUser = await this.executeMutation(
	 *   UPDATE_USER_MUTATION,
	 *   { userId: '123', input: { name: 'John' } },
	 *   {
	 *     operationName: 'UpdateUser',
	 *     errorMessage: 'Failed to update user',
	 *     dataPath: 'updateUser'
	 *   }
	 * );
	 * ```
	 */
	protected async executeMutation<TData = unknown, TVariables extends AnyVariables = AnyVariables>(
		mutation: DocumentInput<TData, TVariables> | DocumentNode | string,
		variables?: TVariables,
		options?: {
			operationName?: string;
			errorMessage?: string;
			dataPath?: string;
		}
	): Promise<TData> {
		const { operationName, errorMessage, dataPath } = options || {};
		const { createErrorResponse } = await import('$lib/models/error-response');

		try {
			const result = await this.client
				.mutation<
					TData,
					TVariables
				>(mutation as DocumentInput<TData, TVariables>, variables ?? ({} as TVariables))
				.toPromise();

			if (result.error) {
				logger.error(`[${operationName || 'GraphQL Mutation'}] Mutation error`, result.error, {
					operationName,
					variables
				});
				throw createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: errorMessage || 'Mutation failed. Please try again.'
				});
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No data returned from server. Please try again.'
				});
			}

			// Extract data from specified path or return full data
			return dataPath ? (getDataAtPath(result.data, dataPath) as TData) : result.data;
		} catch (error: unknown) {
			if (hasUserMessage(error)) {
				throw error; // Already formatted error response
			}
			const normalizedError = asError(error);
			logger.error(`[${operationName || 'GraphQL Mutation'}] Mutation failed`, normalizedError, {
				operationName,
				variables
			});
			throw createErrorResponse(normalizedError, {
				type: 'graphql',
				userMessage: errorMessage || 'Operation failed. Please try again.'
			});
		}
	}
}
