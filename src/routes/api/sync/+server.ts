import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

/**
 * Consolidated sync endpoint using the new sync_v2 GraphQL API
 *
 * POST /api/sync
 * Body: {
 *   entity_type: 'EMPLOYEE' | 'DEPARTMENT',
 *   direction: 'PUSH' | 'PULL' | 'BIDIRECTIONAL',
 *   mode?: 'FULL' | 'INCREMENTAL' (default: INCREMENTAL),
 *   conflict_strategy?: 'LOCAL_WINS' | 'REMOTE_WINS' | 'LAST_WRITE_WINS' | 'MANUAL' (default: LAST_WRITE_WINS)
 * }
 */

const SYNC_V2_MUTATION = `
	mutation SyncV2($input: SyncInput!) {
		syncV2 {
			sync(input: $input) {
				entityType
				direction
				mode
				status
				startedAt
				completedAt
				durationMs
				pushedCount
				pulledCount
				conflictsDetected
				conflictsResolved
				errors
				isSuccess
				hasErrors
			}
		}
	}
`;

export const POST: RequestHandler = async ({ request, fetch, cookies }) => {
	try {
		const body = await request.json();
		const entity_type = body.entity_type ?? body.entityType;
		const direction = body.direction;
		const mode = body.mode;
		const conflict_strategy = body.conflict_strategy ?? body.conflictStrategy;

		// Validate required fields
		if (!entity_type) {
			return json({ error: 'entity_type is required' }, { status: 400 });
		}

		if (!direction) {
			return json({ error: 'direction is required' }, { status: 400 });
		}

		// Validate entity_type
		const validEntityTypes = ['EMPLOYEE', 'DEPARTMENT'];
		if (!validEntityTypes.includes(entity_type)) {
			return json(
				{ error: `entity_type must be one of: ${validEntityTypes.join(', ')}` },
				{ status: 400 }
			);
		}

		// Validate direction
		const validDirections = ['PUSH', 'PULL', 'BIDIRECTIONAL'];
		if (!validDirections.includes(direction)) {
			return json(
				{ error: `direction must be one of: ${validDirections.join(', ')}` },
				{ status: 400 }
			);
		}

		// Validate mode if provided
		if (mode) {
			const validModes = ['FULL', 'INCREMENTAL'];
			if (!validModes.includes(mode)) {
				return json({ error: `mode must be one of: ${validModes.join(', ')}` }, { status: 400 });
			}
		}

		// Validate conflict_strategy if provided
		if (conflict_strategy) {
			const validStrategies = ['LOCAL_WINS', 'REMOTE_WINS', 'LAST_WRITE_WINS', 'MANUAL'];
			if (!validStrategies.includes(conflict_strategy)) {
				return json(
					{ error: `conflict_strategy must be one of: ${validStrategies.join(', ')}` },
					{ status: 400 }
				);
			}
		}

		// Create authenticated GraphQL client
		const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

		// Build sync input
		const input = {
			entityType: entity_type,
			direction,
			mode: mode || 'INCREMENTAL',
			conflictStrategy: conflict_strategy || null
		};

		// Execute sync mutation
		const result = await client.mutation(SYNC_V2_MUTATION, { input }).toPromise();

		if (result.error) {
			console.error('GraphQL error in sync_v2:', result.error);
			return json(
				{
					error: result.error.message || 'Failed to execute sync operation',
					graphql_error: result.error.graphQLErrors?.[0]?.message
				},
				{ status: 500 }
			);
		}

		const syncReport = result.data?.syncV2?.sync;

		if (!syncReport) {
			return json({ error: 'No sync report returned from server' }, { status: 500 });
		}

		// Build user-friendly message
		const entityName = entity_type.toLowerCase();
		const directionName = direction.toLowerCase();
		const message = buildSyncMessage(syncReport, entityName, directionName);

		// Return consolidated response
		return json({
			success: syncReport.isSuccess,
			entity_type: syncReport.entityType,
			direction: syncReport.direction,
			mode: syncReport.mode,
			status: syncReport.status,
			started_at: syncReport.startedAt,
			completed_at: syncReport.completedAt,
			duration_ms: syncReport.durationMs,
			pushed_count: syncReport.pushedCount,
			pulled_count: syncReport.pulledCount,
			conflicts_count: syncReport.conflictsResolved ?? syncReport.conflictsDetected ?? 0,
			errors: syncReport.errors || [],
			message
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err instanceof Response) {
			throw err;
		}

		console.error('Error in consolidated sync API:', err);
		return json(
			{
				error: err instanceof Error ? err.message : 'Failed to sync with QuickBooks'
			},
			{ status: 500 }
		);
	}
};

/**
 * Build a user-friendly sync message based on the report
 */
function buildSyncMessage(
	report: {
		pushedCount: number;
		pulledCount: number;
		conflictsDetected?: number;
		conflictsResolved?: number;
		errors: string[];
		status: string;
	},
	entityName: string,
	directionName: string
): string {
	const { pushedCount, pulledCount, errors, status } = report;
	const conflictsCount = report.conflictsResolved ?? report.conflictsDetected ?? 0;

	// Handle failure
	if (status === 'FAILED') {
		const errorSummary = errors.length > 0 ? errors[0] : 'Unknown error';
		return `Sync failed: ${errorSummary}`;
	}

	// Handle completed with errors
	if (status === 'COMPLETED_WITH_ERRORS') {
		const parts: string[] = [];
		if (pushedCount > 0) parts.push(`${pushedCount} pushed`);
		if (pulledCount > 0) parts.push(`${pulledCount} pulled`);
		if (conflictsCount > 0) parts.push(`${conflictsCount} conflicts`);
		return `${entityName} sync completed with errors: ${parts.join(', ')} (${errors.length} errors)`;
	}

	// Handle success
	const parts: string[] = [];

	if (directionName === 'push' || directionName === 'bidirectional') {
		if (pushedCount > 0) {
			parts.push(`${pushedCount} ${entityName}${pushedCount !== 1 ? 's' : ''} pushed`);
		}
	}

	if (directionName === 'pull' || directionName === 'bidirectional') {
		if (pulledCount > 0) {
			parts.push(`${pulledCount} ${entityName}${pulledCount !== 1 ? 's' : ''} pulled`);
		}
	}

	if (conflictsCount > 0) {
		parts.push(`${conflictsCount} conflict${conflictsCount !== 1 ? 's' : ''} resolved`);
	}

	if (parts.length === 0) {
		return `No changes to sync for ${entityName}s`;
	}

	return `Successfully synced: ${parts.join(', ')}`;
}
