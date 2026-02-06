/**
 * Type definitions for the consolidated Sync API (sync_v2)
 */

export type EntityType = 'EMPLOYEE' | 'DEPARTMENT';

export type SyncDirection = 'PUSH' | 'PULL' | 'BIDIRECTIONAL';

export type SyncMode = 'FULL' | 'INCREMENTAL';

export type ConflictStrategy = 'LOCAL_WINS' | 'REMOTE_WINS' | 'LAST_WRITE_WINS' | 'MANUAL';

export type SyncStatus =
	| 'PENDING'
	| 'IN_PROGRESS'
	| 'COMPLETED'
	| 'COMPLETED_WITH_ERRORS'
	| 'FAILED';

/**
 * Request body for POST /api/sync
 */
export interface SyncRequest {
	/** Type of entity to sync */
	entity_type: EntityType;

	/** Direction of sync */
	direction: SyncDirection;

	/** Sync mode (default: INCREMENTAL) */
	mode?: SyncMode;

	/** Conflict resolution strategy (default: LAST_WRITE_WINS, only used for bidirectional sync) */
	conflict_strategy?: ConflictStrategy;
}

/**
 * Response from POST /api/sync
 */
export interface SyncResponse {
	/** Whether the sync operation succeeded overall */
	success: boolean;

	/** Type of entity that was synced */
	entity_type: EntityType;

	/** Direction of the sync */
	direction: SyncDirection;

	/** Sync mode that was used */
	mode: SyncMode;

	/** Final status of the sync operation */
	status: SyncStatus;

	/** When the sync started */
	started_at: string;

	/** When the sync completed */
	completed_at: string | null;

	/** Duration in milliseconds */
	duration_ms: number | null;

	/** Number of entities pushed to remote */
	pushed_count: number;

	/** Number of entities pulled from remote */
	pulled_count: number;

	/** Number of conflicts detected and resolved */
	conflicts_count: number;

	/** List of error messages */
	errors: string[];

	/** Human-readable message summarizing the sync */
	message: string;
}

/**
 * Error response from sync API
 */
export interface SyncErrorResponse {
	error: string;
	graphql_error?: string;
}

/**
 * Helper to check if a response is an error
 */
export function isSyncError(
	response: SyncResponse | SyncErrorResponse
): response is SyncErrorResponse {
	return 'error' in response;
}

/**
 * Helper to build sync request for employee push
 */
export function buildEmployeePushRequest(mode: SyncMode = 'INCREMENTAL'): SyncRequest {
	return {
		entity_type: 'EMPLOYEE',
		direction: 'PUSH',
		mode
	};
}

/**
 * Helper to build sync request for employee pull
 */
export function buildEmployeePullRequest(mode: SyncMode = 'INCREMENTAL'): SyncRequest {
	return {
		entity_type: 'EMPLOYEE',
		direction: 'PULL',
		mode
	};
}

/**
 * Helper to build sync request for bidirectional sync
 */
export function buildBidirectionalRequest(
	entityType: EntityType,
	mode: SyncMode = 'INCREMENTAL',
	conflictStrategy: ConflictStrategy = 'LAST_WRITE_WINS'
): SyncRequest {
	return {
		entity_type: entityType,
		direction: 'BIDIRECTIONAL',
		mode,
		conflict_strategy: conflictStrategy
	};
}
