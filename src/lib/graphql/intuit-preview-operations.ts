/**
 * QuickBooks Sync Preview GraphQL Operations
 *
 * Provides preview/dry-run functionality for sync operations.
 */

import { gql } from '@urql/svelte';

// ============================================================================
// Types
// ============================================================================

export type ChangeType = 'Added' | 'Modified' | 'Removed' | 'NoChange';

export type PreviewDirection = 'Pull' | 'Push' | 'Bidirectional';

export type PreviewEntityType = 'Employee' | 'Department';

export interface FieldChange {
	fieldName: string;
	localValue: string | null;
	remoteValue: string | null;
	willChangeTo: string;
	changeType: ChangeType;
}

export interface PreviewItem {
	entityType: string;
	entityId: string;
	entityName: string;
	localData: unknown | null;
	remoteData: unknown | null;
	fieldChanges: FieldChange[];
	changeReason: string;
}

export interface PreviewConflict {
	entityId: string;
	entityType: string;
	entityName: string;
	conflictType: string;
	description: string;
	suggestedResolution: string;
	localLastModified: string | null;
	remoteLastModified: string | null;
}

export interface PreviewSummary {
	totalCreates: number;
	totalUpdates: number;
	totalDeletes: number;
	totalConflicts: number;
	estimatedDurationSec: number;
	apiCallsRequired: number;
	safeToProceed: boolean;
}

export interface SyncPreview {
	creates: PreviewItem[];
	updates: PreviewItem[];
	deletes: PreviewItem[];
	conflicts: PreviewConflict[];
	summary: PreviewSummary;
	generatedAt: string;
}

// ============================================================================
// Queries
// ============================================================================

export const PREVIEW_SYNC_QUERY = gql`
	query PreviewSync($direction: PreviewDirectionInput!, $entityType: PreviewEntityTypeInput!) {
		intuitPreview {
			previewSync(direction: $direction, entityType: $entityType) {
				creates {
					entityType
					entityId
					entityName
					localData
					remoteData
					fieldChanges {
						fieldName
						localValue
						remoteValue
						willChangeTo
						changeType
					}
					changeReason
				}
				updates {
					entityType
					entityId
					entityName
					localData
					remoteData
					fieldChanges {
						fieldName
						localValue
						remoteValue
						willChangeTo
						changeType
					}
					changeReason
				}
				deletes {
					entityType
					entityId
					entityName
					localData
					remoteData
					fieldChanges {
						fieldName
						localValue
						remoteValue
						willChangeTo
						changeType
					}
					changeReason
				}
				conflicts {
					entityId
					entityType
					entityName
					conflictType
					description
					suggestedResolution
					localLastModified
					remoteLastModified
				}
				summary {
					totalCreates
					totalUpdates
					totalDeletes
					totalConflicts
					estimatedDurationSec
					apiCallsRequired
					safeToProceed
				}
				generatedAt
			}
		}
	}
`;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a preview of sync changes without executing
 */
export async function previewSync(
	client: unknown,
	direction: PreviewDirection,
	entityType: PreviewEntityType
): Promise<SyncPreview> {
	const result = await (
		client as {
			query: (
				query: unknown,
				variables: unknown
			) => Promise<{ data?: { intuitPreview?: { previewSync?: SyncPreview } }; error?: unknown }>;
		}
	).query(PREVIEW_SYNC_QUERY, {
		direction,
		entityType
	});

	if (result.error) {
		throw new Error(`Preview failed: ${result.error}`);
	}

	if (!result.data?.intuitPreview?.previewSync) {
		throw new Error('No preview data returned');
	}

	return result.data.intuitPreview.previewSync;
}

/**
 * Get summary statistics for a preview
 */
export function getPreviewStats(preview: SyncPreview) {
	return {
		totalChanges:
			preview.summary.totalCreates + preview.summary.totalUpdates + preview.summary.totalDeletes,
		hasConflicts: preview.summary.totalConflicts > 0,
		canProceed: preview.summary.safeToProceed,
		estimatedMinutes: Math.ceil(preview.summary.estimatedDurationSec / 60)
	};
}

/**
 * Group preview items by change type
 */
export function groupPreviewItemsByChange(items: PreviewItem[]) {
	return {
		added: items.filter((item) =>
			item.fieldChanges.some((change) => change.changeType === 'Added')
		),
		modified: items.filter((item) =>
			item.fieldChanges.some((change) => change.changeType === 'Modified')
		),
		removed: items.filter((item) =>
			item.fieldChanges.some((change) => change.changeType === 'Removed')
		)
	};
}
