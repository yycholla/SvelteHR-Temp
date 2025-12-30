import { gql } from '@urql/svelte';

export const PREVIEW_SYNC = gql`
	mutation PreviewSync($input: SyncPreviewInput!) {
		sync_preview {
			preview_sync(input: $input) {
				success
				message
				creates {
					changeType
					entityType
					localId
					quickbooksId
					displayName
					fieldChanges {
						fieldName
						currentValue
						newValue
						hasConflict
					}
					warnings
				}
				updates {
					changeType
					entityType
					localId
					quickbooksId
					displayName
					fieldChanges {
						fieldName
						currentValue
						newValue
						hasConflict
					}
					warnings
				}
				deletes {
					changeType
					entityType
					localId
					quickbooksId
					displayName
					warnings
				}
				totalChanges
				summary {
					totalCreates
					totalUpdates
					totalDeletes
					totalConflicts
					totalWarnings
					estimatedDurationSeconds
				}
			}
		}
	}
`;
