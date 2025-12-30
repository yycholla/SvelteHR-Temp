import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import type { PageServerLoad } from './$types';

const ERROR_RECOVERY_QUERY = `
	query GetErrorRecoveryData($operationId: String) {
		intuit {
			errorRecovery {
				retryStatistics {
					totalFailedOperations
					pendingRetries
					currentlyRetrying
					succeededOperations
					deadLetterOperations
					averageRetryCount
				}
				pendingRetries(limit: 50) {
					id
					syncLogId
					operationType
					entityType
					entityId
					quickbooksId
					errorType
					errorCode
					errorMessage
					errorDetails
					retryCount
					maxRetries
					nextRetryAt
					lastRetryAt
					status
					isRetryable
					recoveryStrategy
					priority
					movedToDeadLetter
					deadLetterReason
					resolvedAt
					resolvedBy
					resolutionNotes
					createdAt
					updatedAt
				}
				deadLetterQueue(limit: 50) {
					id
					syncLogId
					operationType
					entityType
					entityId
					quickbooksId
					errorType
					errorCode
					errorMessage
					errorDetails
					retryCount
					maxRetries
					movedToDeadLetter
					deadLetterReason
					resolvedAt
					resolvedBy
					resolutionNotes
					createdAt
					updatedAt
				}
			}
		}
	}
`;

const OPERATION_DETAIL_QUERY = `
	query GetOperationDetail($operationId: String!) {
		intuit {
			errorRecovery {
				failedOperation(operationId: $operationId) {
					id
					syncLogId
					operationType
					entityType
					entityId
					quickbooksId
					errorType
					errorCode
					errorMessage
					errorDetails
					retryCount
					maxRetries
					nextRetryAt
					lastRetryAt
					status
					isRetryable
					recoveryStrategy
					priority
					movedToDeadLetter
					deadLetterReason
					resolvedAt
					resolvedBy
					resolutionNotes
					createdAt
					updatedAt
				}
				retryHistory(operationId: $operationId) {
					id
					failedOperationId
					retryNumber
					status
					errorMessage
					errorDetails
					backoffDuration
					durationMs
					createdAt
				}
			}
		}
	}
`;

export const load: PageServerLoad = async ({ fetch, cookies, depends, url }) => {
	depends('app:error-recovery');

	const operationId = url.searchParams.get('operationId');
	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	try {
		// If viewing a specific operation
		if (operationId) {
			const detailResult = await client
				.query(OPERATION_DETAIL_QUERY, { operationId })
				.toPromise();

			if (detailResult.error) {
				console.error('Failed to fetch operation details:', detailResult.error);
				return {
					statistics: null,
					pendingRetries: [],
					deadLetterQueue: [],
					selectedOperation: null,
					retryHistory: [],
					error: 'Failed to load operation details'
				};
			}

			const errorRecovery = detailResult.data?.intuit?.errorRecovery;

			return {
				statistics: null,
				pendingRetries: [],
				deadLetterQueue: [],
				selectedOperation: errorRecovery?.failedOperation || null,
				retryHistory: errorRecovery?.retryHistory || []
			};
		}

		// Otherwise fetch overview
		const result = await client.query(ERROR_RECOVERY_QUERY, {}).toPromise();

		if (result.error) {
			console.error('Failed to fetch error recovery data:', result.error);
			return {
				statistics: null,
				pendingRetries: [],
				deadLetterQueue: [],
				selectedOperation: null,
				retryHistory: [],
				error: 'Failed to load error recovery data'
			};
		}

		const errorRecovery = result.data?.intuit?.errorRecovery;

		return {
			statistics: errorRecovery?.retryStatistics || null,
			pendingRetries: errorRecovery?.pendingRetries || [],
			deadLetterQueue: errorRecovery?.deadLetterQueue || [],
			selectedOperation: null,
			retryHistory: []
		};
	} catch (error) {
		console.error('Error loading error recovery data:', error);
		return {
			statistics: null,
			pendingRetries: [],
			deadLetterQueue: [],
			selectedOperation: null,
			retryHistory: [],
			error: 'Failed to load error recovery data'
		};
	}
};
