import type { Client, CombinedError } from '@urql/core';
import type { GraphQLOperation, GraphQLPort } from '$services/ports/GraphQLPort';
import { GraphQLError } from './errors/GraphQLError';
import { logger } from '$lib/utils/logger';

/** Maximum operation string length for logging (prevents log spam) */
const MAX_OPERATION_LOG_LENGTH = 100;

/**
 * URQL implementation of GraphQLPort
 *
 * Wraps URQL client with standardized error handling and logging.
 * SECURITY: Does NOT log mutation variables to prevent password exposure.
 */
export class GraphQLAdapter implements GraphQLPort {
	constructor(private readonly client: Client) {}

	async query<T = unknown>(operation: GraphQLOperation, variables?: object): Promise<T> {
		logger.debug('[GraphQL] Executing query', {
			operation:
				typeof operation === 'string'
					? operation.substring(0, MAX_OPERATION_LOG_LENGTH)
					: '<document>',
			variables
		});

		const result = await this.client.query(operation, variables ?? {}).toPromise();

		if (result.error) {
			throw this.handleError(result.error, 'query');
		}

		if (!result.data) {
			throw new GraphQLError('UNKNOWN', 'Query returned no data');
		}

		return result.data as T;
	}

	async mutation<T = unknown>(operation: GraphQLOperation, variables?: object): Promise<T> {
		// SECURITY: Do NOT log variables (may contain passwords)
		logger.debug('[GraphQL] Executing mutation', {
			operation:
				typeof operation === 'string'
					? operation.substring(0, MAX_OPERATION_LOG_LENGTH)
					: '<document>'
		});

		const result = await this.client.mutation(operation, variables ?? {}).toPromise();

		if (result.error) {
			throw this.handleError(result.error, 'mutation');
		}

		if (!result.data) {
			throw new GraphQLError('UNKNOWN', 'Mutation returned no data');
		}

		return result.data as T;
	}

	async mutate<T = unknown>(operation: GraphQLOperation, variables?: object): Promise<T> {
		return this.mutation<T>(operation, variables);
	}

	private handleError(error: CombinedError, operation: 'query' | 'mutation'): GraphQLError {
		logger.error(`[GraphQL] ${operation} failed`, error);

		const message = error.message.toLowerCase();

		if (message.includes('not found') || message.includes('404')) {
			return new GraphQLError('NOT_FOUND', error.message);
		}

		if (message.includes('unauthorized') || message.includes('401')) {
			return new GraphQLError('UNAUTHORIZED', error.message);
		}

		if (message.includes('authentication required') || message.includes('unauthenticated')) {
			return new GraphQLError('UNAUTHORIZED', error.message);
		}

		if (message.includes('validation') || message.includes('invalid')) {
			return new GraphQLError('VALIDATION_ERROR', error.message);
		}

		return new GraphQLError('UNKNOWN', error.message);
	}
}
