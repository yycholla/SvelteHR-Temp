/**
 * Client-side utilities for calling the consolidated Sync API
 */

import type {
	SyncRequest,
	SyncResponse,
	SyncErrorResponse,
	EntityType,
	SyncDirection,
	SyncMode,
	ConflictStrategy
} from '$lib/types/sync';

/**
 * Call the consolidated sync API
 */
export async function syncWithQuickBooks(
	request: SyncRequest,
	fetchFn: typeof fetch = fetch
): Promise<SyncResponse | SyncErrorResponse> {
	try {
		const response = await fetchFn('/api/sync', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(request)
		});

		const data = await response.json();

		if (!response.ok) {
			return data as SyncErrorResponse;
		}

		return data as SyncResponse;
	} catch (error) {
		return {
			error: error instanceof Error ? error.message : 'Failed to sync with QuickBooks'
		};
	}
}

/**
 * Push employees to QuickBooks
 */
export async function pushEmployees(
	mode: SyncMode = 'INCREMENTAL',
	fetchFn: typeof fetch = fetch
): Promise<SyncResponse | SyncErrorResponse> {
	return syncWithQuickBooks(
		{
			entity_type: 'EMPLOYEE',
			direction: 'PUSH',
			mode
		},
		fetchFn
	);
}

/**
 * Pull employees from QuickBooks
 */
export async function pullEmployees(
	mode: SyncMode = 'INCREMENTAL',
	fetchFn: typeof fetch = fetch
): Promise<SyncResponse | SyncErrorResponse> {
	return syncWithQuickBooks(
		{
			entity_type: 'EMPLOYEE',
			direction: 'PULL',
			mode
		},
		fetchFn
	);
}

/**
 * Push departments to QuickBooks
 */
export async function pushDepartments(
	mode: SyncMode = 'INCREMENTAL',
	fetchFn: typeof fetch = fetch
): Promise<SyncResponse | SyncErrorResponse> {
	return syncWithQuickBooks(
		{
			entity_type: 'DEPARTMENT',
			direction: 'PUSH',
			mode
		},
		fetchFn
	);
}

/**
 * Pull departments from QuickBooks
 */
export async function pullDepartments(
	mode: SyncMode = 'INCREMENTAL',
	fetchFn: typeof fetch = fetch
): Promise<SyncResponse | SyncErrorResponse> {
	return syncWithQuickBooks(
		{
			entity_type: 'DEPARTMENT',
			direction: 'PULL',
			mode
		},
		fetchFn
	);
}

/**
 * Bidirectional sync for employees
 */
export async function syncEmployeesBidirectional(
	mode: SyncMode = 'INCREMENTAL',
	conflictStrategy: ConflictStrategy = 'LAST_WRITE_WINS',
	fetchFn: typeof fetch = fetch
): Promise<SyncResponse | SyncErrorResponse> {
	return syncWithQuickBooks(
		{
			entity_type: 'EMPLOYEE',
			direction: 'BIDIRECTIONAL',
			mode,
			conflict_strategy: conflictStrategy
		},
		fetchFn
	);
}

/**
 * Bidirectional sync for departments
 */
export async function syncDepartmentsBidirectional(
	mode: SyncMode = 'INCREMENTAL',
	conflictStrategy: ConflictStrategy = 'LAST_WRITE_WINS',
	fetchFn: typeof fetch = fetch
): Promise<SyncResponse | SyncErrorResponse> {
	return syncWithQuickBooks(
		{
			entity_type: 'DEPARTMENT',
			direction: 'BIDIRECTIONAL',
			mode,
			conflict_strategy: conflictStrategy
		},
		fetchFn
	);
}

/**
 * Generic bidirectional sync
 */
export async function syncBidirectional(
	entityType: EntityType,
	mode: SyncMode = 'INCREMENTAL',
	conflictStrategy: ConflictStrategy = 'LAST_WRITE_WINS',
	fetchFn: typeof fetch = fetch
): Promise<SyncResponse | SyncErrorResponse> {
	return syncWithQuickBooks(
		{
			entity_type: entityType,
			direction: 'BIDIRECTIONAL',
			mode,
			conflict_strategy: conflictStrategy
		},
		fetchFn
	);
}

/**
 * Helper to check if sync was successful
 */
export function isSyncSuccessful(
	response: SyncResponse | SyncErrorResponse
): response is SyncResponse {
	return 'success' in response && response.success === true;
}

/**
 * Helper to get error message from response
 */
export function getSyncErrorMessage(response: SyncResponse | SyncErrorResponse): string {
	if ('error' in response) {
		return response.error;
	}
	if ('message' in response) {
		return response.message;
	}
	return 'Unknown error';
}
