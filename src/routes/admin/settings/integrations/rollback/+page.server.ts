import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import type { PageServerLoad } from './$types';

const ROLLBACK_REQUESTS_QUERY = `
	query GetRollbackRequests($status: RollbackStatus, $limit: Int, $rollbackId: String) {
		rollback {
			rollbackRequests(status: $status, limit: $limit) {
				id
				entityType
				entityId
				syncLogId
				reason
				status
				requestedBy
				requestedByEmail
				approvedBy
				approvedByEmail
				rejectedBy
				rejectedByEmail
				rejectionReason
				rollbackSnapshot
				rollbackPlan
				affectedRecordsCount
				executedAt
				executionDurationMs
				executionError
				verificationStatus
				verificationErrors
				createdAt
				updatedAt
			}
			rollbackStatistics {
				totalRequests
				pendingRequests
				approvedRequests
				rejectedRequests
				completedRequests
				failedRequests
				avgExecutionTimeMs
				successRate
			}
		}
	}
`;

const ROLLBACK_DETAIL_QUERY = `
	query GetRollbackDetail($rollbackId: String!) {
		rollback {
			rollbackRequest(rollbackId: $rollbackId) {
				id
				entityType
				entityId
				syncLogId
				reason
				status
				requestedBy
				requestedByEmail
				approvedBy
				approvedByEmail
				rejectedBy
				rejectedByEmail
				rejectionReason
				rollbackSnapshot
				rollbackPlan
				affectedRecordsCount
				executedAt
				executionDurationMs
				executionError
				verificationStatus
				verificationErrors
				createdAt
				updatedAt
			}
		}
	}
`;

export const load: PageServerLoad = async ({ fetch, cookies, depends, url }) => {
	depends('app:rollback-requests');

	const rollbackId = url.searchParams.get('rollbackId');
	const status = url.searchParams.get('status');
	const limit = parseInt(url.searchParams.get('limit') || '30');

	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	try {
		// If viewing a specific rollback request
		if (rollbackId) {
			const detailResult = await client.query(ROLLBACK_DETAIL_QUERY, { rollbackId }).toPromise();

			if (detailResult.error) {
				console.error('Failed to fetch rollback details:', detailResult.error);
				return {
					requests: [],
					statistics: null,
					selectedRequest: null,
					error: 'Failed to load rollback details'
				};
			}

			return {
				requests: [],
				statistics: null,
				selectedRequest: detailResult.data?.rollback?.rollbackRequest || null
			};
		}

		// Otherwise fetch overview
		const result = await client
			.query(ROLLBACK_REQUESTS_QUERY, {
				status: status || null,
				limit
			})
			.toPromise();

		if (result.error) {
			console.error('Failed to fetch rollback requests:', result.error);
			return {
				requests: [],
				statistics: null,
				selectedRequest: null,
				error: 'Failed to load rollback requests'
			};
		}

		const rollback = result.data?.rollback;

		return {
			requests: rollback?.rollbackRequests || [],
			statistics: rollback?.rollbackStatistics || null,
			selectedRequest: null,
			filters: { status, limit }
		};
	} catch (error) {
		console.error('Error loading rollback requests:', error);
		return {
			requests: [],
			statistics: null,
			selectedRequest: null,
			error: 'Failed to load rollback requests'
		};
	}
};
