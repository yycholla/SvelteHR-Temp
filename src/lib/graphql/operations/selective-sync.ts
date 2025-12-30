import { gql } from '@urql/svelte';

export const GET_AVAILABLE_ENTITIES = gql`
	query GetAvailableEntities {
		selective_sync {
			get_available_entities {
				employees {
					id
					name
					quickbooksId
					lastSyncedAt
					hasLocalChanges
				}
				departments {
					id
					name
					quickbooksId
					lastSyncedAt
					hasLocalChanges
				}
			}
		}
	}
`;

export const TRIGGER_SELECTIVE_SYNC = gql`
	mutation TriggerSelectiveSync($input: SelectiveSyncInput!) {
		selective_sync {
			trigger_selective_sync(input: $input) {
				success
				message
				jobId
				summary {
					totalEmployees
					totalDepartments
					syncDirection
					isFullSync
				}
			}
		}
	}
`;
