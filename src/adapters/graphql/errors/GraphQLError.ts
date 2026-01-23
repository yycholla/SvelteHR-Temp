import { AppError } from '$lib/utils/errors/AppError';

export type GraphQLErrorCode = 'NOT_FOUND' | 'UNAUTHORIZED' | 'VALIDATION_ERROR' | 'UNKNOWN';

const STATUS_CODE_MAP: Record<GraphQLErrorCode, number> = {
	NOT_FOUND: 404,
	UNAUTHORIZED: 401,
	VALIDATION_ERROR: 400,
	UNKNOWN: 500
};

/**
 * GraphQL-specific error class
 *
 * Wraps GraphQL errors with typed error codes and HTTP status codes.
 */
export class GraphQLError extends AppError {
	constructor(
		public readonly errorCode: GraphQLErrorCode,
		message: string,
		context?: Record<string, unknown>
	) {
		super(message, `GRAPHQL_${errorCode}`, STATUS_CODE_MAP[errorCode], context);
		this.name = 'GraphQLError';
	}
}
