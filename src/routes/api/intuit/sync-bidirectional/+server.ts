/**
 * @deprecated This endpoint is deprecated. Use POST /api/sync instead.
 *
 * Example:
 * {
 *   entity_type: 'EMPLOYEE',
 *   direction: 'BIDIRECTIONAL',
 *   mode: 'INCREMENTAL',
 *   conflict_strategy: 'LAST_WRITE_WINS'
 * }
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

const SYNC_BIDIRECTIONAL_MUTATION = `
	mutation SyncBidirectional($entityType: EntityTypeInput!, $conflictStrategy: ConflictStrategyInput, $syncMode: SyncModeInput) {
		intuit {
			syncBidirectional(entityType: $entityType, conflictStrategy: $conflictStrategy, syncMode: $syncMode) {
				success
				pushedCount
				pulledCount
				conflictsResolved
				errors
				startedAt
				completedAt
				syncMode
				changesDetected
				changesProcessed
			}
		}
	}
`;

export const POST: RequestHandler = async ({ request, fetch, cookies }) => {
	try {
		const body = await request.json();
		const { entityType, conflictStrategy, syncMode } = body;

		if (!entityType) {
			return json({ error: 'Entity type is required' }, { status: 400 });
		}

		// Create GraphQL client with auth
		const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

		// Execute mutation
		const result = await client
			.mutation(SYNC_BIDIRECTIONAL_MUTATION, {
				entityType,
				conflictStrategy: conflictStrategy || null,
				syncMode: syncMode || null
			})
			.toPromise();

		if (result.error) {
			console.error('GraphQL error:', result.error);
			return json(
				{
					error: result.error.message || 'Failed to sync bidirectionally'
				},
				{ status: 500 }
			);
		}

		const syncResult = result.data?.intuit?.syncBidirectional;

		if (!syncResult) {
			return json({ error: 'No data returned from sync operation' }, { status: 500 });
		}

		// Return the sync result
		return json({
			success: syncResult.success,
			pushed_count: syncResult.pushedCount,
			pulled_count: syncResult.pulledCount,
			conflicts_resolved: syncResult.conflictsResolved,
			errors: syncResult.errors || [],
			started_at: syncResult.startedAt,
			completed_at: syncResult.completedAt,
			sync_mode: syncResult.syncMode || 'unknown',
			changes_detected: syncResult.changesDetected || 0,
			changes_processed: syncResult.changesProcessed || 0,
			message: `${syncResult.syncMode || 'UNKNOWN'} sync completed: ${syncResult.changesDetected || 0} detected, ${syncResult.changesProcessed || 0} processed (${syncResult.pushedCount} pushed, ${syncResult.pulledCount} pulled, ${syncResult.conflictsResolved} conflicts resolved)`
		});
	} catch (error) {
		console.error('Error in sync-bidirectional API:', error);
		return json(
			{
				error: error instanceof Error ? error.message : 'Failed to sync bidirectionally'
			},
			{ status: 500 }
		);
	}
};
