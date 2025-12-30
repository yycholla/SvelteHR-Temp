import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import type { PageServerLoad } from './$types';

const BATCH_OPERATIONS_QUERY = `
	query GetBatchOperations($entityType: String, $limit: Int, $batchId: String) {
		batchOperations {
			batchOperations(entityType: $entityType, limit: $limit) {
				id
				operationType
				entityType
				direction
				status
				totalItems
				processedItems
				successfulItems
				failedItems
				skippedItems
				progressPercentage
				estimatedTimeRemaining
				triggeredBy
				triggeredByEmail
				errorMessage
				configuration
				metadata
				startedAt
				completedAt
				durationMs
				createdAt
				updatedAt
			}
			batchingEfficiency {
				totalBatches
				totalItems
				totalSuccessful
				totalFailed
				avgBatchSize
				apiCallsSaved
				apiCallReductionPercentage
			}
		}
	}
`;

const BATCH_DETAIL_QUERY = `
	query GetBatchDetail($batchId: String!) {
		batchOperations {
			batchOperation(batchId: $batchId) {
				id
				operationType
				entityType
				direction
				status
				totalItems
				processedItems
				successfulItems
				failedItems
				skippedItems
				progressPercentage
				estimatedTimeRemaining
				triggeredBy
				triggeredByEmail
				errorMessage
				configuration
				metadata
				startedAt
				completedAt
				durationMs
				createdAt
				updatedAt
			}
		}
	}
`;

export const load: PageServerLoad = async ({ fetch, cookies, depends, url }) => {
	depends('app:batch-operations');

	const batchId = url.searchParams.get('batchId');
	const entityType = url.searchParams.get('entityType');
	const limit = parseInt(url.searchParams.get('limit') || '50');

	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	try {
		// If viewing a specific batch
		if (batchId) {
			const detailResult = await client.query(BATCH_DETAIL_QUERY, { batchId }).toPromise();

			if (detailResult.error) {
				console.error('Failed to fetch batch details:', detailResult.error);
				return {
					batches: [],
					efficiency: null,
					selectedBatch: null,
					error: 'Failed to load batch details'
				};
			}

			return {
				batches: [],
				efficiency: null,
				selectedBatch: detailResult.data?.batchOperations?.batchOperation || null
			};
		}

		// Otherwise fetch overview
		const result = await client
			.query(BATCH_OPERATIONS_QUERY, {
				entityType: entityType || null,
				limit
			})
			.toPromise();

		if (result.error) {
			console.error('Failed to fetch batch operations:', result.error);
			return {
				batches: [],
				efficiency: null,
				selectedBatch: null,
				error: 'Failed to load batch operations'
			};
		}

		const batchOps = result.data?.batchOperations;

		return {
			batches: batchOps?.batchOperations || [],
			efficiency: batchOps?.batchingEfficiency || null,
			selectedBatch: null,
			filters: { entityType, limit }
		};
	} catch (error) {
		console.error('Error loading batch operations:', error);
		return {
			batches: [],
			efficiency: null,
			selectedBatch: null,
			error: 'Failed to load batch operations'
		};
	}
};
